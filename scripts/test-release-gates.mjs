import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
const root = process.cwd(), exe = resolve(process.argv[2]);
const temp = await mkdtemp(join(tmpdir(), 'botpager-gates-'));
const results = [], sha = 'fixture-source', targets = ['darwin-arm64','darwin-x64','linux-x64','linux-arm64','linux-x64-musl','linux-arm64-musl','windows-x64'];
const version = JSON.parse(await readFile('package.json')).version;
const name = t => t === 'npm' ? `reostack-botpager-${version}.tgz` : `botpager-${version}-${t}.${t === 'windows-x64' ? 'zip' : 'tar.gz'}`;
async function check(label, fn) { await fn(); results.push({ name: label, passed: true }); }
try {
 await cp(join(root,'scripts'),join(temp,'scripts'),{recursive:true});
 await cp(join(root,'package.json'),join(temp,'package.json'));
 for (const d of ['artifacts','bin','draft']) await mkdir(join(temp,d));
 for (const t of [...targets,'npm']) { await writeFile(join(temp,'artifacts',name(t)),'rebuilt A'); await writeFile(join(temp,'draft',name(t)),'staged B'); }
 await writeFile(join(temp,'bin','gh'), `#!${process.execPath}\nimport fs from 'node:fs';import path from 'node:path';const a=process.argv.slice(2);if(a[0]==='api'){console.log(JSON.stringify(process.env.FIXTURE_PERMISSION==='write'?[{tag_name:'v${version}',target_commitish:'${sha}',assets:fs.readdirSync('draft').map(name=>({name}))}]:[]));}else if(a[0]==='release'&&a[1]==='download'){fs.copyFileSync(path.join('draft',a[a.indexOf('--pattern')+1]),path.join(a[a.indexOf('--dir')+1],a[a.indexOf('--pattern')+1]));}else process.exit(2);\n`,{mode:0o755});
 const env = {...process.env, PATH:join(temp,'bin')+':'+process.env.PATH,GITHUB_SHA:sha,GITHUB_REPOSITORY:'fixture/repo',FIXTURE_PERMISSION:'write'};
 const invoke = (file,args=[],extra={}) => spawnSync('bun',[`scripts/${file}`, ...args],{cwd:temp,env:{...env,...extra},encoding:'utf8'});
 await check('authorized draft preparation supplies B to read-only platform tests',async()=>{
  const prep=invoke('prepare-release-inputs.ts');assert.equal(prep.status,0,prep.stderr);
  for(const target of targets){
   let r=invoke('platform-artifacts.ts',['select',target,'--prepared'],{FIXTURE_PERMISSION:'read'});assert.equal(r.status,0,r.stderr);
   assert.equal(await readFile(join(temp,'artifacts',name(target)),'utf8'),'staged B');
   r=invoke('platform-artifacts.ts',['record',target]);assert.equal(r.status,0,r.stderr);
  }
  assert.equal(invoke('platform-artifacts.ts',['select','npm','--prepared']).status,0);
  assert.equal(invoke('platform-artifacts.ts',['verify']).status,0);
 });
 await check('post-test archive substitution is rejected',async()=>{
  await writeFile(join(temp,'artifacts',name(targets[0])),'substituted A');
  assert.notEqual(invoke('platform-artifacts.ts',['verify']).status,0);
  await writeFile(join(temp,'artifacts',name(targets[0])),'staged B');
 });
 await check('missing platform success report is rejected',async()=>{
  await rm(join(temp,'artifacts',`tested-${targets[0]}.json`));
  assert.notEqual(invoke('platform-artifacts.ts',['verify']).status,0);
 });
 await check('corrupted prepared archive is rejected',async()=>{
  await writeFile(join(temp,'prepared',name(targets[0])),'corrupted');
  assert.notEqual(invoke('platform-artifacts.ts',['select',targets[0],'--prepared']).status,0);
 });
 await check('missing prepared manifest is rejected',async()=>{
  await rm(join(temp,'prepared','manifest.json'));
  assert.notEqual(invoke('platform-artifacts.ts',['select',targets[0],'--prepared']).status,0);
 });
 // Exercise the complete E2E gate using the actual installed executable and HTTP.
 for(const corrupt of [false,true]) await check(corrupt?'destructive duplicate fails idempotency gate':'correct duplicate control passes',async()=>{
  const messages=[],deleted=[];let linked=false,revoked=false;
  const server=createServer(async(req,res)=>{
   let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw||'{}');let status=200,data={};
   if(req.url==='/healthz')data={ok:true,revision:'fixture'};
   else if(req.url==='/v1/pair/start')data={code:'ABCD-EFGH',sessionId:'fixture',qrPayload:'botpager://pair?code=ABCD-EFGH',expiresAt:new Date(Date.now()+60000).toISOString()};
   else if(req.url==='/v1/pair/claim'){linked=true;data={token:'fixture-token',deviceId:'fixture-device',cliName:'Fixture'};}
   else if(req.url==='/v1/pair/session/fixture')data=linked?{status:'linked',deviceId:'fixture-device',deviceName:'Fixture',token:'fixture-token'}:{status:'pending'};
   else if(revoked){status=401;data={error:{code:'UNAUTHORIZED',message:'Revoked'}};}
   else if(req.url==='/v1/send'){
    const old=messages.find(m=>m.id===body.messageId);
    if(old){if(corrupt)Object.assign(old,{title:body.title,body:body.body});data={ok:true,delivery:'duplicate',messageId:old.id};}
    else{messages.push({id:body.messageId,deviceId:'fixture-device',computerName:'Fixture',title:body.title||'Fixture',body:body.body,kind:body.kind,project:body.project||'',receivedAt:new Date().toISOString()});data={ok:true,delivery:'stored',messageId:body.messageId};}
   }else if(req.url==='/v1/messages'&&req.method==='GET')data={messages:messages.filter(m=>!deleted.includes(m.id)),deletedIds:deleted};
   else if(req.url==='/v1/messages'&&req.method==='DELETE'){deleted.push(...body.ids);data={ok:true};}
   else if(req.url==='/v1/device'&&req.method==='DELETE'){revoked=true;data={ok:true};}
   else{status=404;data={error:{code:'NOT_FOUND'}};}
   res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
   const report=join(temp,corrupt?'bad.json':'good.json');
   const child=spawn(process.execPath,[join(root,'scripts/e2e-api.mjs'),exe,`http://127.0.0.1:${server.address().port}`,report],{stdio:'ignore'});
   const timer=setTimeout(()=>child.kill('SIGKILL'),40000);
   const [code]=await once(child,'close');clearTimeout(timer);
   const r=JSON.parse(await readFile(report));
   assert.equal(code,corrupt?1:0);
   assert.equal(r.checks.find(c=>c.name==='server idempotency').passed,!corrupt);
  }finally{server.close();server.closeAllConnections();}
 });
} finally {
 await mkdir('artifacts',{recursive:true});
 await writeFile('artifacts/release-gate-regressions.json',JSON.stringify({checks:results,passed:results.length===7,scope:'Subprocess scripts with permission-aware gh and HTTP fixtures; actual installed CLI'},null,2)+'\n');
 await rm(temp,{recursive:true,force:true});
}
console.log('Release gate regression scenarios passed.');

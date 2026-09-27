// Failure scenarios are recorded in the companion API repo's client-compatibility-verification.md.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const temp=mkdtempSync(join(tmpdir(),'botpager-upgrade-check-'));
const server=createServer((req,res)=>{assert.equal(req.headers['x-botpager-protocol'],'2'); assert.equal(req.headers['x-botpager-version'],'0.3.0'); res.writeHead(426,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'UPGRADE_REQUIRED',message:'Upgrade required',protocolVersion:3,minimumClientVersions:{cli:'1.0.0'},upgradeCommand:'UNTRUSTED CODE'}}));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
function run(args,env={}){return new Promise(resolve=>{const p=spawn(process.execPath,['dist/index.js',...args],{env:{...process.env,BOTPAGER_CONFIG:join(temp,'config.json'),...env}});let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);p.on('close',code=>resolve({code,stdout,stderr}));});}
try {
 const original=JSON.stringify({apiUrl:`http://127.0.0.1:${server.address().port}`,defaultDevice:'test',devices:[{deviceId:'test',alias:'test',token:'test-token'}]});
 writeFileSync(join(temp,'config.json'),original);
 const result=await run(['send','--title','Test','--json']); assert.equal(result.code,78); assert.equal(result.stdout,'');
 const error=JSON.parse(result.stderr).error;assert.equal(error.code,'UPGRADE_REQUIRED');assert.equal(error.upgradeCommand,'botpager upgrade --json');assert.equal(error.retryOriginalCommand,false);
 const source=await run(['upgrade','--json']);assert.equal(source.code,1);assert.equal(JSON.parse(source.stderr).error.code,'COMMAND_FAILED');
 assert.equal(readFileSync(join(temp,'config.json'),'utf8'),original);
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/upgrade-contract.json',JSON.stringify({passed:true,checks:['compatibility headers','426 exit 78','JSON error on stderr','untrusted upgrade command ignored','source upgrade fails explicitly','config preserved']},null,2));console.log('Upgrade contract passed');
}finally{server.close();rmSync(temp,{recursive:true,force:true});}

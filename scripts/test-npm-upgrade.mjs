import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root=mkdtempSync(join(tmpdir(),'botpager-npm-upgrade-'));
try {
 const source=join(root,'source');mkdirSync(source);cpSync('src',join(source,'src'),{recursive:true});
 const pkg=JSON.parse(readFileSync('package.json','utf8'));pkg.version='0.0.0';writeFileSync(join(source,'package.json'),JSON.stringify(pkg));
 symlinkSync(resolve('node_modules'),join(source,'node_modules'),process.platform==='win32'?'junction':'dir');
 const prefix=join(root,'installation');const target=join(prefix,'node_modules','@reostack','botpager');mkdirSync(join(target,'dist'),{recursive:true});
 writeFileSync(join(prefix,'package.json'),'{"private":true}');writeFileSync(join(target,'package.json'),JSON.stringify({...pkg,scripts:{}}));
 const entry=join(target,'dist','index.js');
 execFileSync(process.env.BUN_BINARY || 'bun',['build','--target=node',join(source,'src/index.ts'),'--outfile',entry],{stdio:'pipe'});
 const config=join(root,'config.json');writeFileSync(config,'{"devices":[]}');const env={...process.env,BOTPAGER_CONFIG:config};
 const check=JSON.parse(execFileSync(process.execPath,[entry,'upgrade','--check','--json'],{env,encoding:'utf8'}));assert.equal(check.changed,false);
 const result=JSON.parse(execFileSync(process.execPath,[entry,'upgrade','--json'],{env,encoding:'utf8'}));assert.equal(result.changed,true);
 assert.equal(execFileSync(process.execPath,[entry,'--version'],{encoding:'utf8'}).trim(),result.version);assert.equal(readFileSync(config,'utf8'),'{"devices":[]}');
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/npm-upgrade.json',JSON.stringify({passed:true,...result,configPreserved:true},null,2));console.log(result);
}catch(error){mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/npm-upgrade.json',JSON.stringify({passed:false,error:'npm upgrade subprocess failed; inspect test output'},null,2));throw error;}finally{rmSync(root,{recursive:true,force:true});}

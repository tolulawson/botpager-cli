// Exercises the real published GitHub release in an isolated installation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root=mkdtempSync(join(tmpdir(),'botpager-upgrade-e2e-'));
try {
 cpSync('src',join(root,'src'),{recursive:true});
 const pkg=JSON.parse(readFileSync('package.json','utf8'));pkg.version='0.0.0';writeFileSync(join(root,'package.json'),JSON.stringify(pkg));
 symlinkSync(resolve('node_modules'),join(root,'node_modules'),process.platform==='win32'?'junction':'dir');
 const binary=join(root,process.platform==='win32'?'botpager.exe':'botpager');
 execFileSync(process.env.BUN_BINARY || 'bun',['build','--compile',join(root,'src/index.ts'),'--outfile',binary],{stdio:'pipe'});
 const config=join(root,'config.json');writeFileSync(config,'{"devices":[]}');
 const env={...process.env,BOTPAGER_CONFIG:config};
 const result=JSON.parse(execFileSync(binary,['upgrade','--json'],{env,encoding:'utf8'}));
 assert.equal(result.changed,true);assert.equal(execFileSync(binary,['--version'],{encoding:'utf8'}).trim(),result.version);
 assert.equal(readFileSync(config,'utf8'),'{"devices":[]}');
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/standalone-upgrade.json',JSON.stringify({passed:true,platform:process.platform,arch:process.arch,...result,configPreserved:true},null,2));
 console.log(result);
} finally { try {rmSync(root,{recursive:true,force:true});} catch {} }

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import pkg from '../../package.json';

const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function newer(a: string, b: string) {
  const x=a.split('.').map(Number), y=b.split('.').map(Number);
  for(let i=0;i<3;i++) if(x[i]!==y[i]) return x[i]!>y[i]!;
  return false;
}
async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`Download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
export async function upgradeCommand(check: boolean, json: boolean) {
  const executable = realpathSync(process.execPath);
  const standalone = /^botpager(?:\.exe)?$/.test(basename(executable));
  let prefix = '', global = false;
  // Windows .cmd shims cannot be executed directly without a shell. Invoke npm's JS entry instead.
  const npm = process.platform === 'win32' ? process.execPath : 'npm';
  const npmArgs = process.platform === 'win32' ? [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')] : [];
  if (!standalone) {
    const entry = realpathSync(process.argv[1]!);
    const root = dirname(dirname(entry));
    if (!root.endsWith(join('node_modules','@reostack','botpager'))) {
      throw Error('Source or unknown installation. Install a published BotPager package or standalone binary before upgrading.');
    }
    prefix = dirname(dirname(dirname(root)));
    const globalRoot = execFileSync(npm,[...npmArgs,'root','--global'],{encoding:'utf8'}).trim();
    global = realpathSync(dirname(dirname(root))) === resolve(globalRoot);
  }
  const metadata = JSON.parse((await download(standalone
    ? 'https://api.github.com/repos/tolulawson/botpager-cli/releases/latest'
    : 'https://registry.npmjs.org/@reostack%2fbotpager/latest')).toString());
  const version = standalone ? String(metadata.tag_name).replace(/^v/,'') : String(metadata.version);
  if (!stable.test(version)) throw Error('No valid stable release available');
  const available = newer(version,pkg.version);
  if (check || !available) {
    const result={currentVersion:pkg.version,latestVersion:version,upgradeAvailable:available,method:standalone?'standalone':'npm',changed:false};
    console.log(json?JSON.stringify(result):available?`BotPager ${version} available. Run botpager upgrade.`:'BotPager is up to date.');
    return;
  }
  if (!standalone) {
    execFileSync(npm,[...npmArgs,'install',...(global?['--global']:['--prefix',prefix]),`@reostack/botpager@${version}`,'--registry=https://registry.npmjs.org'],{stdio:json?'pipe':'inherit'});
    const installed=JSON.parse(readFileSync(join(global?execFileSync(npm,[...npmArgs,'root','--global'],{encoding:'utf8'}).trim():join(prefix,'node_modules'),'@reostack','botpager','package.json'),'utf8'));
    if(installed.version!==version) throw Error('Installed npm version does not match requested release');
  } else {
    let platform = `${process.platform}-${process.arch}`;
    if(process.platform==='linux' && !(process.report?.getReport() as {header?:{glibcVersionRuntime?:string}})?.header?.glibcVersionRuntime) platform+='-musl';
    if(!['darwin-arm64','darwin-x64','linux-x64','linux-arm64','linux-x64-musl','linux-arm64-musl','win32-x64'].includes(platform)) throw Error('Unsupported platform');
    platform=platform.replace('win32','windows');
    const asset=`botpager-${version}-${platform}.${process.platform==='win32'?'zip':'tar.gz'}`;
    const base=`https://github.com/tolulawson/botpager-cli/releases/download/v${version}`;
    const bytes=await download(`${base}/${asset}`);
    const sums=(await download(`${base}/SHA256SUMS`)).toString().split('\n').map(line=>line.trim().split(/\s+/)).filter(parts=>parts[1]===asset);
    if(sums.length!==1 || !/^[a-f0-9]{64}$/.test(sums[0]![0]!) || createHash('sha256').update(bytes).digest('hex')!==sums[0]![0]) throw Error('Checksum mismatch; existing installation preserved');
    const temp=mkdtempSync(join(dirname(executable),'.botpager-upgrade-'));
    const backup=join(dirname(executable),`.botpager-previous-${Date.now()}${process.platform==='win32'?'.exe':''}`);
    try {
      const archive=join(temp,'archive');writeFileSync(archive,bytes);
      const binary=process.platform==='win32'?'botpager.exe':'botpager';
      execFileSync('tar',['-xf',archive,'-C',temp,binary]);
      const candidate=join(temp,binary);chmodSync(candidate,0o755);
      if(execFileSync(candidate,['--version'],{encoding:'utf8'}).trim()!==version) throw Error('Downloaded executable version mismatch');
      renameSync(executable,backup);
      try { renameSync(candidate,executable); } catch(error) { renameSync(backup,executable);throw error; }
      try { rmSync(backup); } catch { /* Windows may retain the running executable until exit. */ }
    } finally { rmSync(temp,{recursive:true,force:true}); }
  }
  console.log(json?JSON.stringify({changed:true,previousVersion:pkg.version,version}):`Upgraded BotPager to ${version}. Retry your command when ready.`);
}

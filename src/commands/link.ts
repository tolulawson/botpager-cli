import { computerIdentity } from '../computer-identity';
import qrcode from 'qrcode-terminal';
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { ApiRequestError, api, apiResponse, type PairSession, type PairStart } from '../api';
import { defaultCliName } from '../cli-name';
import { apiUrl, configPath, loadConfig, saveConfig, upsertDevice, type Config } from '../config';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForClaim(config: Config, started: PairStart, longPoll: boolean): Promise<void> {
  const path = `/v1/pair/session/${started.sessionId}`;
  const init = { token: started.sessionSecret, signal: AbortSignal.timeout(30_000) };
  if (longPoll) {
    await api(config, `${path}/wait`, init);
    return;
  }
  const res = await apiResponse(config, `${path}/events`, init);
  if (!res.headers.get('content-type')?.includes('text/event-stream') || !res.body) throw Error('Stream unavailable');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) return;
      buffer += decoder.decode(value,{stream:true});
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0,boundary); buffer = buffer.slice(boundary+2);
        if (/^event: (claimed|expired)$/m.test(event)) return;
      }
      if (buffer.length > 65536) throw Error('Invalid pairing stream');
    }
  } finally { await reader.cancel().catch(() => {}); }
}

export async function linkCommand(name?: string, json = false): Promise<void> {
  const config = loadConfig();
  const origin = apiUrl(config);
  const pendingPath = `${configPath()}.pairing`;
  let started: PairStart | undefined;
  try {
    const pending = JSON.parse(readFileSync(pendingPath,'utf8'));
    if (pending.origin !== origin) throw Error('Unfinished pairing belongs to a different API. Use a separate BOTPAGER_CONFIG.');
    if (Date.parse(pending.started.expiresAt) + 125_000 > Date.now()) started = pending.started;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (!started) {
    started = await api<PairStart>(config,'/v1/pair/start',{method:'POST',body:JSON.stringify({computerId:computerIdentity(),cliName:name?.trim() || defaultCliName(),cliPlatform:process.platform})});
    mkdirSync(dirname(pendingPath),{recursive:true,mode:0o700});
    const temp = `${pendingPath}.${process.pid}.tmp`;
    writeFileSync(temp,JSON.stringify({origin,started}),{mode:0o600});
    renameSync(temp,pendingPath);
  }
  if (json) console.log(JSON.stringify({event:'pairing',code:started.code,qrPayload:started.qrPayload,expiresAt:started.expiresAt}));
  else {
    console.log(`\nScan this code in BotPager: ${started.code}\n`);
    qrcode.generate(started.qrPayload,{small:true});
    console.log('Waiting for your phone…');
  }
  const path = `/v1/pair/session/${started.sessionId}`;
  const deadline = Date.parse(started.expiresAt) + 125_000;
  let failures = 0;
  while (Date.now() < deadline) {
    let session: PairSession;
    try {
      session = await api<PairSession>(config,path,{token:started.sessionSecret,signal:AbortSignal.timeout(10_000)});
    } catch (error) {
      if (error instanceof ApiRequestError && error.status < 500) throw error;
      await sleep(Math.min(3000,500 * ++failures)); continue;
    }
    if (session.status === 'expired') { rmSync(pendingPath,{force:true}); throw Error('Code expired. Run botpager pair again.'); }
    if (session.status === 'linked' && session.deviceId && session.deviceName) {
      const existing = loadConfig();
      if (session.token) {
        saveConfig(upsertDevice({...existing,apiUrl:origin},{deviceId:session.deviceId,token:session.token,deviceName:session.deviceName,cliName:session.cliName ?? name ?? defaultCliName(),alias:session.deviceName,linkedAt:new Date().toISOString()}));
      } else if (!existing.devices.some(device => device.deviceId === session.deviceId)) {
        throw Error('Pairing credentials are unavailable. Unlink this computer in the app, then pair again.');
      }
      // Saving must succeed before acknowledging. Lost ACK responses remain recoverable.
      try {
        await api(config,`${path}/ack`,{method:'POST',token:started.sessionSecret,signal:AbortSignal.timeout(10_000)});
        rmSync(pendingPath,{force:true});
      } catch {
        if (!json) console.error('Connected and saved. Confirmation will be retried next time you run botpager pair.');
      }
      console.log(json ? JSON.stringify({event:'linked',deviceId:session.deviceId,deviceName:session.deviceName}) : `Connected to ${session.deviceName}.`);
      return;
    }
    try { await waitForClaim(config,started,failures >= 2); }
    catch(error) {
      if (error instanceof ApiRequestError && error.status < 500) throw error;
      failures++; await sleep(250);
    }
  }
  rmSync(pendingPath,{force:true});
  throw Error('Pairing timed out. Run botpager pair again.');
}

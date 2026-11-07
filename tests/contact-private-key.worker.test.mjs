import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
// Use exactly the local runtime shipped with the pinned Wrangler dev dependency.
const require = createRequire(import.meta.url);
const runtimeRequire = createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions} = runtimeRequire('miniflare');
const b64 = value => Buffer.from(value).toString('base64');
const pem = async key => '-----BEGIN PRIVATE KEY-----\n' + b64(await crypto.subtle.exportKey('pkcs8',key)) + '\n-----END PRIVATE KEY-----';

test('adapter compatibility in Wrangler local workerd (no external requests)', {timeout:60000}, async t => {
  const generate = () => crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
  const [pair,wrong] = await Promise.all([generate(),generate()]);
  const aes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw',aes,'AES-GCM',false,['encrypt']);
  const wrapped = await crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,aes);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM',iv},aesKey,new TextEncoder().encode('synthetic worker payload'));
  const secret = await pem(pair.privateKey), wrongSecret = await pem(wrong.privateKey);
  // No files, .env loading, Wrangler discovery, builds, or key serialization to disk.
  const bundle = await build({entryPoints:[fileURLToPath(new URL('./contact-private-key.worker.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
  const messages = [];
  class CaptureLog extends Log { logWithLevel(_level,message) { messages.push(String(message)); } }
  let outbound = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',
    host:'127.0.0.1',port:0,inspectorPort:0,log:new CaptureLog(LogLevel.DEBUG),
    outboundService:()=>{outbound++; throw new Error('External requests disabled');},
    bindings:{CONTACT_READABLE_PRIVATE_KEY:secret,WRONG_PRIVATE_KEY:wrongSecret,FIXTURE:JSON.stringify({aes:b64(aes),iv:b64(iv),wrapped:b64(wrapped),ct:b64(ct)})}}));
  t.after(()=>mf.dispose());
  await mf.ready;
  const samples = [];
  for (let i=0;i<5;i++) {
    const start = performance.now();
    const response = await mf.dispatchFetch('http://localhost/compatibility');
    const result = await response.json();
    samples.push(performance.now()-start);
    assert.equal(response.status,200,'Worker compatibility checks must pass');
    assert.equal(result.passed.length,9);
    assert.equal(result.runtime,'workerd'); assert.equal(result.cpuMs,null);
  }
  assert.equal(outbound,0);
  const logs = messages.join('\n');
  for (const sensitive of [secret,wrongSecret,'-----BEGIN PRIVATE KEY-----',b64(aes),'synthetic-secret-marker','synthetic worker payload']) {
    assert.equal(logs.includes(sensitive),false,'Runtime logs must not contain sensitive test data');
  }
  t.diagnostic('9 Worker checks passed per request; 5 requests; outbound requests: 0');
  t.diagnostic('Host-observed dispatch + checks + response wall-clock ms: '+samples.map(n=>n.toFixed(2)).join(', '));
  t.diagnostic('CPU time unavailable in this harness; Workers Free 10ms CPU compatibility remains unverified.');
});

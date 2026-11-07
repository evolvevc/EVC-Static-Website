import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {contactEmail} from '../server/contact-email.js';
import {load} from 'cheerio';
// Use exactly the local runtime shipped with the pinned Wrangler dev dependency.
const require = createRequire(import.meta.url);
const runtimeRequire = createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions} = runtimeRequire('miniflare');
const b64 = value => Buffer.from(value).toString('base64');
const pem = async key => '-----BEGIN PRIVATE KEY-----\n' + b64(await crypto.subtle.exportKey('pkcs8',key)) + '\n-----END PRIVATE KEY-----';

test('encrypted enquiry to branded renderer in local workerd (no external requests)', {timeout:60000}, async t => {
  const generate = () => crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
  const [pair,wrong] = await Promise.all([generate(),generate()]);
  const aes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.importKey('raw',aes,'AES-GCM',false,['encrypt']);
  const wrapped = await crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,aes);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM',iv},aesKey,new TextEncoder().encode('synthetic worker payload'));

  const fields={'full-name':'Synthetic <Visitor>','your-email':'test@example.test',company:'<img src=x onerror="bad()"> & company',role:'Founder',message:'<script>synthetic</script> & "quotes" and \'apostrophe\'\r\nsecond line',consent:'on','lead-source':'contact-page'};
  const makeEnvelope=async fields=>{
    const id=crypto.randomUUID();
    const payload={id,at:new Date().toISOString(),form:'contact',page:'/contact-us/',fields};
    const nonce=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},aesKey,new TextEncoder().encode(JSON.stringify(payload)));
    return {v:1,enc:'RSA-OAEP-256+A256GCM',kid:'worker-ephemeral',id,k:b64(wrapped),iv:b64(nonce),ct:b64(cipher)};
  };
  const envelope=await makeEnvelope(fields),invalidConsent=await makeEnvelope({...fields,consent:'off'});
  const secret = await pem(pair.privateKey), wrongSecret = await pem(wrong.privateKey);
  // No files, .env loading, Wrangler discovery, builds, or key serialization to disk.
  const bundle = await build({entryPoints:[fileURLToPath(new URL('./contact-email.worker.mjs',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser',external:['node:crypto'],loader:{'.png':'base64'},logLevel:'silent'});
  const messages = [];
  class CaptureLog extends Log { logWithLevel(_level,message) { messages.push(String(message)); } }
  let outbound = 0;
  const mf = new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',compatibilityFlags:['nodejs_compat'],
    host:'127.0.0.1',port:0,inspectorPort:0,log:new CaptureLog(LogLevel.DEBUG),
    outboundService:()=>{outbound++; throw new Error('External requests disabled');},
    bindings:{CONTACT_READABLE_PRIVATE_KEY:secret,WRONG_PRIVATE_KEY:wrongSecret,FIXTURE:JSON.stringify({envelope,invalidConsent})}}));
  t.after(()=>mf.dispose());
  await mf.ready;
  const samples = [];
  for (let i=0;i<5;i++) {
    const start = performance.now();
    const response = await mf.dispatchFetch('http://localhost/compatibility');
    const result = await response.json();
    samples.push(performance.now()-start);
    assert.equal(response.status,200,'Worker compatibility checks must pass');
    assert.equal(result.rejected,3);
    assert.deepEqual(result.mail,contactEmail(fields,envelope.id));
    const $=load(result.mail.html);
    assert.equal($('script,[onerror],a').length,0);
    assert.equal($('img').length,1); assert.equal($('img').attr('src'),'cid:evc-logo');
    assert.ok($.text().includes(fields.company));
    assert.ok(result.mail.html.includes('&lt;script&gt;synthetic&lt;/script&gt;'));
    assert.ok(result.mail.html.includes('<br>second line'));
    assert.equal(Buffer.from(result.mail.attachments[0].content,'base64').readUInt32BE(),0x89504e47);
    assert.equal(result.runtime,'workerd'); assert.equal(result.cpuMs,null);
  }
  assert.equal(outbound,0);
  const logs = messages.join('\n');
  for (const sensitive of [secret,wrongSecret,'-----BEGIN PRIVATE KEY-----',b64(aes),'synthetic-secret-marker','synthetic worker payload',fields['full-name'],fields.company,fields.message]) {
    assert.equal(logs.includes(sensitive),false,'Runtime logs must not contain sensitive test data');
  }
  t.diagnostic('Full decrypt/validate/render pipeline and 3 validation rejections per request; 5 requests; outbound requests: 0');
  t.diagnostic('Host-observed dispatch + checks + response wall-clock ms: '+samples.map(n=>n.toFixed(2)).join(', '));
  t.diagnostic('CPU time unavailable in this harness; Workers Free 10ms CPU compatibility remains unverified.');
});

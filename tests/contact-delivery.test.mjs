import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { load } from 'cheerio';
import { createServer } from 'node:http';
import { createPrivateKey } from 'node:crypto';
import { contactAttempt, init } from '../src/js/forms.js';
import { handle } from '../api/contact.js';
import { decrypt } from '../tools/contact/read-envelope.mjs';
import { publicKey, limit } from '../server/envelope.js';

const fields = {'full-name':'Sentinel Visitor','your-email':'sentinel@example.test',company:'Test',role:'Founder',message:'Private example',consent:'on','lead-source':'contact-page'};
const data = {form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields};
const origin = 'http://localhost:3000';
let encoded, pem, env, server, endpoint, captured, mailStatus, body;
const request = (payload, headers = {}) => new Request(origin+'/api/contact/', {method:'POST',headers:{origin,'Content-Type':'application/json',...headers},body:payload});
const transport = (url, options) => { assert.equal(url,'https://api.resend.com/emails'); return fetch(endpoint,options); };
before(async () => {
  const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
  const jwk = await crypto.subtle.exportKey('jwk',pair.publicKey);
  encoded = Buffer.from(JSON.stringify({...jwk,kid:'test'})).toString('base64');
  pem = createPrivateKey({key:Buffer.from(await crypto.subtle.exportKey('pkcs8',pair.privateKey)),format:'der',type:'pkcs8'}).export({type:'pkcs8',format:'pem'});
  env = {CONTACT_ORIGIN:origin, CONTACT_PUBLIC_JWK:encoded, CONTACT_FROM:'test@example.test', RESEND_API_KEY:'local-stub-only'};
  body = await contactAttempt(data,encoded);
  server = createServer(async (req,res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    captured = {email:JSON.parse(Buffer.concat(chunks)),id:req.headers['idempotency-key']};
    res.writeHead(mailStatus || 200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({id:'stub-receipt'}));
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  endpoint = 'http://127.0.0.1:'+server.address().port;
});
after(() => server.close());
test('configured template scopes its public key to Contact; the built site retains all eleven form types', () => {
  const rendering = spawnSync(process.execPath, ['--input-type=module','-e',
    "import {contact} from './tools/pages/misc.mjs'; import {page} from './tools/lib/site.mjs'; const p=contact(); console.log(page({...p}));"],
    {encoding:'utf8',env:{...process.env,CONTACT_PUBLIC_JWK:encoded}});
  assert.equal(rendering.status,0,rendering.stderr);
  const $ = load(rendering.stdout);
  assert.equal($('[data-contact-key]').length,1);
  assert.equal($('form[data-secure-form="contact"]').attr('data-contact-key'),encoded);
  assert.equal($('form[data-secure-form="contact"]').attr('method'),'dialog');
  assert.equal($('form[data-secure-form="newsletter"]').length,1);
  assert.equal($('meta[name="evolve:form-endpoint"]').attr('content'),'');
  assert.equal($('meta[name="evolve:pubkey"]').attr('content'),'');
  const labels = new Set();
  const files = ['raise-capital','contact-us','whitepapers','return-on-time-invested-roti-calculator',
    ...['dilution-calculator','convertible-note-calculator','fundraising-readiness-checklist','runway-calculator','fund-returns-calculator','founder-equity-split-calculator'].map(s=>'tools/'+s)];
  for (const slug of files) {
    const page = load(readFileSync(new URL('../dist/'+slug+'/index.html',import.meta.url),'utf8'));
    page('form').each((_,f)=>labels.add(page(f).attr('aria-label')));
  }
  assert.equal(labels.size,11);
});
test('round trip through a loopback Resend stub, fixed mail and stable retry',async () => {
  for (let n=0;n<2;n++) assert.equal((await handle(request(body),env,transport)).status,202);
  assert.deepEqual(captured.email.to,['contact@evolvevcap.com']);
  assert.deepEqual(Object.keys(captured.email).sort(),['attachments','from','subject','text','to']);
  assert.equal(captured.email.attachments.length,1);
  const attachment = Buffer.from(captured.email.attachments[0].content,'base64').toString();
  assert.equal(attachment,body);
  assert.equal(captured.id,'contact/'+JSON.parse(body).id);
  for (const value of [fields['full-name'],fields['your-email'],fields.message]) assert.ok(!JSON.stringify(captured).includes(value) && !attachment.includes(value));
  assert.deepEqual(await decrypt(JSON.parse(attachment),pem,encoded),fields);
});
test('relay rejects wrong origin, method, media, body size and malformed envelopes before send',async () => {
  let calls=0;
  for (const [req,status] of [
    [new Request(origin),405],[request(body,{origin:'https://other.test'}),403],[request(body,{'Content-Type':'text/plain'}),415],
    [request('x'.repeat(limit+1)),413],[request('{"enc":"none"}'),400],
    ...[{kid:'other'},{iv:'!'},{k:'AQ=='},{extra:'x'}].map(change => [request(JSON.stringify({...JSON.parse(body),...change})),400])
  ]) assert.equal((await handle(req,env,()=>{calls++;})).status,status);
  assert.equal(calls,0);
});
test('provider throttling, failure, timeout and missing acceptance ID never report success',async () => {
  try {
    for (const [upstream,status] of [[429,429],[500,502]]) {
      mailStatus=upstream; assert.equal((await handle(request(body),env,transport)).status,status);
    }
    assert.equal((await handle(request(body),env,()=>Promise.reject(new Error()))).status,503);
    assert.equal((await handle(request(body),env,()=>Response.json({}))).status,502);
  } finally { mailStatus = 200; }
});
test('reader rejects tampering, ID substitution and invalid consent',async () => {
  const item = JSON.parse(body);
  const bytes = Buffer.from(item.ct,'base64'); bytes[0] ^= 1;
  for (const changed of [{...item,ct:bytes.toString('base64')},{...item,id:crypto.randomUUID()},JSON.parse(await contactAttempt({...data,fields:{...fields,consent:'off'}},encoded))])
    await assert.rejects(decrypt(changed,pem,encoded));
});
test('configured encryption fails closed and rejects private components at build',async () => {
  await assert.rejects(contactAttempt(data,''));
  await assert.rejects(contactAttempt(data,'bad'));
  const jwk=JSON.parse(Buffer.from(encoded,'base64'));
  assert.throws(()=>publicKey(Buffer.from(JSON.stringify({...jwk,d:'private-component'})).toString('base64')));
});
test('Contact submit handler retains failed attempt, retries identical bytes, then opens empty fallback draft', async t => {
  const events={}, status={}, btn={textContent:'Send'}, sent=[];
  let resets=0;
  const form={dataset:{secureForm:'contact',contactKey:encoded,success:'Accepted'},querySelectorAll:()=>[],
    querySelector:s=>s==='.form__status'?status:s.startsWith('button')?btn:null,
    addEventListener:(k,f)=>{events[k]=f;},reset:()=>{resets++;}};
  status.setAttribute=()=>{};
  const doc={querySelectorAll:()=>[form],querySelector:()=>null};
  const saved = Object.getOwnPropertyDescriptors(globalThis);
  for (const [key,value] of Object.entries({document:doc,location:{pathname:'/contact-us/'},FormData:class {forEach(fn){Object.entries(fields).forEach(([k,v])=>fn(v,k));}},
    fetch:async (url,options)=>{assert.equal(url,'/api/contact/');sent.push(options.body);return Response.json({accepted:true},{status:sent.length===1?503:202});}})) {
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
    t.after(()=>{if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];});
  }
  let now=1000; t.mock.method(Date,'now',()=>now);
  init(); now+=3000;
  const submit=()=>events.submit({preventDefault(){}});
  await submit(); assert.equal(resets,0); assert.equal(btn.disabled,false);
  await submit(); assert.equal(resets,1); assert.equal(sent[0],sent[1]); assert.equal(status.textContent,'Accepted');
  form.dataset.contactKey=''; await submit(); assert.match(location.href,/^mailto:/); assert.ok(!location.href.includes('body=')); assert.equal(sent.length,2);
});

test('local account opt-in rejects hosted, misconfigured and non-loopback requests before Resend', async () => {
  const local = 'http://127.0.0.1:3000';
  const settings = {...env, CONTACT_LOCAL_ACCOUNT_TEST:'1', CONTACT_ORIGIN:local, CONTACT_FROM:'onboarding@resend.dev'};
  const req = (host='127.0.0.1:3000') => new Request(local+'/api/contact/',{method:'POST',
    headers:{origin:local,host,'content-type':'application/json'},body});
  let calls = 0;
  const deny = async (r,e) => assert.equal((await handle(r,e,()=>{calls++;})).status,403);
  for (const patch of [{VERCEL_ENV:'preview'},{VERCEL_ENV:'production'},{VERCEL_TARGET_ENV:'preview'},
    {VERCEL_DEPLOYMENT_ID:'hosted'},{AWS_LAMBDA_FUNCTION_NAME:'hosted'},{CONTACT_FROM:'other@example.test'},
    {CONTACT_LOCAL_ACCOUNT_TEST:'false'},{CONTACT_ORIGIN:'https://example.test'}]) await deny(req(),{...settings,...patch});
  await deny(req('example.test'),settings);
  if (process.platform === 'win32') {
    assert.equal((await handle(req(),settings,transport)).status,202);
    assert.deepEqual(captured.email.to,['evolvevc.2024@gmail.com']);
    assert.equal(captured.email.from,'onboarding@resend.dev');
    assert.equal(Buffer.from(captured.email.attachments[0].content,'base64').toString(),body);
  } else await deny(req(),settings);
  assert.equal(calls,0);
});
test('readable simulation authenticates, escapes, validates, retries and rolls back',async t => {
  const {fakeContactKms} = await import('./fake-contact-kms.mjs');
  const kms = await fakeContactKms();
  const settings = {...env,CONTACT_DELIVERY_MODE:'readable-local',CONTACT_READABLE_PUBLIC_JWK:kms.encoded};
  const malicious = '<img src=x onerror="fake()"> & <script>example</script>';
  const input = {...data,fields:{...fields,company:'',message:malicious+'\r\nsecond line'}};
  const sealed = await contactAttempt(input,kms.encoded);
  assert.ok(!sealed.includes(malicious));
  const run = (s=sealed,e=settings,k=kms) => handle(request(s),e,transport,k);

  await t.test('fixed headers, CID logo, HTML and plain-text alternatives', async () => {
    assert.equal((await run()).status,202);
    const {email} = captured;
    assert.deepEqual(email.to,['contact@evolvevcap.com']);
    assert.equal(email.from,env.CONTACT_FROM);
    assert.equal(email.subject,'New client enquiry | Evolve Venture Capital');
    assert.deepEqual(Object.keys(email).sort(),['attachments','from','html','subject','text','to']);
    const $ = load(email.html);
    assert.equal($('script,[onerror],a').length,0);
    assert.equal($('img').length,1);
    assert.equal($('img').attr('src'),'cid:'+email.attachments[0].content_id);
    assert.equal(email.attachments.length,1);
    assert.equal(Buffer.from(email.attachments[0].content,'base64').readUInt32BE(),0x89504e47);
    assert.match($('body').text(),/Not provided/);
    assert.ok($('body').text().includes(malicious));
    assert.ok(email.text.includes(malicious+'\nsecond line'));
    assert.ok(!email.html.includes(malicious));
    const previous = structuredClone(captured);
    assert.equal((await run()).status,202);
    assert.deepEqual(captured,previous);
  });
  await t.test('invalid schema, tampering and KMS failure cannot send mail',async () => {
    const previous = captured;
    for (const fieldsPatch of [{role:'Admin'},{consent:'off'},{'full-name':'X\r\nBcc: someone'},{message:'x'.repeat(3001)},{extra:'anything'}]) {
      const invalid = await contactAttempt({...data,fields:{...fields,...fieldsPatch}},kms.encoded);
      assert.equal((await run(invalid)).status,400);
    }
    const item = JSON.parse(sealed);
    for (const patch of [{id:crypto.randomUUID()},{ct:Buffer.alloc(32).toString('base64')},{kid:'untrusted'}]) {
      assert.equal((await run(JSON.stringify({...item,...patch}))).status,400);
    }
    assert.equal((await run(sealed,settings,{unwrap(){throw Object.assign(new Error(),{code:'KMS_UNAVAILABLE'});}})).status,503);
    assert.equal((await handle(request(sealed),settings,transport)).status,503);
    assert.equal((await handle(request(sealed),settings,fetch,kms)).status,503);
    assert.equal(captured,previous);
  });
  await t.test('cached old page stays encrypted; rollback rejects readable key',async () => {
    assert.equal((await run(body)).status,202);
    assert.equal(captured.email.html,undefined);
    assert.equal(captured.email.attachments[0].filename,'contact.json');
    assert.equal((await run(sealed,env)).status,400);
    for (const patch of [{VERCEL_ENV:'production'},{VERCEL_ENV:'preview'},{CONTACT_READABLE_PUBLIC_JWK:encoded},{CONTACT_DELIVERY_MODE:'unknown'}]) {
      assert.equal((await run(sealed,{...settings,...patch})).status,503);
    }
  });
  await t.test('local template publishes separate public key and simulated processor notice',async () => {
    const render = spawnSync(process.execPath,['--input-type=module','-e',
      "import {contact,privacy} from './tools/pages/misc.mjs'; console.log(contact().body+privacy().body);"],
      {encoding:'utf8',env:{...process.env,...settings}});
    assert.equal(render.status,0,render.stderr);
    const $=load(render.stdout);
    assert.equal($('form[data-secure-form=contact]').attr('data-contact-key'),kms.encoded);
    assert.ok($.text().includes('mailbox providers'));
    assert.ok(!$.text().includes('Only Evolve holds the decryption key'));
  });
});
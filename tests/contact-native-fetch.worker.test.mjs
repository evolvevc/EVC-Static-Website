import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('native workerd fetch: success, failures and every 3xx stay single-attempt and offline',{timeout:60000},async t=>{
 const bundle=await build({stdin:{contents:`
 import {contactTurnstile} from './server/contact-turnstile.js';
 import {contactResend} from './server/contact-resend.js';
 import {request} from './tests/contact-resend-cases.mjs';
 export default {async fetch(req){
  const kind=new URL(req.url).pathname.slice(1);
  // Default global fetch is intentional: exercise native Request/fetch handling.
  if(kind==='turnstile')return Response.json(await contactTurnstile({CONTACT_TURNSTILE_SECRET:'synthetic-secret',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us'}).verify('synthetic-token'));
  return contactResend({CONTACT_FROM:'EVC <sender@example.test>',RESEND_API_KEY:'synthetic-secret'})('https://api.resend.com/emails',request());
 }};`,resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'esm',logLevel:'silent'});
 let status=200,kind='turnstile',calls=[];
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',host:'127.0.0.1',port:0,inspectorPort:0,log:new Log(LogLevel.ERROR),outboundService:async req=>{
  calls.push({url:req.url,method:req.method});
  // Intercept EVERY outbound destination, including any accidental redirect.
  const payload=kind==='turnstile'?{success:true,hostname:'contact.example.test',action:'contact_us'}:{id:'00000000-0000-4000-8000-000000000001'};
  return new Response(status===304?null:JSON.stringify(payload),{status,headers:{'Content-Type':'application/json',Location:'https://redirect.invalid/must-not-follow'}});
 }}));
 t.after(()=>mf.dispose());await mf.ready;
 let checked=0;
 for(kind of ['turnstile','resend'])for(status of [200,400,403,409,429,500,...Array.from({length:100},(_,i)=>300+i)]){
  calls=[];
  const response=await mf.dispatchFetch('http://localhost/'+kind);
  const body=await response.json();
  if(kind==='turnstile')assert.equal(body,status===200,`Turnstile ${status}`);
  else {
   assert.equal(response.status,status===200?200:[400,403,409,429].includes(status)?status:503,`Resend ${status}`);
   assert.deepEqual(body,status===200?{id:'00000000-0000-4000-8000-000000000001'}:{error:status===409?'uncertain':[400,403,429].includes(status)?'rejected':'unavailable'});
  }
  assert.deepEqual(calls,[{url:kind==='turnstile'?'https://challenges.cloudflare.com/turnstile/v0/siteverify':'https://api.resend.com/emails',method:'POST'}]);
  checked++;
 }
 t.diagnostic(`${checked} native-fetch checks; all outbound requests intercepted locally, no external network or email.`);
});

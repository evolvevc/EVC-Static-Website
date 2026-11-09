import {test} from 'node:test';
import {cases} from './contact-resend-cases.mjs';
for(const [name,run] of cases)test(name,run);

import assert from 'node:assert/strict';
import {contactReadable} from '../server/contact-readable.js';
import {contactResend} from '../server/contact-resend.js';
test('unchanged orchestration contract: grant, acceptance, rejection and uncertainty',async()=>{
 const generate=()=>crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const [pair,old]=await Promise.all([generate(),generate()]);
 const b64=b=>Buffer.from(b).toString('base64');
 const pub=async(p,kid)=>b64(JSON.stringify({...await crypto.subtle.exportKey('jwk',p.publicKey),kid}));
 const env={CONTACT_TO:'evolvevc.2024@gmail.com',CONTACT_DELIVERY_MODE:'readable-orchestrated',CONTACT_ORIGIN:'https://contact.example.test',CONTACT_FROM:'sender@example.test',RESEND_API_KEY:'synthetic-binding-secret',CONTACT_VISITOR_HASH_SECRET:'synthetic-visitor-hash-secret-32-characters',CONTACT_PUBLIC_JWK:await pub(old,'old'),CONTACT_READABLE_PUBLIC_JWK:await pub(pair,'new'),CONTACT_READABLE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+b64(await crypto.subtle.exportKey('pkcs8',pair.privateKey))+'\n-----END PRIVATE KEY-----'};
 const submission=crypto.randomUUID(),iv=crypto.getRandomValues(new Uint8Array(12)),aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
 const payload={id:submission,at:new Date().toISOString(),form:'contact',page:'/contact-us/',fields:{'full-name':'Synthetic Visitor','your-email':'test@example.test',company:'Test',role:'Founder',message:'Test only',consent:'on','lead-source':'contact-page'}};
 const envelope={id:submission,v:1,kid:'new',enc:'RSA-OAEP-256+A256GCM',iv:b64(iv),k:b64(await crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,await crypto.subtle.exportKey('raw',aes))),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(payload))))};
 for(const [providerStatus,grant,expected,state] of [[200,true,202,'confirmed'],[401,true,502,'rejected'],[429,true,502,'rejected'],[409,true,503,'uncertain'],[500,true,503,'uncertain'],[200,false,409,undefined]]){
  const events=[];let calls=0,settled;
  const budget={reserve:async()=>{events.push('reserve');return {ok:true,send:false,state:'reserved',duplicate:false};},claim:async()=>{events.push('claim');return {ok:true,send:grant,state:'uncertain'};},settle:async(_id,outcome)=>{events.push('settle');settled=outcome;return {ok:true,state:outcome};}};
  const transport=contactResend(env,{fetch:async(_url,options)=>{events.push('provider');calls++;assert.equal(options.headers['Idempotency-Key'],'contact/'+submission);return Response.json(providerStatus===200?{id:'00000000-0000-4000-8000-000000000001'}:{message:'raw-provider-marker'},{status:providerStatus});}});
  const run=contactReadable(env,{turnstile:{verify:async()=>true},budget,transport,logoContent:b64(Buffer.from('\x89PNG\r\n\x1a\nsynthetic','binary'))});
  const response=await run(new Request(env.CONTACT_ORIGIN+'/api/contact/',{method:'POST',headers:{origin:env.CONTACT_ORIGIN,'content-type':'application/json'},body:JSON.stringify({envelope,turnstileToken:'synthetic-token'})}),{canonicalVisitor:'192.0.2.1'});
  assert.equal(response.status,expected);assert.equal(response.accepted,expected===202);assert.equal(settled,state);assert.equal(calls,grant?1:0);
  assert.deepEqual(events,grant?['reserve','claim','provider','settle']:['reserve','claim']);
 }
});

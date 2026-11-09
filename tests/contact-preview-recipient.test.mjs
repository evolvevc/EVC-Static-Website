import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../api/contact.js';
import {contactAttempt} from '../src/js/forms.js';

test('Preview Gmail opt-in is server-only, attachment-only and production-safe',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const encoded=Buffer.from(JSON.stringify({...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'synthetic'})).toString('base64');
 const origin='https://synthetic-preview.vercel.app';
 const env={CONTACT_ORIGIN:origin,CONTACT_PUBLIC_JWK:encoded,CONTACT_FROM:'sender@example.test',RESEND_API_KEY:'synthetic-only',CONTACT_PREVIEW_GMAIL_TEST:'1',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'preview',VERCEL_DEPLOYMENT_ID:'dpl_synthetic',VERCEL_URL:'synthetic-preview.vercel.app'};
 const body=await contactAttempt({form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields:{'full-name':'Synthetic',message:'Synthetic only',consent:'on'}},encoded);
 let calls=0,mail;
 const send=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');mail=JSON.parse(options.body);return Response.json({id:'synthetic-receipt'});};
 const req=(payload=body,headers={},url=origin+'/api/contact/')=>new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:payload});
 assert.equal((await handle(req(),env,send)).status,202);
 assert.deepEqual(mail.to,['evolvevc.2024@gmail.com']);
 assert.equal(Buffer.from(mail.attachments[0].content,'base64').toString(),body);
 for(const patch of [{CONTACT_PREVIEW_GMAIL_TEST:undefined},{VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production'},{VERCEL_ENV:'preview',VERCEL_TARGET_ENV:'production'}]){
  assert.equal((await handle(req(),{...env,...patch},send)).status,202);assert.deepEqual(mail.to,['evolvevc.2024@gmail.com']);
 }
 for(const patch of [{CONTACT_PREVIEW_GMAIL_TEST:'true'},{VERCEL:undefined},{VERCEL_ENV:undefined},{VERCEL_ENV:'development'},{VERCEL_DEPLOYMENT_ID:undefined},{VERCEL_DEPLOYMENT_ID:''},{VERCEL_TARGET_ENV:'custom'},{VERCEL_URL:'other.vercel.app'},{CONTACT_LOCAL_ACCOUNT_TEST:'1'},{CONTACT_DELIVERY_MODE:'readable-orchestrated'}]){
  const before=calls;assert.equal((await handle(req(),{...env,...patch},send)).status,403);assert.equal(calls,before);
 }
 const before=calls;
 assert.equal((await handle(req(body,{Origin:'https://other.test'}),env,send)).status,403);
 assert.equal((await handle(req(body,{},'https://other.vercel.app/api/contact/'),env,send)).status,403);
 assert.equal((await handle(req(JSON.stringify({...JSON.parse(body),to:'attacker@example.test'})),env,send)).status,400);
 assert.equal(calls,before);
 assert.equal((await handle(req(body,{'x-contact-recipient':'attacker@example.test','x-vercel-env':'preview'}),{...env,CONTACT_PREVIEW_GMAIL_TEST:undefined},send)).status,202);
 assert.deepEqual(mail.to,['evolvevc.2024@gmail.com']);
 // Testing sender works only behind existing explicit Preview restrictions.
 assert.equal((await handle(req(),{...env,CONTACT_FROM:'onboarding@resend.dev'},send)).status,202);
 for(const sender of ['onboarding@resend.dev','EVC <onboarding@resend.dev>',' ONBOARDING@RESEND.DEV ']){
  for(const patch of [{CONTACT_PREVIEW_GMAIL_TEST:undefined},{VERCEL_ENV:'production',VERCEL_TARGET_ENV:'production'}]){
   const count=calls;
   assert.equal((await handle(req(),{...env,...patch,CONTACT_FROM:sender},send)).status,403);
   assert.equal(calls,count);
  }
 }
 for(const key of ['RESEND_API_KEY','CONTACT_FROM','CONTACT_ORIGIN','CONTACT_PUBLIC_JWK']){
  const count=calls;assert.equal((await handle(req(),{...env,[key]:undefined},send)).status,503);assert.equal(calls,count);
 }
 assert.equal((await handle(req(),env,async()=>Response.json({},{status:429}))).status,429);
 assert.equal((await handle(req(),env,async()=>{throw Error('synthetic');})).status,503);
});

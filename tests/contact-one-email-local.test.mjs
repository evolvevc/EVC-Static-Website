import {test} from 'node:test';
import assert from 'node:assert/strict';
import {oneEmailGate,approval} from '../tools/contact/one-email-local.mjs';
import {startContactBrowser} from '../tools/contact/browser-local.mjs';
import {contactAttempt} from '../src/js/forms.js';
import {load} from 'cheerio';
const req=()=>new Request('https://api.resend.com/emails',{method:'POST',headers:{'Idempotency-Key':'contact/00000000-0000-4000-8000-000000000001'},body:JSON.stringify({from:'onboarding@resend.dev',to:['contact@evolvevcap.com']})});
test('terminal grant is required, expires, and permits only one concurrent attempt',async()=>{
 let calls=0,now=0;const gate=oneEmailGate({credential:'synthetic-credential',now:()=>now,send:async()=>{calls++;return Response.json({id:'00000000-0000-4000-8000-000000000001'});}});
 assert.equal((await gate.deliver(req())).status,503);assert.equal(gate.arm('wrong'),false);assert.equal(calls,0);assert.equal(gate.arm(approval),true);
 await Promise.all([gate.deliver(req()),gate.deliver(req())]);assert.equal(calls,1);assert.equal(gate.arm(approval),false);
 const expired=oneEmailGate({credential:'synthetic',now:()=>now,send:()=>assert.fail('expired grant sent')});expired.arm(approval);now=300001;assert.equal((await expired.deliver(req())).status,503);
});
test('unknown provider outcome is spent and never retried; error is sanitized',async()=>{
 let calls=0;const gate=oneEmailGate({credential:'synthetic-private-marker',send:async()=>{calls++;throw Error('sensitive-raw-provider-marker');}});gate.arm(approval);
 const result=await gate.deliver(req());assert.equal(result.status,503);assert.equal(await result.text(),'{"accepted":false}');await gate.deliver(req());assert.equal(calls,1);
});
test('loopback encrypted form through workerd to authorized mocked provider only',{timeout:30000},async()=>{
 let calls=0;const gate=oneEmailGate({credential:'synthetic-private-marker',send:async(url,options)=>{
  calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer synthetic-private-marker');
  const mail=JSON.parse(options.body);assert.deepEqual(mail.to,['evolvevc.2024@gmail.com']);assert.equal(mail.from,'onboarding@resend.dev');assert.match(mail.html,/Synthetic/);assert.ok(!mail.html.includes('<script>visitor</script>'));assert.ok(mail.html.includes('&lt;script&gt;'));assert.equal(mail.attachments[0].content_id,'evc-logo');
  return Response.json({id:'00000000-0000-4000-8000-000000000001'});
 }});let bridgeCalls=0,bridgeTarget=false;const app=await startContactBrowser({port:0,localDelivery:r=>{bridgeCalls++;bridgeTarget=r.url==='https://api.resend.com/emails';return gate.deliver(r);}});
 try {
  const html=await (await fetch(app.origin+'/contact-us/')).text();assert.ok(!html.includes('synthetic-private-marker'));assert.ok(!html.includes('BEGIN PRIVATE KEY'));
  const form=load(html)('form[data-secure-form=contact]');assert.equal(form.attr('data-contact-endpoint'),undefined);
  const envelope=JSON.parse(await contactAttempt({form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields:{'full-name':'Synthetic Visitor','your-email':'visitor@example.test',company:'Test',role:'Founder',message:'<script>visitor</script>',consent:'on','lead-source':'contact-page'}},form.attr('data-contact-key')));
  const submit=token=>fetch(app.origin+'/api/contact/',{method:'POST',headers:{origin:app.origin,'content-type':'application/json'},body:JSON.stringify({envelope,turnstileToken:token})});
  assert.equal((await submit('invalid')).status,403);assert.equal(calls,0);assert.equal(gate.arm(approval),true);
  const response=await submit('local-synthetic-'+crypto.randomUUID());assert.equal(response.status,202,JSON.stringify({calls,bridgeCalls,bridgeTarget}));assert.deepEqual(await response.json(),{accepted:true});assert.equal(calls,1);
  assert.equal((await submit('local-synthetic-'+crypto.randomUUID())).status,409);assert.equal(calls,1);
 }finally{await app.close();}
});

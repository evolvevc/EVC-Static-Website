import {test} from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {startContactBrowser} from '../tools/contact/browser-local.mjs';
import {contactAttempt} from '../src/js/forms.js';
const fields={'full-name':'Synthetic Visitor','your-email':'test@example.test',company:'Test',role:'Founder',message:'Test only',consent:'on','lead-source':'contact-page'};
for(const [mode,scenario,expected]of [['readable','success',202],['readable','rejection',502],['readable','timeout',503],['readable','turnstile',403],['attachment','success',202]])test('localhost '+mode+' '+scenario,{timeout:30000},async()=>{
 const app=await startContactBrowser({port:0,mode,scenario});try{
  const response=await fetch(app.origin+'/contact-us/');const html=await response.text();const $=load(html);const form=$('form[data-secure-form=contact]');
  assert.equal(response.status,200);assert.ok(!response.headers.get('content-security-policy').includes('https:'));assert.ok(!html.includes('BEGIN PRIVATE KEY'));assert.ok(!html.includes('synthetic-only'));
  const envelope=JSON.parse(await contactAttempt({form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields},form.attr('data-contact-key')));
  const send=()=>fetch(app.origin+'/api/contact/',{method:'POST',headers:{origin:app.origin,'content-type':'application/json'},body:JSON.stringify(mode==='attachment'?envelope:{envelope,turnstileToken:'local-synthetic-'+crypto.randomUUID()})});
  assert.equal((await send()).status,expected);if(mode==='readable'&&scenario==='success')assert.equal((await send()).status,409);
  assert.equal(form.attr('data-contact-mode'),mode==='readable'?'readable-orchestrated':undefined);
 }finally{await app.close();}
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {init,contactAttempt} from '../src/js/forms.js';
import {fakeContactKms} from './fake-contact-kms.mjs';
import {decryptContact} from '../server/contact-payload.js';
import {spawnSync} from 'node:child_process';
import {load} from 'cheerio';
import {readFileSync} from 'node:fs';
const fields={'full-name':'Synthetic Visitor','your-email':'test@example.test',company:'Test',role:'Founder',message:'Test',consent:'on','lead-source':'contact-page'};
test('readable form validates, pins key, refreshes tokens and preserves retry ID',async t=>{
 const kms=await fakeContactKms(),kid=JSON.parse(Buffer.from(kms.encoded,'base64')).kid;
 const events={},sent=[],status={setAttribute(){}},btn={textContent:'Send'};let resets=0,tokenCounter=0,options,failWidget=false,missing=false;
 const input={required:true,value:'',type:'text',setAttribute(){},focus(){}};
 const field={querySelector:s=>s==='.err'?{}:input};
 const form={dataset:{secureForm:'contact',contactMode:'readable-orchestrated',contactKey:kms.encoded,contactKid:kid,turnstileSitekey:'public-sitekey'},querySelectorAll:()=>missing?[field]:[],querySelector:s=>s==='.form__status'?status:s.startsWith('button')?btn:s==='[data-contact-turnstile]'?{}:s==='[aria-invalid="true"]'?input:null,addEventListener:(k,f)=>events[k]=f,reset(){resets++;}};
 const saved=Object.getOwnPropertyDescriptors(globalThis);
 let providerStatus=403;
 const globals={document:{querySelectorAll:()=>[form],querySelector:()=>null},location:{pathname:'/contact-us/'},FormData:class{forEach(fn){Object.entries({...fields,'cf-turnstile-response':'must-not-encrypt'}).forEach(([k,v])=>fn(v,k));}},turnstile:{render(_c,o){options=o;return 1;},execute(){queueMicrotask(()=>failWidget?options['error-callback']():options.callback('token-'+(++tokenCounter)));},remove(){}},fetch:async(url,o)=>{assert.equal(url,'/api/contact/');assert.equal(o.mode,'same-origin');sent.push(JSON.parse(o.body));return Response.json({accepted:providerStatus===202},{status:providerStatus});}};
 for(const [k,v]of Object.entries(globals)){Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});t.after(()=>saved[k]?Object.defineProperty(globalThis,k,saved[k]):delete globalThis[k]);}
 let now=1000;t.mock.method(Date,'now',()=>now);init();now+=3000;const submit=()=>events.submit({preventDefault(){}});
 missing=true;await submit();assert.equal(sent.length,0);missing=false;
 form.dataset.contactKid='wrong';await submit();assert.equal(sent.length,0);form.dataset.contactKid=kid;
 failWidget=true;await submit();assert.equal(sent.length,0);failWidget=false;
 await submit();assert.equal(sent.length,1);providerStatus=202;await submit();assert.equal(sent.length,2);assert.deepEqual(sent[0].envelope,sent[1].envelope);assert.notEqual(sent[0].turnstileToken,sent[1].turnstileToken);
 assert.deepEqual(Object.keys(sent[0]).sort(),['envelope','turnstileToken']);assert.equal(options['response-field'],false);assert.equal(options.action,'contact_us');
 assert.deepEqual(await decryptContact(sent[0].envelope,{kid,bytes:256},kms),fields);assert.equal(resets,1);
 for(const statusCode of [409,502,503]){events.input();providerStatus=statusCode;await submit();const n=sent.length;await submit();assert.equal(sent.length,n);assert.match(status.textContent,/may already|confirm acceptance/);}
});
test('readable public page configuration and CSP stay separate from attachment',async()=>{
 const a=await fakeContactKms(),b=await fakeContactKms();const kid=JSON.parse(Buffer.from(b.encoded,'base64')).kid;
 const render=mode=>spawnSync(process.execPath,['--input-type=module','-e',"import {contact} from './tools/pages/misc.mjs';import {CSP} from './tools/server-files.mjs';console.log(JSON.stringify({html:contact().body,csp:CSP}));"],{encoding:'utf8',env:{CONTACT_PUBLIC_JWK:a.encoded,CONTACT_READABLE_PUBLIC_JWK:b.encoded,CONTACT_READABLE_KID:kid,CONTACT_TURNSTILE_SITEKEY:'public-sitekey',CONTACT_DELIVERY_MODE:mode}});
 const readable=render('readable-orchestrated');assert.equal(readable.status,0);const page=JSON.parse(readable.stdout),$=load(page.html);const form=$('form[data-secure-form=contact]');assert.equal(form.attr('data-contact-key'),b.encoded);assert.equal(form.attr('data-contact-kid'),kid);assert.equal(form.find('[data-contact-turnstile]').length,1);assert.match(page.csp,/frame-src https:\/\/challenges.cloudflare.com/);
 const old=render('attachment');assert.equal(old.status,0);const legacy=JSON.parse(old.stdout);assert.equal(load(legacy.html)('form').attr('data-contact-key'),a.encoded);assert.ok(!legacy.csp.includes('challenges.cloudflare.com'));
 for(const text of [page.html,...['forms.js','contact-turnstile.js'].map(f=>readFileSync(new URL('../src/js/'+f,import.meta.url),'utf8'))])assert.doesNotMatch(text,/RESEND_API_KEY|PRIVATE_KEY|TURNSTILE_SECRET|local-synthetic/);
});

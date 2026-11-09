import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {handle} from '../api/contact.js';
import {contactAttempt} from '../src/js/forms.js';
import {demoEndpoint,digest} from '../server/contact-demo.js';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('production demo uses actual workerd SQLite one-use grant; no external network',{timeout:60000},async t=>{
 const operator='a'.repeat(43),bridge='b'.repeat(43),hash=await digest(operator);
 const vars={CONTACT_ENABLED:'false',CONTACT_DEMO_ENABLED:'1',CONTACT_DEMO_UNTIL:new Date(Date.now()+600000).toISOString(),CONTACT_DEMO_TOKEN_SHA256:hash,CONTACT_DEMO_BRIDGE_SHA256:await digest(bridge)};
 const bundle=await build({entryPoints:['workers/contact-production.js'],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers','node:crypto','node:net'],loader:{'.png':'binary'},logLevel:'silent'});
 const create=async bindings=>{const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',compatibilityFlags:['nodejs_compat'],host:'127.0.0.1',port:0,inspectorPort:0,log:new Log(LogLevel.NONE),bindings:Object.fromEntries(Object.entries(bindings).filter(([,v])=>v!==undefined)),durableObjects:{CONTACT_BUDGET:{className:'ContactBudget',useSQLite:true}},outboundService:()=>{throw Error('External network forbidden');}}));t.after(()=>mf.dispose());await mf.ready;return mf;};
 const mf=await create(vars);
 const headers={Authorization:'Bearer '+bridge,'X-Contact-Demo-Hash':hash};
 for(const h of [{},{...headers,Authorization:'Bearer wrong'},{...headers,'X-Contact-Demo-Hash':'0'.repeat(64)}])assert.equal((await mf.dispatchFetch(demoEndpoint,{method:'POST',headers:h})).status,403);
 assert.notEqual((await mf.dispatchFetch('https://evc-contact-production-disabled.evolvevc-2024.workers.dev/api/contact/',{method:'POST'})).status,202);
 const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const pub=Buffer.from(JSON.stringify({...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'})).toString('base64');
 const origin='https://evolve-vc.vercel.app';
 const env={...vars,CONTACT_DEMO_BRIDGE_TOKEN:bridge,CONTACT_FROM:'onboarding@resend.dev',CONTACT_ORIGIN:origin,CONTACT_PUBLIC_JWK:pub,RESEND_API_KEY:'synthetic',VERCEL:'1',VERCEL_ENV:'production',VERCEL_DEPLOYMENT_ID:'test'};
 const body=await contactAttempt({form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields:{message:'Synthetic',consent:'on'}},pub);
 const req=(token=operator,payload=body)=>new Request(origin+'/api/contact/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Contact-Demo-Token':token},body:payload});
 let sends=0,claims=0;
 const transport=async(url,o)=>{sends++;assert.equal(url,'https://api.resend.com/emails');const mail=JSON.parse(o.body);assert.equal(mail.from,'onboarding@resend.dev');assert.deepEqual(mail.to,['evolvevc.2024@gmail.com']);assert.equal(Buffer.from(mail.attachments[0].content,'base64').toString(),body);return Response.json({id:'synthetic'});};
 const claim=(url,o)=>{claims++;return mf.dispatchFetch(url,o);};
 for(const patch of [{VERCEL_ENV:'preview'},{CONTACT_DEMO_ENABLED:undefined},{CONTACT_DEMO_UNTIL:new Date(0).toISOString()},{CONTACT_DELIVERY_MODE:'readable-orchestrated'}])assert.equal((await handle(req(),{...env,...patch},transport,undefined,claim)).status,403);
 assert.equal((await handle(req('wrong'),env,transport,undefined,claim)).status,403);
 assert.equal((await handle(req(operator,'{}'),env,transport,undefined,claim)).status,400);assert.equal(claims,0);
 const results=await Promise.all(Array.from({length:8},()=>handle(req(),{...env},transport,undefined,claim)));
 assert.equal(results.filter(r=>r.status===202).length,1);assert.equal(sends,1);
 assert.equal((await handle(req(),env,transport,undefined,claim)).status,403);assert.equal(sends,1);
 // Response lost AFTER durable consumption: no provider attempt and no reclaim.
 const uncertain=await create(vars);
 assert.equal((await handle(req(),env,transport,undefined,async(u,o)=>{await uncertain.dispatchFetch(u,o);throw Error('lost response');})).status,403);
 assert.equal((await handle(req(),env,transport,undefined,(u,o)=>uncertain.dispatchFetch(u,o))).status,403);assert.equal(sends,1);
 const failed=await create(vars);let attempts=0;
 assert.equal((await handle(req(),env,async()=>{attempts++;throw Error('provider timeout');},undefined,(u,o)=>failed.dispatchFetch(u,o))).status,503);
 assert.equal((await handle(req(),env,transport,undefined,(u,o)=>failed.dispatchFetch(u,o))).status,403);assert.equal(attempts,1);assert.equal(sends,1);
 for(const bindings of [{...vars,CONTACT_DEMO_ENABLED:undefined},{...vars,CONTACT_DEMO_UNTIL:new Date(0).toISOString()}]){
  const closed=await create(bindings);assert.equal((await closed.dispatchFetch(demoEndpoint,{method:'POST',headers})).status,403);
 }
 const config=JSON.parse(readFileSync('wrangler.contact-production.json','utf8').replace(/^\uFEFF/,''));assert.equal(config.vars.CONTACT_ENABLED,'false');assert.equal(config.vars.CONTACT_INGRESS_POLICY,'unverified');assert.equal(config.vars.CONTACT_DEMO_ENABLED,undefined);assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.deepEqual(config.routes,[]);
 t.diagnostic('Real local SQLite claim: one winner among eight; lost responses/provider failure remain spent. No live services invoked.');
});

test('browser token is same-origin attachment only and removed before transmission',async t=>{
 const {demoHeaders}=await import('../src/js/contact-demo-token.js');
 const saved=Object.fromEntries(['location','sessionStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let token='synthetic';
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://evolve-vc.vercel.app'}});
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>token,removeItem:()=>{token=null;}}});
 t.after(()=>{for(const [k,v]of Object.entries(saved))if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];});
 assert.deepEqual(demoHeaders(true,true,'/api/contact/'),{});assert.equal(token,'synthetic');
 assert.deepEqual(demoHeaders(true,false,'https://other.test'),{});assert.equal(token,'synthetic');
 assert.deepEqual(demoHeaders(true,false,'/api/contact/'),{'X-Contact-Demo-Token':'synthetic'});assert.equal(token,null);
 assert.deepEqual(demoHeaders(true,false,'/api/contact/'),{});
});

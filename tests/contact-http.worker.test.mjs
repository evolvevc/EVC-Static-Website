import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const b64=b=>Buffer.from(b).toString('base64');
test('local HTTP integration, SQLite budget, no real services',{timeout:60000},async t=>{
 const config=JSON.parse(readFileSync(new URL('../wrangler.contact-local.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
 assert.deepEqual(config.migrations[0].new_sqlite_classes,['ContactBudget']);assert.deepEqual(config.routes,[]);assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 const generate=()=>crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const [pair,old]=await Promise.all([generate(),generate()]);
 const publicJwk=async(pair,kid)=>b64(JSON.stringify({...await crypto.subtle.exportKey('jwk',pair.publicKey),kid}));
 const env={CONTACT_DELIVERY_MODE:'readable-orchestrated',CONTACT_ORIGIN:'https://contact.example.test',CONTACT_FROM:'test@example.test',RESEND_API_KEY:'synthetic-resend-secret',CONTACT_VISITOR_HASH_SECRET:'synthetic-visitor-secret-at-least-32-characters',CONTACT_PUBLIC_JWK:await publicJwk(old,'attachment'),CONTACT_READABLE_PUBLIC_JWK:await publicJwk(pair,'readable'),CONTACT_READABLE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+b64(await crypto.subtle.exportKey('pkcs8',pair.privateKey))+'\n-----END PRIVATE KEY-----',CONTACT_TURNSTILE_SECRET:'synthetic-turnstile-secret',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us'};
 const seal=async()=>{
  const id=crypto.randomUUID(),iv=crypto.getRandomValues(new Uint8Array(12)),aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const data={id,at:new Date().toISOString(),form:'contact',page:'/contact-us/',fields:{'full-name':'Synthetic Visitor','your-email':'visitor@example.test',company:'Test',role:'Founder',message:'Synthetic message',consent:'on','lead-source':'contact-page'}};
  return {id,v:1,enc:'RSA-OAEP-256+A256GCM',kid:'readable',iv:b64(iv),k:b64(await crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,await crypto.subtle.exportKey('raw',aes))),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify(data))))};
 };
 const bundle=await build({entryPoints:[fileURLToPath(new URL('./contact-http.worker.mjs',import.meta.url))],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers','node:crypto','node:net'],loader:{'.png':'binary'},logLevel:'silent'});
 const logs=[];class Capture extends Log{logWithLevel(_level,message){logs.push(String(message));}}
 let outbound=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.DEBUG),bindings:env,durableObjects:{CONTACT_BUDGET:{className:'ContactBudget',useSQLite:true}},outboundService:()=>{outbound++;throw new Error('Network disabled');}}));
 t.after(()=>mf.dispose());await mf.ready;
 let checked=0;
 const call=async(item,options={})=>{
  const {path='/api/contact/',method='POST',headers={},trusted=true,token='synthetic-token',raw}=options;
  const response=await mf.dispatchFetch('http://localhost'+path,{method,headers:{origin:env.CONTACT_ORIGIN,'content-type':'application/json','cf-connecting-ip':'192.0.2.1',...headers,'x-test-ingress-ip':headers['cf-connecting-ip']??'192.0.2.1'},cf:{testTrustedIngress:trusted},...(method==='POST'?{body:raw??JSON.stringify({envelope:item,turnstileToken:token})}:{})});
  const text=await response.text();const body=JSON.parse(text);
  assert.deepEqual(Object.keys(body),['accepted']);assert.equal(body.accepted,response.status===202);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy'));
  for(const secret of ['Synthetic Visitor','visitor@example.test','synthetic-resend-secret','synthetic-token','synthetic-receipt','BEGIN PRIVATE KEY'])assert.equal(text.includes(secret),false);
  checked++;return {status:response.status,sends:Number(response.headers.get('x-test-send-count'))};
 };
 const start=performance.now();const item=await seal();
 assert.deepEqual(await call(item),{status:202,sends:1});
 for(const [options,status] of [[{method:'GET'},405],[{path:'/api/contact'},404],[{path:'/other'},404],[{headers:{'content-type':'text/plain'}},415],[{raw:'x'.repeat(262145)},413],[{headers:{origin:'https://attacker.test'}},403],[{headers:{origin:''}},403],[{trusted:false},403],[{headers:{'cf-connecting-ip':'','x-forwarded-for':'192.0.2.1','x-real-ip':'192.0.2.1'}},403],[{headers:{'cf-connecting-ip':'invalid'}},403],[{headers:{'cf-worker':'untrusted.test'}},403],[{headers:{'x-test-missing-config':'1'}},503],[{headers:{'x-test-missing-budget':'1'}},503],[{headers:{'x-test-default-entry':'1','x-test-mode':'enabled'}},503],[{token:'invalid'},403]]){
  assert.deepEqual(await call(item,options),{status,sends:0},JSON.stringify(options));
 }
 assert.deepEqual(await call({...item,kid:'attachment'}),{status:400,sends:0});
 assert.deepEqual(await call({...item,ct:item.ct.slice(0,-4)+'AAAA'}),{status:400,sends:0});
 assert.deepEqual(await call(item),{status:409,sends:0});
 const concurrent=await seal();const responses=await Promise.all(Array.from({length:8},()=>call(concurrent,{headers:{'cf-connecting-ip':'192.0.2.2'}})));
 assert.equal(responses.filter(r=>r.status===202).length,1);assert.equal(responses.reduce((n,r)=>n+r.sends,0),1);
 for(const mode of ['failure','timeout']){const envelope=await seal();assert.deepEqual(await call(envelope,{headers:{'cf-connecting-ip':mode==='failure'?'192.0.2.3':'192.0.2.4','x-test-provider':mode}}),{status:503,sends:1});assert.equal((await call(envelope,{headers:{'cf-connecting-ip':mode==='failure'?'192.0.2.3':'192.0.2.4'}})).sends,0);}
 for(let i=0;i<3;i++)assert.equal((await call(await seal(),{headers:{'cf-connecting-ip':'192.0.2.5'}})).status,202);
 assert.deepEqual(await call(await seal(),{headers:{'cf-connecting-ip':'192.0.2.5'}}),{status:429,sends:0});
 assert.deepEqual(await call(await seal(),{headers:{'cf-connecting-ip':'192.0.2.5','x-forwarded-for':'192.0.2.99','x-real-ip':'192.0.2.99'}}),{status:429,sends:0});
 const ipv6=await seal();assert.equal((await call(ipv6,{headers:{'cf-connecting-ip':'2001:db8::1'}})).status,202);assert.equal((await call(ipv6,{headers:{'cf-connecting-ip':'2001:0db8:0000:0000:0000:0000:0000:0001'}})).status,409);
 assert.equal(outbound,0);for(const marker of ['synthetic-resend-secret','BEGIN PRIVATE KEY','Synthetic Visitor'])assert.equal(logs.join('\n').includes(marker),false);
 t.diagnostic(`${checked} HTTP checks passed; ${(performance.now()-start).toFixed(2)} ms complete workload wall-clock, not CPU. Zero outbound requests.`);
});

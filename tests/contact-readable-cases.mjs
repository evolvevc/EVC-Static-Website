import {contactReadable} from '../server/contact-readable.js';
import {contactTurnstile} from '../server/contact-turnstile.js';
const check=value=>{if(!value)throw new Error('Offline orchestration check failed');};
const b64=value=>{let text='';for(const b of new Uint8Array(value))text+=String.fromCharCode(b);return btoa(text);};
const now=Date.parse('2026-11-06T10:00:00Z');
export async function readableCases(makeStore,logoContent) {
 const generate=()=>crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const [pair,old]=await Promise.all([generate(),generate()]);
 const encoded=async(pair,kid)=>btoa(JSON.stringify({...await crypto.subtle.exportKey('jwk',pair.publicKey),kid}));
 const env={CONTACT_DELIVERY_MODE:'readable-orchestrated',CONTACT_ORIGIN:'https://contact.example.test',CONTACT_FROM:'test@example.test',RESEND_API_KEY:'synthetic-resend-secret',CONTACT_VISITOR_HASH_SECRET:'synthetic-visitor-hash-secret-long-enough',CONTACT_PUBLIC_JWK:await encoded(old,'attachment'),CONTACT_READABLE_PUBLIC_JWK:await encoded(pair,'readable'),CONTACT_READABLE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+b64(await crypto.subtle.exportKey('pkcs8',pair.privateKey))+'\n-----END PRIVATE KEY-----',CONTACT_TURNSTILE_SECRET:'synthetic-turnstile-secret',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us'};
 const fields={'full-name':'Synthetic Visitor','your-email':'visitor@example.test',company:'Example',role:'Founder',message:'Synthetic content',consent:'on','lead-source':'contact-page'};
 const seal=async(patch={},id=crypto.randomUUID())=>{
  const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));
  return {v:1,enc:'RSA-OAEP-256+A256GCM',kid:'readable',id,iv:b64(iv),k:b64(await crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,await crypto.subtle.exportKey('raw',aes))),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(JSON.stringify({form:'contact',page:'/contact-us/',id,at:new Date(now).toISOString(),fields:{...fields,...patch}}))))};
 };
 const request=body=>new Request(env.CONTACT_ORIGIN+'/local-only',{method:'POST',headers:{origin:env.CONTACT_ORIGIN,'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
 const setup=async(options={})=>{
  const store=await makeStore({clock:()=>now,...options.limits});const calls={send:0,verify:0,mail:null};
  const budget=options.budget??store;
  const turnstile=contactTurnstile(env,{fetch:async()=>{calls.verify++;return Response.json(options.badToken?{success:false}:{success:true,hostname:env.CONTACT_TURNSTILE_HOSTNAME,action:env.CONTACT_TURNSTILE_ACTION});}});
  const transport=async(url,init)=>{
   calls.send++;check(url==='https://api.resend.com/emails'&&init.redirect==='error');
   calls.mail=JSON.parse(init.body);check(calls.mail.from===env.CONTACT_FROM&&calls.mail.to.join(',')==='contact@evolvevcap.com');
   check(init.headers['Idempotency-Key']==='contact/'+JSON.parse(init.body).html.match(/Enquiry reference: ([a-f0-9-]+)/)[1]);
   return options.transport?options.transport(url,init):Response.json({id:'synthetic-provider-receipt'});
  };
  const handle=contactReadable({...env,...options.env},{turnstile,budget,transport,logoContent,timeoutMs:options.timeoutMs??1000});
  const run=(item,visitor='192.0.2.1')=>handle(request({envelope:item,turnstileToken:'synthetic-token'}),{canonicalVisitor:visitor});
  return {handle,run,calls,store};
 };
 const passed=[];
 const test=async(name,fn)=>{await fn();passed.push(name);};
 await test('success only after provider acceptance and durable confirmation',async()=>{const {run,calls}=await setup();const r=await run(await seal());check(r.status===202&&r.accepted&&r.state==='confirmed'&&calls.send===1);});
 await test('Turnstile before decryption',async()=>{const {run,calls}=await setup({badToken:true,env:{CONTACT_READABLE_PRIVATE_KEY:'invalid-test-key'}});const r=await run(await seal());check(r.status===403&&calls.send===0);});
 await test('strict shape size version and readable key',async()=>{const {run,handle,calls}=await setup();const item=await seal();for(const patch of [{kid:'attachment'},{v:2},{extra:'x'}])check((await run({...item,...patch})).status===400);for(const body of [{envelope:item,turnstileToken:'token',ip:'192.0.2.1'},'x'.repeat(262145),{envelope:item,turnstileToken:2}])check((await handle(request(body),{canonicalVisitor:'192.0.2.1'})).status===400);check(calls.verify===0&&calls.send===0);});
 await test('trusted metadata required',async()=>{const {handle,calls}=await setup();check((await handle(request({envelope:await seal(),turnstileToken:'token'}),{})).status===400);check(calls.send===0);});
 await test('tampering invalid consent and control characters',async()=>{const {run,calls}=await setup();const item=await seal();check((await run({...item,ct:item.ct.slice(0,-4)+'AAAA'})).status===400);check((await run(await seal({consent:'off'}))).status===400);check((await run(await seal({'full-name':'Name\r\nBcc: test'}))).status===400);check(calls.send===0);});
 await test('approved HTML escapes injection',async()=>{const {run,calls}=await setup();check((await run(await seal({company:'<img onerror="bad()">',message:'<script>bad()</script> &\nnext'}))).accepted);check(!calls.mail.html.includes('<script>')&&calls.mail.html.includes('&lt;script&gt;')&&calls.mail.html.includes('<br>next')&&calls.mail.attachments[0].content===logoContent);});
 await test('visitor daily and monthly budget denial',async()=>{for(const limits of [{visitorLimit:1},{dailyLimit:1},{monthlyLimit:1}]){const {run,calls}=await setup({limits});check((await run(await seal())).accepted);check((await run(await seal())).status===429);check(calls.send===1);}});
 await test('concurrent duplicate grants exactly one send',async()=>{const {run,calls}=await setup();const item=await seal();const results=await Promise.all(Array.from({length:10},()=>run(item)));check(calls.send===1&&results.filter(r=>r.accepted).length===1);check((await run(item)).status===409&&calls.send===1);});
 await test('repeated ID with altered payload cannot claim acceptance',async()=>{const {run,calls}=await setup();const item=await seal();check((await run(item)).accepted);const r=await run(await seal({message:'Changed'},item.id));check(!r.accepted&&r.status===409&&calls.send===1);});
 await test('explicit provider rejection terminal no resend',async()=>{const {run,calls}=await setup({transport:async()=>new Response('',{status:422})});const item=await seal();check((await run(item)).state==='rejected');check((await run(item)).status===409&&calls.send===1);});
 await test('timeout uncertain and no retry',async()=>{let signal;const {run,calls}=await setup({timeoutMs:10,transport:async(_url,init)=>{signal=init.signal;return new Promise(()=>{});}});const item=await seal();check((await run(item)).state==='uncertain'&&signal.aborted);check((await run(item)).status===409&&calls.send===1);});
 await test('ambiguous network malformed and server failures uncertain',async()=>{for(const transport of [async()=>{throw new Error('synthetic-secret');},async()=>new Response('',{status:500}),async()=>Response.json({}),async()=>new Response('{',{headers:{'content-type':'application/json'}}),async()=>new Response('x'.repeat(8193),{headers:{'content-type':'application/json'}})]){const {run,calls}=await setup({transport});check((await run(await seal())).state==='uncertain'&&calls.send===1);}});
 await test('reserve claim and settlement storage failures fail closed',async()=>{
  for(const stage of ['reserve','claim','settle']){
   const backing=await makeStore({clock:()=>now});const budget=Object.fromEntries(['reserve','claim','settle'].map(name=>[name,(...args)=>{if(name===stage)throw new Error('synthetic-secret');return backing[name](...args);} ]));
   const {run,calls}=await setup({budget});const r=await run(await seal());check(!r.accepted&&calls.send===(stage==='settle'?1:0));
  }
 });
 await test('explicit denied grant never reaches transport',async()=>{
  const backing=await makeStore({clock:()=>now});
  const budget={reserve:(...a)=>backing.reserve(...a),claim:async()=>({ok:true,send:false,state:'uncertain'}),settle:(...a)=>backing.settle(...a)};
  const {run,calls}=await setup({budget});check((await run(await seal())).status===409&&calls.send===0);
 });
 await test('stalled provider body times out and cancels',async()=>{
  let cancelled=false;
  const {run,calls}=await setup({timeoutMs:10,transport:async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-type':'application/json'}})});
  const item=await seal();check((await run(item)).state==='uncertain'&&cancelled);check((await run(item)).status===409&&calls.send===1);
 });
 await test('late acceptance cannot change uncertain settlement',async()=>{
  let finish;const {run,calls}=await setup({timeoutMs:10,transport:()=>new Promise(resolve=>{finish=resolve;})});
  const item=await seal();check((await run(item)).state==='uncertain');finish(Response.json({id:'late-receipt'}));
  await new Promise(resolve=>setTimeout(resolve,1));check((await run(item)).status===409&&calls.send===1);
 });
 await test('missing configuration and attachment mode fail closed',async()=>{for(const patch of [{RESEND_API_KEY:''},{CONTACT_DELIVERY_MODE:'attachment'},{CONTACT_READABLE_PRIVATE_KEY:''},{CONTACT_VISITOR_HASH_SECRET:''},{CONTACT_READABLE_PUBLIC_JWK:env.CONTACT_PUBLIC_JWK}]){const {run,calls}=await setup({env:patch});check((await run(await seal())).status===503&&calls.send===0);}});
 await test('no sensitive logging',async()=>{const names=['log','warn','error','info','debug','trace'];const saved=names.map(n=>console[n]);let logs=0;try{names.forEach(n=>console[n]=()=>logs++);const {run}=await setup();await run(await seal());const failed=await setup({transport:async()=>{throw new Error(env.RESEND_API_KEY);}});await failed.run(await seal());check(logs===0);}finally{names.forEach((n,i)=>console[n]=saved[i]);}});
 return passed;
}

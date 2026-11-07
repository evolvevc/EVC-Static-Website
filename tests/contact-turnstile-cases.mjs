import {contactTurnstile} from '../server/contact-turnstile.js';
const env={CONTACT_TURNSTILE_SECRET:'synthetic-secret-marker',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us'};
const token='synthetic-token-marker';
const good={success:true,hostname:env.CONTACT_TURNSTILE_HOSTNAME,action:env.CONTACT_TURNSTILE_ACTION,'error-codes':[]};
const check = value => {if(!value) throw new Error('Offline Turnstile check failed');};
const json = value => Response.json(value);
const verify = (fetch, value=token, settings=env) => contactTurnstile(settings,{fetch,timeoutMs:30}).verify(value);
export const cases = [
 ['valid exact Siteverify request',async()=>{
   let calls=0;
   check(await verify(async(url,options)=>{
    calls++; check(url==='https://challenges.cloudflare.com/turnstile/v0/siteverify');
    check(options.method==='POST' && options.redirect==='error' && options.signal instanceof AbortSignal);
    check(options.headers['Content-Type']==='application/json');
    const body=JSON.parse(options.body); check(Object.keys(body).sort().join(',')==='response,secret');
    check(body.secret===env.CONTACT_TURNSTILE_SECRET && body.response===token);
    return json(good);
   })); check(calls===1);
 }],
 ['missing wrong-type whitespace and oversized tokens rejected before fetch',async()=>{
   let calls=0; for(const value of [undefined,null,0,{},[], '', '   ', 'x'.repeat(2049)]) {
    check(!await contactTurnstile(env,{fetch:async()=>{calls++;return json(good);}}).verify(value));
   } check(calls===0);
 }],
 ['2048-character token accepted',async()=>{check(await verify(async()=>json(good),'x'.repeat(2048)));}],
 ...[
  ['failed',{success:false}],['expired',{success:false,'error-codes':['timeout-or-duplicate']}],
  ['wrong hostname',{...good,hostname:'other.example.test'}],['hostname suffix attack',{...good,hostname:good.hostname+'.attacker.test'}],
  ['wrong action',{...good,action:'login'}],['nonboolean success',{...good,success:'true'}],
  ['contradictory error',{...good,'error-codes':['invalid-input-response']}],['missing fields',{success:true}],
  ['null response',null],['array response',[]]
 ].map(([name,value])=>[name,async()=>{check(!await verify(async()=>json(value)));}]),
 ['replayed token rejected by Siteverify',async()=>{
   let calls=0; const adapter=contactTurnstile(env,{fetch:async()=>json(++calls===1?good:{success:false,'error-codes':['timeout-or-duplicate']})});
   check(await adapter.verify(token)); check(!await adapter.verify(token)); check(calls===2);
 }],
 ['network failure sanitized',async()=>{check(!await verify(async()=>{throw new Error(token+env.CONTACT_TURNSTILE_SECRET);}));}],
 ['timeout aborts uncooperative fetch and returns false',async()=>{
   let signal; check(!await verify(async(_url,options)=>{signal=options.signal;return new Promise(()=>{});})); check(signal.aborted);
 }],
 ['timeout bounds stalled response body',async()=>{
   let cancelled=false;
   check(!await verify(async()=>new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-type':'application/json'}})));
   check(cancelled);
 }],
 ['malformed JSON HTTP status media and UTF-8 fail closed',async()=>{
   for(const response of [new Response('{',{headers:{'content-type':'application/json'}}),new Response('',{status:500}),new Response(JSON.stringify(good)),new Response(new Uint8Array([255]),{headers:{'content-type':'application/json'}})]) check(!await verify(async()=>response));
 }],
 ['oversized advertised and streamed responses cancelled',async()=>{
   for(const headers of [{'content-type':'application/json'},{'content-type':'application/json','content-length':'9000'}]) {
    let cancelled=false;
    const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(8193));},cancel(){cancelled=true;}});
    check(!await verify(async()=>new Response(stream,{headers}))); check(cancelled);
   }
 }],
 ['absent or invalid server configuration fails before fetch',async()=>{
   let calls=0;
   for(const settings of [undefined,{},...Object.keys(env).map(key=>({...env,[key]:''})),{...env,CONTACT_TURNSTILE_HOSTNAME:'https://contact.example.test'}]) {
    check(!await contactTurnstile(settings,{fetch:async()=>{calls++;return json(good);}}).verify(token));
   } check(calls===0);
 }],
 ['no sensitive logging or thrown raw errors',async()=>{
   const methods=['log','info','warn','error','debug','trace','dir']; const saved=methods.map(n=>console[n]); let calls=0;
   try {
    methods.forEach(n=>{console[n]=()=>{calls++;};});
    check(await verify(async()=>json(good)));
    check(!await verify(async()=>{throw new Error(token+env.CONTACT_TURNSTILE_SECRET);}));
    check(!await verify(async()=>new Response(token,{headers:{'content-type':'application/json'}})));
    check(calls===0);
   } finally {methods.forEach((n,i)=>{console[n]=saved[i];});}
 }]
];

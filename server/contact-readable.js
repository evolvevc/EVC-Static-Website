import {envelope,publicKey,limit} from './envelope.js';
import {contactPrivateKey} from './contact-private-key.js';
import {decryptContact} from './contact-payload.js';
import {contactEmail} from './contact-email-render.js';
import {contactVisitorId} from './contact-budget-store.js';
const result=(status,state)=>({status,accepted:status===202,state});
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
async function boundedJson(response,max,signal) {
 const reader=response.body?.getReader(); if(!reader) throw new Error();
 const chunks=[];let size=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};
 signal?.addEventListener('abort',cancel,{once:true});
 try {
  if(signal?.aborted || Number(response.headers.get('content-length'))>max)throw new Error();
  for(;;){const {done,value}=await reader.read();if(signal?.aborted)throw new Error();if(done)break;size+=value.byteLength;if(size>max)throw new Error();chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 }finally{signal?.removeEventListener('abort',cancel);cancel();}
}
// Standalone only. No default transport: callers must explicitly inject one.
// trustedMetadata must be created by a trusted ingress, NEVER from JSON or forwarded headers.
export function contactReadable(env,{turnstile,budget,transport,logoContent,timeoutMs=10000}={}) {
 let key,kms,ready=false;
 const origin=env?.CONTACT_ORIGIN,from=env?.CONTACT_FROM,credential=env?.RESEND_API_KEY;
 const identityEnv={CONTACT_VISITOR_HASH_SECRET:env?.CONTACT_VISITOR_HASH_SECRET};
 try {
  key=publicKey(env.CONTACT_READABLE_PUBLIC_JWK);
  const old=publicKey(env.CONTACT_PUBLIC_JWK);
  const jwk=value=>JSON.parse(atob(value));
  ready=env.CONTACT_DELIVERY_MODE==='readable-orchestrated' && key.kid!==old.kid &&
   jwk(env.CONTACT_READABLE_PUBLIC_JWK).n!==jwk(env.CONTACT_PUBLIC_JWK).n &&
   nonempty(env.CONTACT_READABLE_PRIVATE_KEY)&&nonempty(origin)&&nonempty(from)&&!/[\r\n]/.test(from)&&nonempty(credential)&&
   typeof identityEnv.CONTACT_VISITOR_HASH_SECRET==='string'&&identityEnv.CONTACT_VISITOR_HASH_SECRET.length>=32&&
   typeof turnstile?.verify==='function'&&['reserve','claim','settle'].every(name=>typeof budget?.[name]==='function')&&
   typeof transport==='function'&&transport!==globalThis.fetch&&nonempty(logoContent)&&
   Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=10000;
  kms=contactPrivateKey(env,{kid:key.kid});
 }catch{}
 return async function orchestrate(request,trustedMetadata) {
  if(!ready)return result(503,'unavailable');
  if(request.method!=='POST')return result(405,'invalid');
  if(request.headers.get('origin')!==origin)return result(403,'invalid');
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return result(415,'invalid');
  let input,visitorId,fields,issuedAt,mail;
  try {
   input=await boundedJson(request,limit);
   if(!input||Array.isArray(input)||Object.keys(input).sort().join(',')!=='envelope,turnstileToken')return result(400,'invalid');
   envelope(input.envelope,key);
   if(typeof input.turnstileToken!=='string'||!input.turnstileToken.trim()||input.turnstileToken.length>2048)return result(400,'invalid');
   visitorId=await contactVisitorId(identityEnv,trustedMetadata?.canonicalVisitor);
  }catch{return result(400,'invalid');}
  try {if(await turnstile.verify(input.turnstileToken)!==true)return result(403,'verification_failed');}
  catch{return result(503,'unavailable');}
  try {
   const payload=await decryptContact(input.envelope,key,kms,{includeMetadata:true});
   fields=payload.fields;issuedAt=Date.parse(payload.at);
   const controls=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
   for(const [name,value] of Object.entries(fields))if(controls.test(name==='message'?value.replace(/[\r\n\t]/g,''):value))return result(400,'invalid');
   mail=contactEmail(fields,input.envelope.id,logoContent);
  }catch{return result(400,'invalid');}
  const id=input.envelope.id;
  const body=JSON.stringify({from,to:[env.CONTACT_TO ?? 'contact@evolvevcap.com'],...mail});
  try {
   const reservation=await budget.reserve({id,visitorId,issuedAt});
   if(reservation?.ok!==true)return result(['visitor','daily','monthly','capacity'].includes(reservation?.reason)?429:503,'blocked');
   // Duplicate IDs never imply this payload was accepted, even if prior state is confirmed.
   if(reservation.duplicate===true)return result(409,'duplicate');
   if(reservation.state!=='reserved'||reservation.send!==false)return result(503,'blocked');
   const claim=await budget.claim(id);
   if(claim?.ok!==true||claim.send!==true||claim.state!=='uncertain')return result(409,'not_granted');
  }catch{return result(503,'blocked');}
  const controller=new AbortController();let timer;
  const deadline=new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve('uncertain');},timeoutMs);});
  const send=(async()=>{
   try {
    const response=await transport('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:controller.signal,
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+credential,'Idempotency-Key':'contact/'+id},body});
    if(controller.signal.aborted){void response.body?.cancel().catch(()=>{});return 'uncertain';}
    if([400,401,403,404,422,429].includes(response.status)){void response.body?.cancel().catch(()=>{});return 'rejected';}
    if(!response.ok || response.headers.get('content-type')?.split(';')[0].trim()!=='application/json'){void response.body?.cancel().catch(()=>{});return 'uncertain';}
    const receipt=await boundedJson(response,8192,controller.signal);
    return receipt && typeof receipt.id==='string' && receipt.id.trim().length>0 && receipt.id.length<=256 ? 'confirmed':'uncertain';
   }catch{return 'uncertain';}
  })();
  let outcome;try{outcome=await Promise.race([send,deadline]);}finally{clearTimeout(timer);}
  try {
   const settled=await budget.settle(id,outcome);
   if(settled?.ok!==true||settled.state!==outcome)return result(503,'uncertain');
  }catch{return result(503,'uncertain');}
  return result(outcome==='confirmed'?202:outcome==='rejected'?502:503,outcome);
 };
}

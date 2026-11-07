import {isIP} from 'node:net';
import {contactReadable} from '../server/contact-readable.js';
import {contactTurnstile} from '../server/contact-turnstile.js';
import {contactBudget} from '../server/contact-budget.js';
import {limit} from '../server/envelope.js';
import logoBytes from '../build-inputs/logo.png';
export {ContactBudget} from '../server/contact-budget.js';
const logoContent=()=>{let s='';for(const b of new Uint8Array(logoBytes))s+=String.fromCharCode(b);return btoa(s);};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
const reply=(status,accepted=false)=>Response.json({accepted},{status,headers:{...headers,...(status===405?{Allow:'POST'}:{})}});
// A code-owned ingress attestor is mandatory. request.cf or a header alone is NOT proof.
// Only direct trusted Cloudflare ingress may supply CF-Connecting-IP. No proxy fallback.
export function cloudflareVisitor(request,attest) { try {
 if(!request.cf || typeof attest!=='function' || attest(request)!==true || request.headers.has('cf-worker'))return null;
 const ip=request.headers.get('cf-connecting-ip');
 if(typeof ip!=='string'||ip.trim()!==ip||!isIP(ip))return null;
 return isIP(ip)===6?new URL('http://['+ip+']/').hostname.slice(1,-1):ip;
 } catch {return null;}
}
// Dependencies are code-only, never env flags. Default export cannot send or verify remotely.
export function createContactWorker({siteverifyFetch,transport,attestIngress,timeoutMs=10000}={}) {
 return {async fetch(request,env) {
  try {
   if(new URL(request.url).pathname!=='/api/contact/')return reply(404);
   if(request.method!=='POST')return reply(405);
   if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return reply(415);
   const required=['CONTACT_ORIGIN','CONTACT_FROM','CONTACT_PUBLIC_JWK','CONTACT_READABLE_PUBLIC_JWK','CONTACT_READABLE_PRIVATE_KEY','CONTACT_VISITOR_HASH_SECRET','RESEND_API_KEY','CONTACT_TURNSTILE_SECRET','CONTACT_TURNSTILE_HOSTNAME','CONTACT_TURNSTILE_ACTION'];
   if(!env||required.some(k=>typeof env[k]!=='string'||!env[k].trim())||env.CONTACT_DELIVERY_MODE!=='readable-orchestrated'||typeof env.CONTACT_BUDGET?.idFromName!=='function'||typeof env.CONTACT_BUDGET?.get!=='function'||typeof siteverifyFetch!=='function'||typeof transport!=='function'||typeof attestIngress!=='function')return reply(503);
   // Singleton exact origin allowlist. Origin is neither identity nor bot protection.
   if(new URL(env.CONTACT_ORIGIN).origin!==env.CONTACT_ORIGIN)return reply(503);
   if(request.headers.get('origin')!==env.CONTACT_ORIGIN)return reply(403);
   const canonicalVisitor=cloudflareVisitor(request,attestIngress);if(!canonicalVisitor)return reply(403);
   if(Number(request.headers.get('content-length'))>limit)return reply(413);
   const reader=request.body?.getReader();if(!reader)return reply(400);
   const chunks=[];let size=0,timer;
   const deadline=new Promise(resolve=>{timer=setTimeout(()=>{void reader.cancel().catch(()=>{});resolve(null);},5000);});
   const read=(async()=>{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){void reader.cancel().catch(()=>{});return false;}chunks.push(value);}return true;})();
   let complete;try{complete=await Promise.race([read,deadline]);}finally{clearTimeout(timer);}
   if(complete!==true)return reply(complete===false?413:408);
   const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
   const run=contactReadable(env,{turnstile:contactTurnstile(env,{fetch:siteverifyFetch}),budget:contactBudget(env.CONTACT_BUDGET),transport,logoContent:logoContent(),timeoutMs});
   const result=await run(new Request(request.url,{method:'POST',headers:request.headers,body}),{canonicalVisitor});
   return reply(result.status,result.accepted===true);
  }catch{return reply(503);}
 }};
}
export default createContactWorker();

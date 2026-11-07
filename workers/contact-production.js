import {contactCors} from '../server/contact-cors.js';
import {contactEndpoint} from '../src/js/contact-endpoint.js';
import {directContactIngress} from '../server/contact-ingress.js';
import {createContactWorker} from './contact-local.js';
import {contactResend} from '../server/contact-resend.js';
import {publicKey} from '../server/envelope.js';
export {ContactBudget} from '../server/contact-budget.js';
const disabled=()=>Response.json({accepted:false},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'}});
// Network injection is code-owned. No environment flag selects a fake transport.
// Direct ingress requires the selected platform policy and account audit; see runbook.
export function createProductionContact({attestIngress,fetch:network=globalThis.fetch,timeoutMs=8000}={}) {
 return {async fetch(request,env){
  return contactCors(request,env,async()=>{
  try {
   if(env?.CONTACT_ENABLED!=='true'||typeof attestIngress!=='function'||typeof network!=='function')return disabled();
   const origin=new URL(env.CONTACT_ORIGIN);
   if(origin.protocol!=='https:'||origin.origin!==env.CONTACT_ORIGIN||origin.hostname!==env.CONTACT_TURNSTILE_HOSTNAME||
    env.CONTACT_TURNSTILE_ACTION!=='contact_us'||env.CONTACT_TO!=='evolvevc.2024@gmail.com'||
    typeof env.CONTACT_FROM!=='string'||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.CONTACT_FROM)||
    publicKey(env.CONTACT_READABLE_PUBLIC_JWK).kid!==env.CONTACT_READABLE_KID||
    !Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)return disabled();
   // The HTTP boundary still checks all secrets, exact origin, trusted identity and size.
   const worker=createContactWorker({attestIngress:r=>new URL(r.url).origin===(env.CONTACT_ENDPOINT ? new URL(contactEndpoint(env.CONTACT_ENDPOINT)).origin : origin.origin)&&attestIngress(r)===true,
    siteverifyFetch:network,transport:contactResend(env,{fetch:network,timeoutMs}),timeoutMs:Math.min(timeoutMs+1000,10000)});
   return await worker.fetch(request,env);
  }catch{return disabled();}
  });
 }};
}
// Both enablement and verified ingress policy are required. No synthetic transport.
export default {fetch(request,env){
 return createProductionContact({attestIngress:r=>directContactIngress(r,env)}).fetch(request,env);
}};

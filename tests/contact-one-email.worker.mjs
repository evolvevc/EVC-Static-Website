// Test fixture only. No real credential, network fetch or production ingress bypass.
// The LOCAL_DELIVERY binding exists only as an in-process Node callback in Miniflare.
import {createContactWorker} from '../workers/contact-local.js';
import {contactResend} from '../server/contact-resend.js';
export {ContactBudget} from '../server/contact-budget.js';
const used=new Set();
export default {async fetch(request,env){
 if(!env.LOCAL_DELIVERY||request.headers.get('origin')!==env.LOCAL_ORIGIN)return Response.json({accepted:false},{status:403});
 const origin=new URL(env.LOCAL_ORIGIN);if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1')return Response.json({accepted:false},{status:403});
 const headers=new Headers(request.headers);
 // Identity comes from the loopback listener, never forwarded/client identity.
 headers.set('cf-connecting-ip','127.0.0.1');headers.delete('cf-worker');
 const local=new Request(request,{headers,cf:{localLoopback:true}});
 const settings={...env,CONTACT_ORIGIN:env.LOCAL_ORIGIN};
 // Internal service hop uses manual redirects (workerd rejects Request redirect:error).
 // The Node bridge uses redirect:error for the actual Resend request.
 const adapter=contactResend(settings,{fetch:(url,options)=>env.LOCAL_DELIVERY.fetch(new Request(url,{...options,redirect:'manual'}))});
 const worker=createContactWorker({attestIngress:r=>r.cf?.localLoopback===true,
  siteverifyFetch:async(_url,options)=>{
   const token=JSON.parse(options.body).response;
   const ok=typeof token==='string'&&/^local-synthetic-[0-9a-f-]{36}$/.test(token)&&!used.has(token)&&used.size<2000;
   if(ok)used.add(token);
   return Response.json({success:ok,hostname:env.CONTACT_TURNSTILE_HOSTNAME,action:'contact_us'});
  },transport:adapter});
 return worker.fetch(local,settings);
}};

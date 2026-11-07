// TEST-ONLY entry. Never referenced by the local/default Wrangler configuration.
import disabled,{createContactWorker} from '../workers/contact-local.js';
export {ContactBudget} from '../workers/contact-local.js';
export default {async fetch(request,env){
 const ingressHeaders=new Headers(request.headers);
 ingressHeaders.set('cf-connecting-ip',request.headers.get('x-test-ingress-ip')??'');
 request=new Request(request,{headers:ingressHeaders});
 let sends=0;
 const settings={...env};
 if(request.headers.has('x-test-missing-config'))delete settings.CONTACT_READABLE_PRIVATE_KEY;
 if(request.headers.has('x-test-missing-budget'))delete settings.CONTACT_BUDGET;
 const deps={
  attestIngress:r=>r.cf?.testTrustedIngress===true,
  siteverifyFetch:async(_url,init)=>Response.json(JSON.parse(init.body).response==='invalid'?{success:false}:{success:true,hostname:env.CONTACT_TURNSTILE_HOSTNAME,action:env.CONTACT_TURNSTILE_ACTION}),
  transport:async()=>{sends++;const mode=request.headers.get('x-test-provider');if(mode==='timeout')return new Promise(()=>{});if(mode==='failure')return new Response('',{status:500});return Response.json({id:'synthetic-receipt'});},
  timeoutMs:20
 };
 const worker=request.headers.has('x-test-default-entry')?disabled:createContactWorker(deps);
 const response=await worker.fetch(request,settings);
 const result=new Response(response.body,response);result.headers.set('x-test-send-count',String(sends));return result;
}};

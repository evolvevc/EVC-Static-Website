// Isolated test entry only: no real fetch, credentials or ingress authority.
import disabled,{createProductionContact} from '../workers/contact-production.js';
export {ContactBudget} from '../workers/contact-production.js';
export default {async fetch(request,env){
 const ingressHeaders=new Headers(request.headers);
 ingressHeaders.set('cf-connecting-ip',request.headers.get('x-test-ingress-ip')??'');
 request=new Request('https://contact.example.test'+new URL(request.url).pathname,{method:request.method,headers:ingressHeaders,body:request.body,cf:request.cf});
 let sends=0;const settings={...env};
 if(request.headers.has('x-test-missing-config'))delete settings.CONTACT_READABLE_PRIVATE_KEY;
 if(request.headers.has('x-test-missing-budget'))delete settings.CONTACT_BUDGET;
 if(request.headers.has('x-test-disabled'))settings.CONTACT_ENABLED='false';
 if(request.headers.has('x-test-wrong-pin'))settings.CONTACT_READABLE_KID='wrong';
 if(request.headers.has('x-test-wrong-host'))settings.CONTACT_TURNSTILE_HOSTNAME='other.example.test';
 if(request.headers.has('x-test-wrong-recipient'))settings.CONTACT_TO='other@example.test';
 const network=async(url,options)=>{
  if(url==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return Response.json(JSON.parse(options.body).response==='invalid'?{success:false}:{success:true,hostname:env.CONTACT_TURNSTILE_HOSTNAME,action:'contact_us'});
  if(url!=='https://api.resend.com/emails')throw new Error('Unexpected offline destination');
  sends++;const mode=request.headers.get('x-test-provider');
  if(mode==='timeout')return new Promise(()=>{});
  if(mode==='failure')return new Response('',{status:500});
  if(mode==='rejection')return Response.json({message:'raw-provider-marker'},{status:422});
  if(mode==='conflict')return Response.json({message:'raw-provider-marker'},{status:409});
  return Response.json({id:'00000000-0000-4000-8000-000000000001'});
 };
 const worker=request.headers.has('x-test-default-entry')?disabled:createProductionContact({fetch:network,attestIngress:r=>r.cf?.testTrustedIngress===true,timeoutMs:20});
 const response=await worker.fetch(request,settings);const result=new Response(response.body,response);result.headers.set('x-test-send-count',String(sends));return result;
}};

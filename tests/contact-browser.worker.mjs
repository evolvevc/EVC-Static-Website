// Local manual-browser test entry only. Not a deployment entry.
import tested from './contact-production.worker.mjs';
export {ContactBudget} from './contact-production.worker.mjs';
const used=new Set();
export default {async fetch(request,env){
 if(request.headers.get('origin')!==env.LOCAL_ORIGIN)return Response.json({accepted:false},{status:403});
 let input;try{input=await request.clone().json();}catch{return Response.json({accepted:false},{status:400});}
 if(typeof input.turnstileToken!=='string'||!input.turnstileToken.startsWith('local-synthetic-')||used.has(input.turnstileToken)||env.LOCAL_SCENARIO==='turnstile')return Response.json({accepted:false},{status:403});
 used.add(input.turnstileToken);if(used.size>2000)used.delete(used.values().next().value);
 const headers=new Headers(request.headers);headers.set('origin',env.CONTACT_ORIGIN);headers.set('x-test-ingress-ip','192.0.2.1');
 for(const name of [...headers.keys()])if(name.startsWith('x-test-')&&name!=='x-test-ingress-ip')headers.delete(name);
 if(['rejection','timeout','failure','conflict'].includes(env.LOCAL_SCENARIO))headers.set('x-test-provider',env.LOCAL_SCENARIO);
 return tested.fetch(new Request(request,{headers,cf:{testTrustedIngress:true}}),env);
}};

// Isolated synthetic entrypoint. Never deploy as the production Worker.
import fixture from '../.cache/contact-cpu/fixture.json';
import {createProductionContact} from './contact-production.js';
export {ContactBudget} from '../server/contact-budget.js';
const deny=()=>Response.json({accepted:false},{status:403});
// Defense in depth: this isolate cannot use native outbound fetch.
globalThis.fetch=()=>{throw new Error('Synthetic harness forbids outbound network');};
export async function syntheticNetwork(url,options){
 if(options?.method!=='POST')throw new Error('Unexpected synthetic request');
 if(url==='https://challenges.cloudflare.com/turnstile/v0/siteverify'){
  const body=JSON.parse(options.body);
  if(body.secret!=='synthetic-turnstile'||body.response!=='synthetic-token')throw new Error('Unexpected verification');
  return Response.json({success:true,hostname:'contact.example.test',action:'contact_us'});
 }
 if(url==='https://api.resend.com/emails')return Response.json({id:'00000000-0000-4000-8000-000000000001'});
 throw new Error('Unexpected synthetic destination');
}
export default {async fetch(request,env){
 if(request.method!=='POST'||new URL(request.url).pathname!=='/api/contact/'||Date.now()>fixture.expires)return deny();
 if(Number(request.headers.get('content-length'))>262144)return deny();
 const reader=request.body?.getReader();if(!reader)return deny();
 let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();return deny();}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const body=new TextDecoder().decode(bytes);
 const sample=fixture.bodies.indexOf(body);if(sample<0)return deny();
 // Only synthetic settings and this Worker's own namespace enter the production factory.
 const settings={...fixture.settings,CONTACT_BUDGET:env.CPU_BUDGET};
 const synthetic=new Request('https://contact.example.test/api/contact/',{method:'POST',headers:{Origin:'https://contact.example.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body,cf:{colo:'SYN',tlsVersion:'TLSv1.3'}});
 const worker=createProductionContact({fetch:syntheticNetwork,attestIngress:r=>r===synthetic});
 const response=await worker.fetch(synthetic,settings);
 // Non-sensitive label only; no bodies, keys, provider payloads or visitor data.
 console.log(JSON.stringify({sample:sample+1}));
 return response;
}};

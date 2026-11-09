import {demoArmed,demoEndpoint,digest,equal} from './contact-demo.js';
const reply=(granted,status)=>Response.json({granted},{status,headers:{'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'",'X-Content-Type-Options':'nosniff'}});
export async function demoClaimEndpoint(request,env){
 try{
  if(request.url!==demoEndpoint||request.method!=='POST'||!demoArmed(env)||env.CONTACT_ENABLED!=='false')return reply(false,403);
  // No CORS allowance, origin-based authentication or browser-supplied identity.
  const bearer=request.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(bearer)||!equal(await digest(bearer.slice(7)),env.CONTACT_DEMO_BRIDGE_SHA256)||
   !equal(request.headers.get('x-contact-demo-hash'),env.CONTACT_DEMO_TOKEN_SHA256))return reply(false,403);
  const stub=env.CONTACT_BUDGET.get(env.CONTACT_BUDGET.idFromName('evc-contact-global-budget-v1'));
  const granted=await stub.claimDemo(env.CONTACT_DEMO_TOKEN_SHA256);
  return reply(granted===true,granted===true?200:403);
 }catch{return reply(false,503);}
}

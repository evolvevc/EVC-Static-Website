// Shared server-only demo contract. No public setting is an authorization credential.
export const demoOrigin='https://evolve-vc.vercel.app';
export const demoEndpoint='https://evc-contact-production-disabled.evolvevc-2024.workers.dev/api/contact-demo/claim/';
export function demoArmed(env){
 const until=Date.parse(env?.CONTACT_DEMO_UNTIL);
 return env?.CONTACT_DEMO_ENABLED==='1'&&Number.isFinite(until)&&until>Date.now()&&until<=Date.now()+1800000&&/^[a-f0-9]{64}$/.test(env.CONTACT_DEMO_TOKEN_SHA256||'');
}
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;let n=0;for(let i=0;i<64;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
export async function demoAuthorized(req,env){
 if(!demoArmed(env)||env.VERCEL!=='1'||env.VERCEL_ENV!=='production'||!env.VERCEL_DEPLOYMENT_ID||
 (env.VERCEL_TARGET_ENV!==undefined&&env.VERCEL_TARGET_ENV!=='production')||
 env.CONTACT_PREVIEW_GMAIL_TEST!==undefined||env.CONTACT_LOCAL_ACCOUNT_TEST!==undefined||
 (env.CONTACT_DELIVERY_MODE??'attachment')!=='attachment'||env.CONTACT_FROM!=='onboarding@resend.dev'||
 env.CONTACT_ORIGIN!==demoOrigin||req.headers.get('origin')!==demoOrigin||new URL(req.url).origin!==demoOrigin)return false;
 const token=req.headers.get('x-contact-demo-token')||'';
 return /^[A-Za-z0-9_-]{43,128}$/.test(token)&&equal(await digest(token),env.CONTACT_DEMO_TOKEN_SHA256);
}
export async function claimDemo(env,network=fetch){
 if(!demoArmed(env)||!/^[A-Za-z0-9_-]{43,128}$/.test(env.CONTACT_DEMO_BRIDGE_TOKEN||''))return false;
 try{
  const r=await network(demoEndpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(4000),headers:{Authorization:'Bearer '+env.CONTACT_DEMO_BRIDGE_TOKEN,'X-Contact-Demo-Hash':env.CONTACT_DEMO_TOKEN_SHA256}});
  if(r.status!==200){void r.body?.cancel();return false;}
  const reader=r.body?.getReader();if(!reader)return false;let text='',size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024)return false;text+=new TextDecoder().decode(value);}return JSON.parse(text).granted===true;}finally{void reader.cancel().catch(()=>{});}
 }catch{return false;}
}

import {contactEndpoint} from '../src/js/contact-endpoint.js';
export const contactBrowserOrigin='https://evolve-vc.vercel.app';
// CORS is a browser response policy, not an ingress attestation or authorization.
export async function contactCors(request,env,next) {
 if(!env?.CONTACT_ENDPOINT)return next();
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','Vary':'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'};
 const deny=status=>Response.json({accepted:false},{status,headers});
 try {
  const endpoint=contactEndpoint(env.CONTACT_ENDPOINT);
  if(env.CONTACT_ORIGIN!==contactBrowserOrigin)return deny(503);
  if(request.url!==endpoint)return deny(404);
  if(request.headers.get('Origin')!==contactBrowserOrigin)return deny(403);
  headers['Access-Control-Allow-Origin']=contactBrowserOrigin;
  if(request.method==='OPTIONS') {
   if(request.headers.get('Access-Control-Request-Method')!=='POST'||
    (request.headers.get('Access-Control-Request-Headers')||'').trim().toLowerCase()!=='content-type')return deny(403);
   return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'}});
  }
  const result=await next();
  const out=new Response(result.body,result);
  for(const [k,v]of Object.entries(headers))out.headers.set(k,v);
  return out;
 }catch{return deny(503);}
}

import {isIP} from 'node:net';
import {contactEndpoint} from '../src/js/contact-endpoint.js';
// Trust contracts and mandatory account audit: docs/contact-worker-production.md.
// Policy selection is server-only, not a client credential. Local tests cannot
// prove edge header injection or audit account bindings. Defaults remain closed.
export function directContactIngress(request,env) {
 try {
  // Opt-in platform-header contract; requires the no-service-bindings audit.
  // CF-Worker is added by Cloudflare to ALL fetch subrequests, not supplied
  // by the browser as an authorization credential. Presence always rejects.
  if(env?.CONTACT_ENDPOINT) {
   if(env.CONTACT_INGRESS_POLICY!=='direct-workers-dev-v1'||
    request.url!==contactEndpoint(env.CONTACT_ENDPOINT)||
    !request.cf||typeof request.cf.colo!=='string'||!request.cf.colo||
    !['TLSv1.2','TLSv1.3'].includes(request.cf.tlsVersion)||
    request.headers.has('cf-worker')||request.headers.has('cf-connecting-ipv6'))return false;
   const ip=request.headers.get('cf-connecting-ip');
   if(typeof ip!=='string'||ip.trim()!==ip||!isIP(ip))return false;
   // Reject cross-zone Worker identity even if its other marker is absent.
   const canonical=isIP(ip)===6?new URL('http://['+ip+']/').hostname.slice(1,-1):ip;
   return canonical!=='2a06:98c0:3600::103';
  }
  if(env?.CONTACT_INGRESS_POLICY!=='direct-zone-waf-v1')return false;
  const url=new URL(request.url),origin=new URL(env.CONTACT_ORIGIN);
  return origin.protocol==='https:'&&origin.origin===env.CONTACT_ORIGIN&&url.origin===origin.origin&&
   url.pathname==='/api/contact/'&&request.cf!==undefined&&request.cf!==null&&
   typeof request.cf.colo==='string'&&request.cf.colo.length>0&&
   ['TLSv1.2','TLSv1.3'].includes(request.cf.tlsVersion)&&
   !request.headers.has('cf-worker')&&!request.headers.has('cf-connecting-ipv6');
 }catch{return false;}
}

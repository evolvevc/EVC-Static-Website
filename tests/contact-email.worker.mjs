import {contactPrivateKey} from '../server/contact-private-key.js';
import {decryptContact} from '../server/contact-payload.js';
import {contactEmail} from '../server/contact-email-render.js';
import logo from '../build-inputs/logo.png';
export default {
 async fetch(_request,env) {
  try {
   const fixture=JSON.parse(env.FIXTURE);
   const key={kid:'worker-ephemeral',bytes:256};
   const adapter=contactPrivateKey(env,{kid:key.kid});
   const fields=await decryptContact(fixture.envelope,key,adapter);
   const mail=contactEmail(fields,fixture.envelope.id,logo);
   let rejected=0;
   for(const item of [fixture.invalidConsent,{...fixture.envelope,id:crypto.randomUUID()}, {...fixture.envelope,ct:fixture.envelope.ct.slice(0,-4)+'AAAA'}]) {
    try {await decryptContact(item,key,adapter);} catch {rejected++;}
   }
   if(rejected!==3) throw new Error('Validation failed');
   return Response.json({mail,rejected,runtime:'workerd',cpuMs:null});
  } catch {return Response.json({error:'Local renderer check failed'},{status:500});}
 }
};

// Node-only one-shot bridge. Never import into a Worker or website entry.
import {createInterface} from 'node:readline/promises';
import {pathToFileURL} from 'node:url';
import {startContactBrowser} from './browser-local.mjs';
export const approval='AUTHORIZE ONE EMAIL TO evolvevc.2024@gmail.com';
export function oneEmailGate({credential,send=globalThis.fetch,now=Date.now}={}) {
 let armedUntil=0,approved=false,spent=false;
 const denied=()=>Response.json({accepted:false},{status:503});
 return Object.freeze({
  arm(phrase){if(approved||phrase!==approval||typeof credential!=='string'||!credential||credential.length>4096||/\s/.test(credential))return false;approved=true;armedUntil=now()+300000;return true;},
  async deliver(request){
   if(!approved||spent||now()>armedUntil)return denied();
   try {
    if(request.url!=='https://api.resend.com/emails'||request.method!=='POST')return denied();
    const text=await request.text();if(new TextEncoder().encode(text).byteLength>262144)return denied();
    const mail=JSON.parse(text),id=request.headers.get('Idempotency-Key');
    if(mail.from!=='onboarding@resend.dev'||JSON.stringify(mail.to)!=='["contact@evolvevcap.com"]'||!/^contact\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id??''))return denied();
    // Consume synchronously immediately before network; concurrent calls cannot send.
    if(spent||now()>armedUntil)return denied();spent=true;
    return await send('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({...mail,to:['evolvevc.2024@gmail.com']})});
   }catch{return denied();}
  }
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // Remove before starting any child runtime. Never read .env files for credentials.
 const credential=process.env.EVC_LOCAL_RESEND_KEY;delete process.env.EVC_LOCAL_RESEND_KEY;
 if(!process.stdin.isTTY||!credential){console.error('Interactive terminal and runtime credential required. Nothing sent.');process.exitCode=1;}
 else {
  let app,terminal;
  try {
   const gate=oneEmailGate({credential});app=await startContactBrowser({port:8788,localDelivery:r=>gate.deliver(r)});
   console.log('Local form: '+app.origin+'/contact-us/');
   console.log('Prepare synthetic fields without submitting. Sender: onboarding@resend.dev. Recipient: evolvevc.2024@gmail.com.');
   terminal=createInterface({input:process.stdin,output:process.stdout});
   const answer=await terminal.question('To authorize ONE provider attempt within five minutes, type exactly:\n'+approval+'\n');
   terminal.close();terminal=undefined;
   if(!gate.arm(answer)){await app.close();console.log('Not authorized. Nothing sent.');}
   else {console.log('One attempt armed. Submit once; never retry an uncertain result. Ctrl+C stops the server.');const stop=async()=>{await app.close();process.exit(0);};process.once('SIGINT',stop);process.once('SIGTERM',stop);}
  }catch{terminal?.close();if(app)await app.close();console.error('Local preparation failed. No automatic retry.');process.exitCode=1;}
 }
}

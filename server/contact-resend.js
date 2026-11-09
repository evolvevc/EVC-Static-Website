// Server-only fetch-compatible adapter. Invoke only after the budget's exclusive grant.
// One attempt per invocation; durable deduplication remains the orchestrator's responsibility.
const URL='https://api.resend.com/emails';
const recipient='evolvevc.2024@gmail.com';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const receiptId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(status,id)=>Response.json(id?{id}:{error:status===409?'uncertain':status===503?'unavailable':'rejected'},{status,headers:{'Cache-Control':'no-store'}});
export function contactResend(env,{fetch:send=globalThis.fetch,timeoutMs=8000}={}) {
 const secret=env?.RESEND_API_KEY,from=env?.CONTACT_FROM;
 const configured=typeof secret==='string'&&secret.length>0&&secret.length<=4096&&!/\s/.test(secret)&&
  typeof from==='string'&&from.trim()===from&&from.length>0&&from.length<=320&&!/[\u0000-\u001f\u007f]/.test(from)&&
  typeof send==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=10000;
 return async function transport(url,options={}) {
  if(!configured)return reply(503);
  let body,submission;
  try {
   if(url!==URL||options.method!=='POST'||typeof options.body!=='string'||options.body.length>262144) return reply(503);
   if(new TextEncoder().encode(options.body).byteLength>262144)return reply(503);
   const headers=new Headers(options.headers);
   submission=headers.get('Idempotency-Key')?.slice(8);
   if(!uuid.test(submission??'')||headers.get('Idempotency-Key')!=='contact/'+submission)return reply(503);
   const mail=JSON.parse(options.body);
   if(!mail||Object.keys(mail).sort().join(',')!=='attachments,from,html,subject,text,to'||mail.from!==from||!Array.isArray(mail.to)||mail.to.length!==1||mail.to[0]!==recipient)return reply(503);
   if(mail.subject!=='New client enquiry | Evolve Venture Capital'||typeof mail.html!=='string'||!mail.html||typeof mail.text!=='string'||!mail.text)return reply(503);
   if(!Array.isArray(mail.attachments)||mail.attachments.length!==1)return reply(503);
   const logo=mail.attachments[0];
   if(!logo||Object.keys(logo).sort().join(',')!=='content,content_id,content_type,filename'||logo.filename!=='evc-logo.png'||logo.content_id!=='evc-logo'||logo.content_type!=='image/png'||typeof logo.content!=='string')return reply(503);
   const decoded=atob(logo.content);
   if(btoa(decoded)!==logo.content||!decoded.startsWith('\x89PNG\r\n\x1a\n'))return reply(503);
   body=JSON.stringify({...mail,from,to:[recipient]});
  }catch{return reply(503);}
  const controller=new AbortController();let timer,reader,resolveAbort;
  const cancel=()=>{if(reader)void reader.cancel().catch(()=>{});};
  const aborted=new Promise(resolve=>{resolveAbort=resolve;});
  const abort=()=>{controller.abort();cancel();resolveAbort(reply(503));};
  if(options.signal?.aborted)return reply(503);
  options.signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(abort,timeoutMs);
  const attempt=(async()=>{
   try {
    const response=await send(URL,{method:'POST',redirect:'manual',signal:controller.signal,
     headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json','Idempotency-Key':'contact/'+submission},body});
    if(controller.signal.aborted){void response.body?.cancel().catch(()=>{});return reply(503);}
    reader=response.body?.getReader();
    // Unknown provider outcome: never follow or retry a redirect.
    if(response.status>=300&&response.status<400)return reply(503);
    if([400,401,403,404,422,429].includes(response.status))return reply(response.status);
    if(response.status===409)return reply(409);
    if(response.status!==200||!reader||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||Number(response.headers.get('content-length'))>8192)return reply(503);
    const chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(controller.signal.aborted)return reply(503);if(done)break;size+=value.byteLength;if(size>8192)return reply(503);chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    return result&&typeof result.id==='string'&&receiptId.test(result.id)&&!('error' in result)&&!('message' in result)?reply(200,result.id):reply(503);
   }catch{return reply(503);}
   finally{cancel();}
  })();
  try{return await Promise.race([attempt,aborted]);}
  finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
 };
}

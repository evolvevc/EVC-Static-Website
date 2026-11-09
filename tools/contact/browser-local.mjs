// Loopback-only manual test server. No .env/config secrets loaded, no disk key writes.
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,basename,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {load} from 'cheerio';
import {handle as legacy} from '../../api/contact.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const b64=b=>Buffer.from(b).toString('base64');
const fakeScript=`globalThis.turnstile={render(_container,options){this.options=options;return 'local-widget';},execute(){const o=this.options;queueMicrotask(()=>o.callback('local-synthetic-'+crypto.randomUUID()));},remove(){}};`;
export async function startContactBrowser({port=8787,mode='readable',scenario='success',localDelivery}={}){
 if(!['readable','attachment'].includes(mode)||!['success','rejection','timeout','failure','conflict','turnstile','wrong-key'].includes(scenario))throw new Error('Invalid local scenario');
 const original=readFileSync(resolve(root,'dist/contact-us/index.html'),'utf8');
 const generate=()=>crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
 const [pair,old]=await Promise.all([generate(),generate()]);
 const pub=async(p,kid)=>b64(JSON.stringify({...await crypto.subtle.exportKey('jwk',p.publicKey),kid}));
 const readable=await pub(pair,'local-readable'),attachment=await pub(old,'local-attachment');
 if(localDelivery && (mode!=='readable'||scenario!=='success'||typeof localDelivery!=='function'))throw new Error('Invalid local delivery');
 const env={CONTACT_ENABLED:'true',CONTACT_DELIVERY_MODE:'readable-orchestrated',CONTACT_READABLE_KID:'local-readable',CONTACT_TO:'contact@evolvevcap.com',CONTACT_ORIGIN:'https://contact.example.test',CONTACT_FROM:localDelivery?'onboarding@resend.dev':'test@example.test',RESEND_API_KEY:'synthetic-only',CONTACT_VISITOR_HASH_SECRET:'synthetic-visitor-secret-never-production',CONTACT_PUBLIC_JWK:attachment,CONTACT_READABLE_PUBLIC_JWK:readable,CONTACT_READABLE_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\n'+b64(await crypto.subtle.exportKey('pkcs8',pair.privateKey))+'\n-----END PRIVATE KEY-----',CONTACT_TURNSTILE_SECRET:'synthetic-only',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us',LOCAL_SCENARIO:scenario};
 const bundle=await build({entryPoints:[resolve(root,localDelivery?'tests/contact-one-email.worker.mjs':'tests/contact-browser.worker.mjs')],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers','node:crypto','node:net'],loader:{'.png':'binary'},logLevel:'silent'});
 let mf,origin;
 const csp="default-src 'none'; script-src 'self' 'inline-speculation-rules'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
 const server=createServer(async(req,res)=>{
  const finish=(status,body,type='text/plain')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff'});res.end(body);};
  try {
   if(req.headers.host!==new URL(origin).host)return finish(403,'Forbidden');
   const path=new URL(req.url,origin).pathname;
   if(path==='/api/contact/'){
    if(req.method!=='POST')return finish(405,'{"accepted":false}','application/json');
    if(req.headers.origin!==origin)return finish(403,'{"accepted":false}','application/json');
    const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>262144)return finish(413,'{"accepted":false}','application/json');chunks.push(chunk);}
    const request=new Request(origin+path,{method:'POST',headers:req.headers,body:Buffer.concat(chunks)});
    const response=mode==='attachment'?await legacy(request,{...env,CONTACT_ORIGIN:origin,CONTACT_DELIVERY_MODE:'attachment'},async()=>Response.json({id:'local-only-receipt'})):await mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});
    return finish(response.status,await response.text(),'application/json');
   }
   if(req.method!=='GET')return finish(405,'Method not allowed');
   if(path==='/local-turnstile.js')return finish(200,fakeScript,'text/javascript');
   if(path==='/contact-us/'){
    const $=load(original);const form=$('form[data-secure-form="contact"]');
    form.attr('data-contact-key',mode==='readable'?readable:attachment).attr('data-success',localDelivery?'Test enquiry accepted by the email provider. Check the authorized mailbox.':'Synthetic enquiry accepted by the local simulator. No email sent.');
    form.removeAttr('data-contact-mode data-contact-kid data-turnstile-sitekey data-contact-endpoint');
    if(mode==='readable'){
     form.attr('data-contact-mode','readable-orchestrated').attr('data-contact-kid',scenario==='wrong-key'?'wrong':'local-readable').attr('data-turnstile-sitekey','local-public-sitekey');
     form.find('button[type=submit]').before('<div data-contact-turnstile></div>');$('head').append('<script src="/local-turnstile.js"></script>');
    }
    form.prepend(localDelivery?'<p role="note">LOCAL ONE-EMAIL TEST — synthetic details only. Terminal approval is required. Recipient: evolvevc.2024@gmail.com.</p>':'<p role="note">LOCAL SIMULATION — synthetic details only. No email is sent.</p>');
    return finish(200,$.html(),'text/html');
   }
   let file=resolve(root,'dist','.'+decodeURIComponent(path));if(path.endsWith('/'))file=resolve(file,'index.html');
   const dist=resolve(root,'dist');if(!file.startsWith(dist+sep))return finish(404,'Not found');
   if(path.startsWith('/assets/js/')&&existsSync(resolve(root,'src/js',basename(path))))file=resolve(root,'src/js',basename(path));
   if(!existsSync(file))return finish(404,'Not found');
   const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.jpg':'image/jpeg'};
   return finish(200,readFileSync(file),types[extname(file)]??'application/octet-stream');
  }catch{return finish(503,'{"accepted":false}','application/json');}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
 try {mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',compatibilityFlags:['nodejs_compat'],host:'127.0.0.1',port:0,inspectorPort:0,log:new Log(LogLevel.NONE),bindings:{...env,LOCAL_ORIGIN:origin},...(localDelivery?{serviceBindings:{LOCAL_DELIVERY:localDelivery}}:{}),durableObjects:{CONTACT_BUDGET:{className:'ContactBudget',useSQLite:true}},outboundService:()=>{throw new Error('External network disabled');}}));await mf.ready;}catch{server.close();if(mf)await mf.dispose();throw new Error('Local Worker unavailable');}
 return {origin,close:async()=>{await new Promise(resolve=>server.close(resolve));await mf.dispose();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const app=await startContactBrowser({mode:process.argv.includes('--attachment')?'attachment':'readable',scenario:process.argv.find(v=>v.startsWith('--scenario='))?.split('=')[1]??'success'});
 console.log('Local synthetic Contact test: '+app.origin+'/contact-us/');
 const stop=async()=>{await app.close();process.exit(0);};process.once('SIGINT',stop);process.once('SIGTERM',stop);
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('ingress guard runs offline in workerd; no outbound requests',{timeout:30000},async t=>{
 const bundle=await build({stdin:{contents:`import {directContactIngress} from './server/contact-ingress.js';
 export default {fetch(){
  const endpoint='https://contact.synthetic.workers.dev/api/contact/';
  const env={CONTACT_ENDPOINT:endpoint,CONTACT_INGRESS_POLICY:'direct-workers-dev-v1'};
  const results=[{}, {'CF-Worker':'attacker'}, {'CF-Connecting-IP':'2a06:98c0:3600:0:0:0:0:0103'}, {'CF-Connecting-IPv6':'2001:db8::1'}].map(headers=>{
   const r=new Request(endpoint,{headers:{'CF-Connecting-IP':'192.0.2.10',...headers}});
   Object.defineProperty(r,'cf',{value:{colo:'LHR',tlsVersion:'TLSv1.3'}});
   return directContactIngress(r,env);
  });return Response.json(results);
 }};`,resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'esm',external:['node:net'],logLevel:'silent'});
 let outbound=0;const logs=[];class Capture extends Log{logWithLevel(_level,message){logs.push(String(message));}}
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',compatibilityFlags:['nodejs_compat'],host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.ERROR),outboundService:()=>{outbound++;throw Error('Network disabled');}}));
 t.after(()=>mf.dispose());await mf.ready;
 assert.deepEqual(await (await mf.dispatchFetch('http://localhost/')).json(),[true,false,false,false]);assert.equal(outbound,0);
 assert.ok(logs.every(message=>!message.includes('192.0.2.10')));
});

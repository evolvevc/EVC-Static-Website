import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {cases} from './contact-resend-cases.mjs';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('all offline Resend cases in workerd without Node compatibility', {timeout:30000},async t=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('./contact-resend.worker.mjs',import.meta.url))],bundle:true,write:false,platform:'browser',format:'esm',logLevel:'silent'});
 const logs=[]; class Capture extends Log {logWithLevel(_level,message){logs.push(String(message));}}
 let outbound=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.DEBUG),outboundService:()=>{outbound++;throw new Error('Network disabled');}}));
 t.after(()=>mf.dispose()); await mf.ready;
 const response=await mf.dispatchFetch('http://localhost/test');
 assert.equal(response.status,200); assert.deepEqual(await response.json(),{passed:cases.length});
 assert.equal(outbound,0);
 for(const marker of ['synthetic-server-secret','raw-provider-marker','Synthetic Visitor']) assert.equal(logs.join('\n').includes(marker),false);
 t.diagnostic(`${cases.length} offline cases passed in workerd; zero outbound requests.`);
});

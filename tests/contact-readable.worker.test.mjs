import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('full readable orchestration with SQLite DO RPC in workerd',{timeout:60000},async t=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('./contact-readable.worker.mjs',import.meta.url))],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers','node:crypto'],loader:{'.png':'base64'},logLevel:'silent'});
 const logs=[];class Capture extends Log{logWithLevel(_level,message){logs.push(String(message));}}
 let outbound=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',compatibilityFlags:['nodejs_compat'],host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.DEBUG),durableObjects:{BUDGET:{className:'ReadableBudgetTest',useSQLite:true}},outboundService:()=>{outbound++;throw new Error('Network disabled');}}));
 t.after(()=>mf.dispose());await mf.ready;
 const start=performance.now();const response=await mf.dispatchFetch('http://localhost/test');const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.passed.length,18);assert.equal(outbound,0);
 for(const marker of ['Synthetic Visitor','synthetic-resend-secret','synthetic-token','BEGIN PRIVATE KEY','visitor@example.test'])assert.equal(logs.join('\n').includes(marker),false);
 t.diagnostic(`18 scenarios passed in workerd with SQLite DO RPC; ${(performance.now()-start).toFixed(2)} ms wall-clock for complete workload, not CPU. Zero outbound requests.`);
});

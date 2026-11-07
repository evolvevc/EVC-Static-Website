import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {build} from 'esbuild';
import {cases} from './contact-budget-cases.mjs';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('SQLite Durable Object cases and concurrent RPC in isolated workerd',{timeout:60000},async t=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('./contact-budget.worker.mjs',import.meta.url))],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers'],logLevel:'silent'});
 const logs=[];class Capture extends Log{logWithLevel(_level,message){logs.push(String(message));}}
 let outbound=0;
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-06',host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.DEBUG),durableObjects:{BUDGET:{className:'BudgetTest',useSQLite:true,unsafeUniqueKey:'budget'},SUITE:{className:'BudgetTest',useSQLite:true,unsafeUniqueKey:'suite'}},outboundService:()=>{outbound++;throw new Error('Network disabled');}}));
 t.after(()=>mf.dispose());await mf.ready;
 const started=performance.now();const response=await mf.dispatchFetch('http://localhost/test');const result=await response.json();
 assert.equal(response.status,200);assert.deepEqual(result,{cases:cases.length,reserved:5,grants:1,closed:true,scheduled:true});assert.equal(outbound,0);
 for(const marker of ['192.0.2.1','synthetic-memory-only-secret-32-chars'])assert.equal(logs.join('\n').includes(marker),false);
 t.diagnostic(`${cases.length} SQLite cases plus 20 concurrent reservations and 20 claims; wall-clock ${(performance.now()-started).toFixed(2)} ms for full suite, not CPU.`);
 t.diagnostic('Zero outbound requests. Production CPU/free quotas remain unverified.');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {cpuFixtures} from '../tools/contact/cpu-fixtures.mjs';
const require=createRequire(import.meta.url);
const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
test('isolated CPU harness: three max-valid RSA-3072 samples, replay and unknown fixture denied, no network',{timeout:60000},async t=>{
 const fixture=cpuFixtures();
 const config=JSON.parse(readFileSync(new URL('../wrangler.contact-cpu.json',import.meta.url)));
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.deepEqual(config.routes,[]);
 const production=JSON.parse(readFileSync(new URL('../wrangler.contact-production.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
 assert.equal(production.vars.CONTACT_ENABLED,'false');assert.equal(production.vars.CONTACT_INGRESS_POLICY,'unverified');
 assert.equal(Buffer.from(JSON.parse(Buffer.from(fixture.settings.CONTACT_READABLE_PUBLIC_JWK,'base64')).n,'base64url').length,384);
 const bundle=await build({entryPoints:['workers/contact-cpu.js'],bundle:true,write:false,platform:'browser',format:'esm',external:['cloudflare:workers','node:crypto','node:net'],loader:{'.png':'binary'},plugins:[{name:'in-memory-fixture',setup(b){b.onResolve({filter:/fixture\.json$/},()=>({path:'fixture',namespace:'synthetic'}));b.onLoad({filter:/.*/,namespace:'synthetic'},()=>({contents:JSON.stringify(fixture),loader:'json'}));}}]});
 let outbound=0;const logs=[];class Capture extends Log{logWithLevel(_level,message){logs.push(String(message));}}
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,host:'127.0.0.1',port:0,inspectorPort:0,log:new Capture(LogLevel.DEBUG),durableObjects:{CPU_BUDGET:{className:'ContactBudget',useSQLite:true}},outboundService:()=>{outbound++;throw Error('Network forbidden');}}));
 t.after(()=>mf.dispose());await mf.ready;
 const call=body=>mf.dispatchFetch('http://localhost/api/contact/',{method:'POST',body});
 for(const body of fixture.bodies){const r=await call(body);assert.equal(r.status,202);assert.deepEqual(await r.json(),{accepted:true});}
 assert.equal((await call(fixture.bodies[0])).status,409);
 assert.equal((await call('{}')).status,403);
 assert.equal(outbound,0);
 for(const marker of ['BEGIN PRIVATE KEY','synthetic-hmac','synthetic-token','sender@example.test'])assert.equal(logs.join('\n').includes(marker),false);
 t.diagnostic('Three synthetic accepted paths; replay/unknown denied; zero native outbound calls. No CPU measurement claimed.');
});

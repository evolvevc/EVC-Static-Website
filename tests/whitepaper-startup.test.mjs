import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validWhitepaperHmac,validWhitepaperUrl,whitepaperMethodNotAllowed} from '../server/whitepaper.js';

// Evaluate the actual API module with the submission handler replaced by a spy.
// Only import/export syntax is adapted for the isolated VM; no network or env loading.
const source=readFileSync(new URL('../api/whitepaper.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/,'').replace('export default','globalThis.endpoint =');
const dummy={VERCEL_ENV:'production',WHITEPAPER_HMAC_SECRET:'a'.repeat(64),WHITEPAPER_APPS_SCRIPT_URL:'https://script.google.com/macros/s/dummy/exec'};
test('startup logs fixed codes once per instance; GET never calls submission handler',async()=>{
  for(const [patch,expected] of [
    [{},['WP_STARTUP_CONFIG_FORMAT_VALID']],
    [{WHITEPAPER_HMAC_SECRET:''},['WP_STARTUP_HMAC_FORMAT_INVALID']],
    [{WHITEPAPER_HMAC_SECRET:'synthetic invalid'},['WP_STARTUP_HMAC_FORMAT_INVALID']],
    [{WHITEPAPER_APPS_SCRIPT_URL:''},['WP_STARTUP_URL_FORMAT_INVALID']],
    [{WHITEPAPER_APPS_SCRIPT_URL:dummy.WHITEPAPER_APPS_SCRIPT_URL+'?x=1'},['WP_STARTUP_URL_FORMAT_INVALID']],
    [{WHITEPAPER_HMAC_SECRET:'',WHITEPAPER_APPS_SCRIPT_URL:''},['WP_STARTUP_HMAC_FORMAT_INVALID','WP_STARTUP_URL_FORMAT_INVALID']],
    [{VERCEL_ENV:'preview'},[]]
  ]) {
    const logs=[];let handlerCalls=0;
    const context=vm.createContext({process:{env:{...dummy,...patch}},console:{error:(...args)=>logs.push(args)},validWhitepaperHmac,validWhitepaperUrl,whitepaperMethodNotAllowed,handle:()=>{handlerCalls++;return 'POST forwarded';},fetch:()=>{throw Error('Network forbidden');}});
    vm.runInContext(source,context);
    assert.deepEqual(logs,expected.map(code=>[code]));
    for(let i=0;i<2;i++) {
      const result=await context.endpoint.fetch({method:'GET'});
      assert.equal(result.status,405);assert.deepEqual(await result.json(),{state:'rejected'});
      assert.equal(result.headers.get('Cache-Control'),'no-store');
      assert.equal(result.headers.get('X-Content-Type-Options'),'nosniff');
    }
    assert.equal(handlerCalls,0);assert.deepEqual(logs,expected.map(code=>[code]));
    assert.equal(context.endpoint.fetch({method:'POST'}),'POST forwarded');assert.equal(handlerCalls,1);
  }
});

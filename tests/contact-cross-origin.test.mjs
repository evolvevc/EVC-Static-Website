import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactEndpoint} from '../src/js/contact-endpoint.js';
import {contactCors,contactBrowserOrigin} from '../server/contact-cors.js';
import {directContactIngress} from '../server/contact-ingress.js';
const endpoint='https://synthetic-contact.example.workers.dev/api/contact/';
const env={CONTACT_ENDPOINT:endpoint,CONTACT_ORIGIN:contactBrowserOrigin};
const request=(method='POST',headers={},url=endpoint)=>new Request(url,{method,headers:{Origin:contactBrowserOrigin,...headers}});
test('explicit endpoint validates; attachment/local path remains default',()=>{
 assert.equal(contactEndpoint(),'/api/contact/');assert.equal(contactEndpoint(endpoint),endpoint);
 for(const value of ['http://test.workers.dev/api/contact/','https://evil.test/api/contact/',endpoint+'?x=1',endpoint+'#x',endpoint.replace('https://','https://user@'),endpoint.replace('/api/contact/','/wrong')])assert.throws(()=>contactEndpoint(value));
});
test('preflight is restricted and never invokes delivery',async()=>{
 let calls=0;const next=()=>{calls++;throw Error('must not invoke');};
 const valid={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'};
 const ok=await contactCors(request('OPTIONS',valid),env,next);assert.equal(ok.status,204);assert.equal(ok.headers.get('Access-Control-Allow-Origin'),contactBrowserOrigin);assert.equal(ok.headers.get('Access-Control-Allow-Credentials'),null);assert.equal(ok.headers.get('Cache-Control'),'no-store');
 for(const headers of [{...valid,Origin:'https://evil.test'},{...valid,'Access-Control-Request-Method':'GET'},{...valid,'Access-Control-Request-Headers':'content-type, authorization'},{...valid,Origin:'null'}])assert.equal((await contactCors(request('OPTIONS',headers),env,next)).status,403);
 assert.equal(calls,0);
});
test('allowed POST preserves status/body and exposes only fixed CORS origin',async()=>{
 for(const status of [202,400,403,405,413,415,429,503]){
 const result=await contactCors(request(),env,()=>Response.json({accepted:status===202},{status}));assert.equal(result.status,status);assert.deepEqual(await result.json(),{accepted:status===202});assert.equal(result.headers.get('Access-Control-Allow-Origin'),contactBrowserOrigin);
 }
 const bad=await contactCors(request('POST',{Origin:'https://evil.test'}),env,()=>assert.fail());assert.equal(bad.status,403);assert.equal(bad.headers.get('Access-Control-Allow-Origin'),null);
 assert.equal((await contactCors(request('POST',{},endpoint+'extra'),env,()=>assert.fail())).status,404);
 assert.equal((await contactCors(request(),{...env,CONTACT_ORIGIN:'https://evil.test'},()=>assert.fail())).status,503);
});
test('workers.dev cannot acquire ingress trust by setting enablement or old policy',()=>{
 for(const headers of [{},{'CF-Worker':'evil.test'},{'CF-Connecting-IP':'2a06:98c0:3600::103'}])assert.equal(directContactIngress(request('POST',headers),{...env,CONTACT_ENABLED:'true',CONTACT_INGRESS_POLICY:'direct-zone-waf-v1'}),false);
});

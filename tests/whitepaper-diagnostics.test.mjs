import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../server/whitepaper.js';

const origin = 'https://evolvevcap.com';
const env = {WHITEPAPER_ORIGIN:origin,WHITEPAPER_HMAC_SECRET:'a'.repeat(64),WHITEPAPER_APPS_SCRIPT_URL:'https://script.google.com/macros/s/private-deployment/exec'};
const request = () => new Request(origin+'/api/whitepaper/', {method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Private Name',company:'Private Company',email:'private@example.com',resourceId:'WP01',consent:true})});
const response = state => async (_,options) => Response.json({requestId:JSON.parse(options.body).requestId,state,admin:'submitted',visitor:'submitted'});

test('configuration diagnostics log one fixed code without calling upstream',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  for (const [patch,code] of [
    [{WHITEPAPER_HMAC_SECRET:''},'WP_HMAC_FORMAT_INVALID'],
    [{WHITEPAPER_HMAC_SECRET:'private-invalid-secret'},'WP_HMAC_FORMAT_INVALID'],
    [{WHITEPAPER_APPS_SCRIPT_URL:''},'WP_URL_FORMAT_INVALID'],
    [{WHITEPAPER_APPS_SCRIPT_URL:'https://private.example/secret-path'},'WP_URL_FORMAT_INVALID']
  ]) {
    logs.length=0;let calls=0;
    const result=await handle(request(),{...env,...patch},async()=>{calls++;throw Error('Must not send');});
    assert.equal(result.status,503);assert.deepEqual(await result.json(),{state:'unavailable'});
    assert.equal(calls,0);assert.deepEqual(logs,[[code]]);
  }
});

test('runtime, transport and response failures remain generic and log no exception data',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  const timeout=t.mock.method(AbortSignal,'timeout',()=>{throw Error('private runtime details');});
  let calls=0;
  let result=await handle(request(),env,async()=>{calls++;});
  assert.equal(result.status,503);assert.deepEqual(await result.json(),{state:'uncertain'});
  assert.equal(calls,0);assert.deepEqual(logs,[['WP_RUNTIME_EXCEPTION']]);timeout.mock.restore();
  const cases=[
    [async()=>{throw Error('private transport URL and personal data');},'WP_UPSTREAM_TRANSPORT_FAILURE','uncertain'],
    [async()=>new Response('private upstream body',{status:500}),'WP_UPSTREAM_RESPONSE_FAILURE','uncertain'],
    [async()=>new Response('private invalid JSON'),'WP_UPSTREAM_RESPONSE_FAILURE','uncertain'],
    [async()=>Response.json(null),'WP_UPSTREAM_RESPONSE_FAILURE','uncertain'],
    [async()=>Response.json({requestId:'private-wrong-id'}),'WP_UPSTREAM_RESPONSE_FAILURE','uncertain'],
    [response('unavailable'),'WP_UPSTREAM_RESPONSE_FAILURE','unavailable'],
    [response('rejected'),'WP_UPSTREAM_RESPONSE_FAILURE','rejected'],
    [response('private-unrecognized-state'),'WP_UPSTREAM_RESPONSE_FAILURE','uncertain']
  ];
  for(const [send,code,state] of cases) {
    logs.length=0;calls=0;
    result=await handle(request(),env,async(...args)=>{calls++;return send(...args);});
    assert.equal(result.status,503);assert.deepEqual(await result.json(),{state});
    assert.equal(calls,1);assert.deepEqual(logs,[[code]]);
  }
});

test('success, duplicate and limit responses remain unchanged without failure logs',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  for(const [state,status] of [['accepted',202],['duplicate',409],['limited',429]]) {
    const result=await handle(request(),env,response(state));
    assert.equal(result.status,status);
    assert.deepEqual(await result.json(),state==='accepted'?{state,delivery:{admin:'submitted',visitor:'submitted'}}:{state});
  }
  assert.deepEqual(logs,[]);
});

import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {contactPrivateKey} from '../server/contact-private-key.js';
import {decryptContact} from '../server/contact-payload.js';
import {contactAttempt} from '../src/js/forms.js';

const kid = 'ephemeral-readable';
let pair, other, pem, otherPem, aes, wrapped, encoded;
const fields = {'full-name':'Synthetic Visitor','your-email':'test@example.test',company:'Test',role:'Founder',message:'Synthetic only',consent:'on','lead-source':'contact-page'};
const exportPem = async key => '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await crypto.subtle.exportKey('pkcs8',key)).toString('base64') + '\n-----END PRIVATE KEY-----';
const adapter = (value = pem) => contactPrivateKey({CONTACT_READABLE_PRIVATE_KEY:value},{kid});
const wrap = raw => crypto.subtle.encrypt({name:'RSA-OAEP'},pair.publicKey,raw);
before(async () => {
  const generate = () => crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},true,['encrypt','decrypt']);
  [pair,other] = await Promise.all([generate(),generate()]);
  [pem,otherPem] = await Promise.all([exportPem(pair.privateKey),exportPem(other.privateKey)]);
  aes = crypto.getRandomValues(new Uint8Array(32));
  wrapped = await wrap(aes);
  encoded = Buffer.from(JSON.stringify({...await crypto.subtle.exportKey('jwk',pair.publicKey),kid})).toString('base64');
});

test('unwraps SHA-256 OAEP from PKCS#8, including offset byte views',async () => {
  const padded = new Uint8Array(258); padded.set(new Uint8Array(wrapped),1);
  assert.deepEqual(new Uint8Array(await adapter().unwrap(kid,padded.subarray(1,257))),aes);
});

test('imports once concurrently, non-extractably, with decrypt-only usage',async t => {
  const original = crypto.subtle.importKey.bind(crypto.subtle);
  let calls = 0, imported;
  t.mock.method(crypto.subtle,'importKey',async (...args) => {
    calls++; assert.equal(args[0],'pkcs8'); assert.equal(args[3],false);
    assert.deepEqual(args[2],{name:'RSA-OAEP',hash:'SHA-256'});
    assert.deepEqual(args[4],['decrypt']);
    imported = await original(...args); return imported;
  });
  const current = adapter();
  await Promise.all([current.unwrap(kid,wrapped),current.unwrap(kid,wrapped)]);
  await current.unwrap(kid,wrapped);
  assert.equal(calls,1); assert.equal(imported.extractable,false);
  await assert.rejects(crypto.subtle.exportKey('pkcs8',imported));
});

test('rejects mismatched kid before importing even with a missing secret',async () => {
  await assert.rejects(adapter('').unwrap('client-selected',wrapped),{message:'Unknown contact key'});
});

test('isolates adapters and snapshots the server binding for rotation',async () => {
  const env = {CONTACT_READABLE_PRIVATE_KEY:pem};
  const first = contactPrivateKey(env,{kid}); env.CONTACT_READABLE_PRIVATE_KEY = otherPem;
  const second = contactPrivateKey(env,{kid});
  assert.deepEqual(new Uint8Array(await first.unwrap(kid,wrapped)),aes);
  await assert.rejects(second.unwrap(kid,wrapped),{message:'Invalid wrapped contact key'});
});

test('rejects altered ciphertext, invalid lengths/types and non-AES-256 plaintext',async () => {
  const changed = new Uint8Array(wrapped.slice(0)); changed[10] ^= 1;
  for (const value of [changed,new Uint8Array(1),'ciphertext',await wrap(new Uint8Array(16))]) {
    await assert.rejects(adapter().unwrap(kid,value),{message:'Invalid wrapped contact key'});
  }
});

test('rejects missing secret and invalid PKCS#8 with sanitized errors',async () => {
  const bad = [undefined,'','sensitive-invalid-value','-----BEGIN RSA PRIVATE KEY-----\nAQ==\n-----END RSA PRIVATE KEY-----','-----BEGIN PRIVATE KEY-----\nAQ==\n-----END PRIVATE KEY-----'];
  for (const value of bad) {
    const current = contactPrivateKey({CONTACT_READABLE_PRIVATE_KEY:value},{kid});
    await assert.rejects(current.unwrap(kid,wrapped), error => {
      assert.equal(error.message,'Contact private key unavailable');
      assert.equal(error.code,'KMS_UNAVAILABLE'); assert.equal(error.cause,undefined); return true;
    });
  }
  assert.throws(()=>contactPrivateKey({}, {kid:'untrusted/key'}),{message:'Contact private key unavailable'});
});

test('decrypts existing browser envelope and AES-GCM payload without altering fields',async () => {
  const item = JSON.parse(await contactAttempt({form:'contact',page:'/contact-us/',at:new Date().toISOString(),fields},encoded));
  const snapshot = JSON.stringify(item);
  assert.deepEqual(Object.keys(item).sort(),['ct','enc','id','iv','k','kid','v']);
  assert.equal(item.v,1); assert.equal(item.enc,'RSA-OAEP-256+A256GCM');
  assert.deepEqual(await decryptContact(item,{kid,bytes:256},adapter()),fields);
  assert.equal(JSON.stringify(item),snapshot);
  const changed = Buffer.from(item.ct,'base64'); changed[0] ^= 1;
  await assert.rejects(decryptContact({...item,ct:changed.toString('base64')},{kid,bytes:256},adapter()));
  await assert.rejects(decryptContact({...item,id:crypto.randomUUID()},{kid,bytes:256},adapter()));
});

test('success and failure paths do not log',async t => {
  let calls = 0;
  for (const method of ['log','info','warn','error','debug','trace','dir']) t.mock.method(console,method,()=>{calls++;});
  await adapter().unwrap(kid,wrapped);
  await assert.rejects(adapter(otherPem).unwrap(kid,wrapped));
  await assert.rejects(adapter('sensitive-invalid-value').unwrap(kid,wrapped));
  await assert.rejects(adapter().unwrap('unknown',wrapped));
  assert.equal(calls,0);
});

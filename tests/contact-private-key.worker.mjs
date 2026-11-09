import {contactPrivateKey} from '../server/contact-private-key.js';
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const equal = (a,b) => a.length === b.length && a.every((v,i) => v === b[i]);
export default {
  async fetch(_request, env) {
    const passed = [];
    const check = (condition, name) => { if (!condition) throw new Error('Local compatibility check failed'); passed.push(name); };
    const rejected = async (fn, message, code) => {
      try { await fn(); } catch (error) {
        return error.message === message && error.code === code && error.cause === undefined;
      }
      return false;
    };
    let logCalls = 0;
    const methods = ['log','info','warn','error','debug','trace','dir'];
    const saved = methods.map(name => console[name]);
    methods.forEach(name => { console[name] = () => { logCalls++; }; });
    try {
      const fixture = JSON.parse(env.FIXTURE);
      const kid = 'worker-ephemeral';
      const adapter = contactPrivateKey(env,{kid});
      const wrapped = bytes(fixture.wrapped);
      const raw = await adapter.unwrap(kid,wrapped);
      check(equal(new Uint8Array(raw),bytes(fixture.aes)), 'PKCS#8 import and RSA-OAEP SHA-256 unwrap');
      const aes = await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
      const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(fixture.iv)},aes,bytes(fixture.ct));
      check(new TextDecoder().decode(plain) === 'synthetic worker payload', 'AES-256-GCM decrypt');
      const results = await Promise.all([adapter.unwrap(kid,wrapped),adapter.unwrap(kid,wrapped)]);
      check(results.every(value => equal(new Uint8Array(value),bytes(fixture.aes))), 'cached concurrent unwrap');
      check(await rejected(()=>adapter.unwrap('wrong',wrapped),'Unknown contact key'), 'wrong kid sanitized');
      const wrong = contactPrivateKey({CONTACT_READABLE_PRIVATE_KEY:env.WRONG_PRIVATE_KEY},{kid});
      check(await rejected(()=>wrong.unwrap(kid,wrapped),'Invalid wrapped contact key'), 'wrong key sanitized');
      const changed = wrapped.slice(); changed[0] ^= 1;
      check(await rejected(()=>adapter.unwrap(kid,changed),'Invalid wrapped contact key'), 'tampering sanitized');
      for (const [label,secret] of [['missing',undefined],['invalid','synthetic-secret-marker']]) {
        const broken = contactPrivateKey({CONTACT_READABLE_PRIVATE_KEY:secret},{kid});
        check(await rejected(()=>broken.unwrap(kid,wrapped),'Contact private key unavailable','KMS_UNAVAILABLE'), label + ' secret sanitized');
      }
      check(logCalls === 0, 'no adapter console logging');
      return Response.json({passed, runtime:'workerd', cpuMs:null});
    } catch {
      return Response.json({error:'Local compatibility check failed'},{status:500});
    } finally { methods.forEach((name,i) => { console[name] = saved[i]; }); }
  }
};

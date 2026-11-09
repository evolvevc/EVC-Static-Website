import { createPublicKey } from 'node:crypto';

export const limit = 256 * 1024;
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function check(condition) {
  if (!condition) throw new Error('Invalid contact data');
}
export function publicKey(encoded) {
  const jwk = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  check(Object.keys(jwk).every(k => ['kty','n','e','alg','use','ext','key_ops','kid'].includes(k)));
  check(jwk.kty === 'RSA' && typeof jwk.kid === 'string' && /^[\w-]{1,64}$/.test(jwk.kid));
  check(jwk.alg === undefined || jwk.alg === 'RSA-OAEP-256');
  check(jwk.use === undefined || jwk.use === 'enc');
  check(jwk.key_ops === undefined || (Array.isArray(jwk.key_ops) && jwk.key_ops.includes('encrypt')));
  const bits = createPublicKey({key:jwk, format:'jwk'}).asymmetricKeyDetails.modulusLength;
  check([2048,3072,4096].includes(bits));
  return {kid:jwk.kid, bytes:bits/8};
}
export function envelope(value, key) {
  check(Object.keys(value).sort().join(',') === 'ct,enc,id,iv,k,kid,v');
  check(value.v === 1 && value.enc === 'RSA-OAEP-256+A256GCM' && value.kid === key.kid && typeof value.id === 'string' && uuid.test(value.id));
  for (const field of ['k','iv','ct']) {
    const s = value[field];
    check(typeof s === 'string' && s.length > 0 && s.length <= limit);
    const bytes = Buffer.from(s,'base64');
    check(bytes.toString('base64') === s);
    if (field === 'ct') check(bytes.length > 16);
    else check(bytes.length === (field === 'iv' ? 12 : key.bytes));
  }
  return value;
}

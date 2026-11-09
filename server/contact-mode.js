import { createPublicKey } from 'node:crypto';
import { publicKey, check } from './envelope.js';

// The only readable mode in Phase 1 is a local simulation with separate keys.
export function contactKeys(env) {
  const attachment = publicKey(env.CONTACT_PUBLIC_JWK);
  if ((env.CONTACT_DELIVERY_MODE ?? 'attachment') === 'attachment') return {attachment};
  check(env.CONTACT_DELIVERY_MODE === 'readable-local' && !env.VERCEL && !env.VERCEL_ENV && !env.VERCEL_DEPLOYMENT_ID);
  const readable = publicKey(env.CONTACT_READABLE_PUBLIC_JWK);
  const modulus = encoded => createPublicKey({key:JSON.parse(Buffer.from(encoded,'base64')),format:'jwk'}).export({format:'jwk'}).n;
  check(attachment.kid !== readable.kid && modulus(env.CONTACT_PUBLIC_JWK) !== modulus(env.CONTACT_READABLE_PUBLIC_JWK));
  return {attachment, readable};
}

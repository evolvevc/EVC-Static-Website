// Server-only adapter. Pass a trusted Worker env binding and a server-pinned kid.
// Keep one adapter per immutable binding/version; recreate it when rotating keys.
// No process.env, Node imports, network access, or cross-binding global cache.
const unavailable = () => Object.assign(new Error('Contact private key unavailable'), {code:'KMS_UNAVAILABLE'});
const invalid = () => new Error('Invalid wrapped contact key');

function pkcs8(pem) {
  if (typeof pem !== 'string' || pem.length > 16384) throw unavailable();
  const match = pem.trim().match(/^-----BEGIN PRIVATE KEY-----\s+([A-Za-z0-9+/=\s]+)\s+-----END PRIVATE KEY-----$/);
  if (!match) throw unavailable();
  const encoded = match[1].replace(/\s/g,'');
  const binary = atob(encoded);
  if (!binary.length || btoa(binary) !== encoded) throw unavailable();
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export function contactPrivateKey(env, {kid} = {}) {
  if (typeof kid !== 'string' || !/^[\w-]{1,64}$/.test(kid)) throw unavailable();
  let secret = env?.CONTACT_READABLE_PRIVATE_KEY;
  let imported;
  const key = () => imported ??= (async () => {
    let der;
    try {
      der = pkcs8(secret);
      const result = await globalThis.crypto.subtle.importKey(
        'pkcs8', der, {name:'RSA-OAEP',hash:'SHA-256'}, false, ['decrypt']);
      if (![2048,3072,4096].includes(result.algorithm.modulusLength)) throw unavailable();
      return result;
    } catch {
      // Do not expose provider/parser errors or attach secret-bearing causes.
      throw unavailable();
    } finally {
      der?.fill(0);
      secret = undefined;
    }
  })();
  return Object.freeze({
    async unwrap(selectedKid, wrapped) {
      if (selectedKid !== kid) throw new Error('Unknown contact key');
      if (!(wrapped instanceof ArrayBuffer) && !ArrayBuffer.isView(wrapped)) throw invalid();
      const bytes = wrapped instanceof ArrayBuffer
        ? new Uint8Array(wrapped) : new Uint8Array(wrapped.buffer, wrapped.byteOffset, wrapped.byteLength);
      if (![256,384,512].includes(bytes.byteLength)) throw invalid();
      // Snapshot caller-owned bytes before awaiting import.
      const ciphertext = bytes.slice();
      const rsa = await key();
      if (ciphertext.byteLength !== rsa.algorithm.modulusLength / 8) throw invalid();
      try {
        const raw = await globalThis.crypto.subtle.decrypt({name:'RSA-OAEP'}, rsa, ciphertext);
        if (raw.byteLength !== 32) { new Uint8Array(raw).fill(0); throw invalid(); }
        return raw;
      } catch { throw invalid(); }
    }
  });
}

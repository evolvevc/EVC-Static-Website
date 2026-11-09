// Test-only adapter. Keys are created in memory and never loaded from a file or environment.
export async function fakeContactKms() {
  const kid = 'local-readable-' + crypto.randomUUID();
  const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',hash:'SHA-256',modulusLength:2048,publicExponent:new Uint8Array([1,0,1])},false,['encrypt','decrypt']);
  const publicJwk = await crypto.subtle.exportKey('jwk',pair.publicKey);
  return {
    encoded:Buffer.from(JSON.stringify({...publicJwk,kid})).toString('base64'),
    async unwrap(selectedKid,wrapped) {
      if (selectedKid !== kid) throw new Error('Unknown test key');
      return crypto.subtle.decrypt({name:'RSA-OAEP'},pair.privateKey,wrapped);
    }
  };
}

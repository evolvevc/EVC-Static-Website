import { readFileSync, statSync } from 'node:fs';
import { createPrivateKey, webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { decryptContact } from '../../server/contact-payload.js';
import { publicKey, check, limit } from '../../server/envelope.js';

export async function decrypt(item, pem, encodedPublic) {
  const subtle = webcrypto.subtle;
  const der = createPrivateKey(pem).export({format:'der',type:'pkcs8'});
  const rsa = await subtle.importKey('pkcs8',der,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);

  return decryptContact(item, publicKey(encodedPublic), {unwrap: (_kid, wrapped) => subtle.decrypt({name:'RSA-OAEP'},rsa,wrapped)});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [attachment, privatePath, publicPath] = process.argv.slice(2);
    check(process.stdout.isTTY && statSync(attachment).size <= limit);
    const f = await decrypt(JSON.parse(readFileSync(attachment,'utf8')),readFileSync(privatePath),readFileSync(publicPath,'utf8').trim());
    // Escape terminal controls, including bidi overrides, before displaying visitor text.
    console.log(JSON.stringify(f,null,2).replace(/[\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,c => '\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
  } catch { console.error('Unable to read enquiry. Use an interactive terminal, a valid envelope and its matching EVC keys.'); process.exitCode = 1; }
}

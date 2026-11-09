import { webcrypto } from 'node:crypto';
import { check, envelope } from './envelope.js';

// kms.unwrap receives only the pinned key ID and RSA-OAEP/SHA-256 wrapped AES key.
export async function decryptContact(item, key, kms, {includeMetadata = false} = {}) {
  envelope(item,key);
  const raw = await kms.unwrap(key.kid, Buffer.from(item.k,'base64'));
  const subtle = webcrypto.subtle;
  check(raw.byteLength === 32);
  const aes = await subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  const plain = await subtle.decrypt({name:'AES-GCM',iv:Buffer.from(item.iv,'base64')},aes,Buffer.from(item.ct,'base64'));
  const data = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain));
  check(Object.keys(data).sort().join(',') === 'at,fields,form,id,page');
  check(data.id === item.id && data.form === 'contact' && data.page === '/contact-us/' && typeof data.at === 'string' && Number.isFinite(Date.parse(data.at)));
  const f = data.fields;
  const names = ['full-name','your-email','company','role','message','lead-source','consent'];
  check(Object.entries(f).every(([k,v]) => names.includes(k) && typeof v === 'string' && v.length <= 5000));
  check(f['full-name']?.trim() && f.message?.trim() && f.message.length <= 3000);
  check(typeof f['your-email'] === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f['your-email']));
  check(f['lead-source'] === 'contact-page' && f.consent === 'on' && ['Founder','Investor','Partner','Other'].includes(f.role));
  return includeMetadata ? {fields:f, at:data.at} : f;
}

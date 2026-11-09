import {generateKeyPairSync,randomBytes,randomUUID,publicEncrypt,createCipheriv,constants} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function cpuFixtures(){
 const pair=()=>generateKeyPairSync('rsa',{modulusLength:3072});
 const readable=pair(),old=pair();
 const pub=(pair,kid)=>Buffer.from(JSON.stringify({...pair.publicKey.export({format:'jwk'}),kid,alg:'RSA-OAEP-256'})).toString('base64');
 const settings={CONTACT_ENABLED:'true',CONTACT_INGRESS_POLICY:'unverified',CONTACT_DELIVERY_MODE:'readable-orchestrated',CONTACT_ORIGIN:'https://contact.example.test',CONTACT_TURNSTILE_HOSTNAME:'contact.example.test',CONTACT_TURNSTILE_ACTION:'contact_us',CONTACT_FROM:'sender@example.test',CONTACT_TO:'evolvevc.2024@gmail.com',RESEND_API_KEY:'synthetic-only',CONTACT_TURNSTILE_SECRET:'synthetic-turnstile',CONTACT_VISITOR_HASH_SECRET:'synthetic-hmac-not-a-production-secret',CONTACT_READABLE_KID:'cpu-synthetic',CONTACT_PUBLIC_JWK:pub(old,'cpu-old'),CONTACT_READABLE_PUBLIC_JWK:pub(readable,'cpu-synthetic'),CONTACT_READABLE_PRIVATE_KEY:readable.privateKey.export({type:'pkcs8',format:'pem'})};
 const bodies=Array.from({length:3},()=>{
  const id=randomUUID(),key=randomBytes(32),iv=randomBytes(12);
  const fields={'full-name':'&'.repeat(5000),'your-email':'s'.repeat(4987)+'@example.test',company:'&'.repeat(5000),role:'Founder',message:'&'.repeat(3000),consent:'on','lead-source':'contact-page'};
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const ct=Buffer.concat([cipher.update(JSON.stringify({id,at:new Date().toISOString(),form:'contact',page:'/contact-us/',fields})),cipher.final(),cipher.getAuthTag()]);
  const envelope={id,v:1,enc:'RSA-OAEP-256+A256GCM',kid:'cpu-synthetic',iv:iv.toString('base64'),k:publicEncrypt({key:readable.publicKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},key).toString('base64'),ct:ct.toString('base64')};
  key.fill(0);return JSON.stringify({envelope,turnstileToken:'synthetic-token'});
 });
 return {expires:Date.now()+30*60*1000,settings,bodies};
}
if(process.argv.includes('--write')){
 const directory=new URL('../../.cache/contact-cpu/',import.meta.url);mkdirSync(directory,{recursive:true});
 writeFileSync(new URL('fixture.json',directory),JSON.stringify(cpuFixtures()),{mode:0o600});
 console.log('Three disposable synthetic fixtures prepared; expire in 30 minutes. No network.');
}

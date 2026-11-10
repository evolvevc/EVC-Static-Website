import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {validate,sign,handle} from '../server/whitepaper.js';
import {WHITEPAPERS} from '../server/whitepaper-catalogue.js';

const secret = 'a'.repeat(64), origin = 'https://evolvevcap.com';
const env = {WHITEPAPER_ORIGIN:origin,WHITEPAPER_HMAC_SECRET:secret,WHITEPAPER_APPS_SCRIPT_URL:'https://script.google.com/macros/s/test/exec'};
const valid = {name:'Test Visitor',company:'Example',email:'visitor@example.com',resourceId:'WP01',consent:true};
const source = readFileSync(new URL('../apps-script/whitepaper/Code.gs',import.meta.url),'utf8');
const filenames = JSON.parse(readFileSync(new URL('../apps-script/whitepaper/filenames.template.json',import.meta.url),'utf8'));
function harness(options = {}) {
  const values = {WHITEPAPER_HMAC_SECRET:secret};
  const mapping = Object.fromEntries(Object.entries(WHITEPAPERS).map(([id,title]) => [id,{title,filename:filenames[id],fileId:'file-'+id}]));
  values.WP_APPROVED_MAPPING = JSON.stringify(mapping);
  values.WP_FILENAMES = JSON.stringify(filenames);
  const mails=[], reads=[]; let quota=options.quota ?? 100;
  const iterator = items => {let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]};};
  const file = id => ({getId:()=>id,getName:()=>filenames[id.slice(5)],getMimeType:()=>options.mime || 'application/pdf',getSize:()=>options.size || 100,isTrashed:()=>false,getParents:()=>iterator([{getId:()=> '1KiBArPSZ2qJOTSGGRUkEAvZif3OR9CXm'}]),getBlob:()=>({id,getContentType:()=>options.mime || 'application/pdf',getBytes:()=>Array.from(Buffer.from('%PDF-test'))})});
  const props={getProperty:k=>values[k]??null,setProperty:(k,v)=>{values[k]=v;},getProperties:()=>({...values}),deleteProperty:k=>{delete values[k];}};
  const user={getEmail:()=>options.owner || 'evolvevc.2024@gmail.com'};
  const context=vm.createContext({Date,JSON,Number,Object,String,Error,Math,Session:{getEffectiveUser:()=>user,getActiveUser:()=>user},PropertiesService:{getScriptProperties:()=>props},LockService:{getScriptLock:()=>({tryLock:()=>!options.busy,waitLock:()=>{},hasLock:()=>true,releaseLock:()=>{}})},Utilities:{Charset:{UTF_8:'utf8'},computeHmacSha256Signature:(text,key)=>Array.from(createHmac('sha256',key).update(text).digest()),newBlob:text=>({getBytes:()=>Buffer.from(text)})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},DriveApp:{getFileById:id=>{reads.push(id);return file(id);},getFolderById:()=>({getFilesByName:name=>iterator(options.missing?[]:options.duplicate?[file('file-'+Object.keys(filenames).find(id=>filenames[id]===name)),file('file-other')]:[file('file-'+Object.keys(filenames).find(id=>filenames[id]===name))])})},MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:message=>{mails.push(message);quota--;if(options.failAt===mails.length)throw Error('Uncertain');}}});
  const call=envelope=>context.doPost({postData:{type:'application/json',contents:JSON.stringify(envelope)},contentLength:Buffer.byteLength(JSON.stringify(envelope))});
  vm.runInContext(source,context);
  return {context,values,mails,reads,call};
}
test('validation rejects invalid resource, consent, injection and overrides',()=>{
  for(const patch of [{resourceId:['WP01']},{resourceId:'WP11'},{resourceId:'__proto__'},{consent:false},{consent:undefined},{email:'a@b.com,b@c.com'},{email:'a@b.com\r\nBcc:x@y.com'},{name:'<script>bad</script>'},{company:'bad\nsubject'},{recipient:'other@example.com'},{fileId:'arbitrary'},{name:'x'.repeat(101)}]) assert.throws(()=>validate({...valid,...patch}));
  assert.equal(validate(valid).resourceId,'WP01');
});
test('endpoint rejects foreign origins, oversized bodies and invalid payloads before sending',async()=>{
  let calls=0;const send=()=>{calls++;throw Error();};
  const req=(body=valid,headers={})=>new Request(origin+'/api/whitepaper/',{method:'POST',headers:{origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await handle(req(valid,{origin:'https://evil.example'}),env,send)).status,403);
  assert.equal((await handle(req({...valid,consent:false}),env,send)).status,400);
  assert.equal((await handle(req({...valid,name:'x'.repeat(5000)}),env,send)).status,413);
  assert.equal(calls,0);
});
test('Apps Script rejects invalid signatures, stale timestamps and tampering before Drive/Mail',()=>{
  const h=harness();
  for(const envelope of [{},sign(valid,'b'.repeat(64)),sign(valid,secret,Date.now()-600000),{...sign(valid,secret),body:JSON.stringify({...valid,resourceId:'WP02'})}]) assert.equal(h.call(envelope).state,'rejected');
  assert.equal(h.reads.length,0);assert.equal(h.mails.length,0);
});
test('all ten selections attach exactly the selected PDF with fixed admin recipient',()=>{
  for(const id of Object.keys(WHITEPAPERS)) {
    const h=harness(),result=h.call(sign({...valid,resourceId:id},secret));
    assert.equal(result.state,'accepted'); assert.equal(result.admin,'submitted');assert.equal(result.visitor,'submitted');
    assert.deepEqual(h.reads,['file-'+id]); assert.equal(h.mails.length,2);
    assert.equal(h.mails[0].to,'evolvevc.2024@gmail.com');assert.equal(h.mails[0].attachments,undefined);
    assert.equal(h.mails[1].to,valid.email);assert.equal(h.mails[1].attachments.length,1);assert.equal(h.mails[1].attachments[0].id,'file-'+id);
    assert.ok(h.mails[1].subject.includes(WHITEPAPERS[id]));
  }
});
test('persistent replay and recipient/resource cooldown prevent repeated messages',()=>{
  const h=harness(),envelope=sign(valid,secret);
  assert.equal(h.call(envelope).state,'accepted');assert.equal(h.call(envelope).state,'duplicate');assert.equal(h.call(sign(valid,secret)).state,'duplicate');assert.equal(h.mails.length,2);
});
test('uncertain admin send is not retried; visitor delivery tracked independently',()=>{
  const h=harness({failAt:1}),envelope=sign(valid,secret),r=h.call(envelope);
  assert.equal(r.admin,'unknown');assert.equal(r.visitor,'submitted');assert.equal(h.call(envelope).state,'duplicate');assert.equal(h.mails.length,2);
});
test('invalid PDF and mismatched title fail closed',()=>{
  for(const options of [{mime:'text/html'},{size:11*1024*1024}]) {const h=harness(options);assert.equal(h.call(sign(valid,secret)).state,'uncertain');assert.equal(h.mails.length,0);}
  const h=harness(),mapping=JSON.parse(h.values.WP_APPROVED_MAPPING);mapping.WP01.title=WHITEPAPERS.WP02;h.values.WP_APPROVED_MAPPING=JSON.stringify(mapping);assert.equal(h.call(sign(valid,secret)).state,'uncertain');assert.equal(h.mails.length,0);
});
test('owner setup verifies all mappings and rejects missing or duplicate filenames',()=>{
  const h=harness();assert.match(h.context.setupWhitepapers_(),/Verified all ten/);assert.equal(Object.keys(JSON.parse(h.values.WP_APPROVED_MAPPING)).length,10);assert.equal(h.mails.length,0);
  for(const options of [{missing:true},{duplicate:true},{owner:'other@example.com'}]) assert.throws(()=>harness(options).context.setupWhitepapers_());
});
test('quota, lock and persistent daily cap fail closed; stale records are cleaned',()=>{
  for(const options of [{quota:1},{busy:true}]) {const h=harness(options);assert.ok(['limited','unavailable'].includes(h.call(sign(valid,secret)).state));assert.equal(h.mails.length,0);}
  const h=harness();h.values.WP_REQ_old=JSON.stringify({at:Date.now()-8*86400000});
  for(let i=0;i<20;i++) assert.equal(h.call(sign({...valid,email:`visitor${i}@example.com`},secret)).state,'accepted');
  assert.equal(h.values.WP_REQ_old,undefined);assert.equal(h.call(sign({...valid,email:'last@example.com'},secret)).state,'limited');assert.equal(h.mails.length,40);
});
test('endpoint interprets application state and never retries HTTP 200 or transport failures',async()=>{
  const req=()=>new Request(origin+'/api/whitepaper/',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(valid)});
  let calls=0;
  const good=await handle(req(),env,async(url,options)=>{calls++;const h=harness();return Response.json(h.call(JSON.parse(options.body)));});
  assert.equal(good.status,202);assert.equal((await good.json()).delivery.visitor,'submitted');
  assert.equal((await handle(req(),env,async()=>{calls++;return Response.json({});})).status,503);
  assert.equal((await handle(req(),env,async()=>{calls++;throw Error('Timeout');})).status,503);assert.equal(calls,3);
});

test('Apps Script validates consent and types even for authenticated payloads',()=>{
  const h=harness();
  for(const patch of [{consent:false},{resourceId:['WP01']},{email:'a@example.com,b@example.com'},{subject:'override'}]) assert.equal(h.call(sign({...valid,...patch},secret)).state,'uncertain');
  assert.equal(h.mails.length,0);assert.equal(h.reads.length,0);
});
test('incorrect file ID cannot substitute a different PDF under the selected filename',()=>{
  const h=harness(),mapping=JSON.parse(h.values.WP_APPROVED_MAPPING);
  mapping.WP01.fileId='file-WP02';h.values.WP_APPROVED_MAPPING=JSON.stringify(mapping);
  assert.equal(h.call(sign(valid,secret)).state,'uncertain');assert.equal(h.mails.length,0);
});
test('recipient cap spans multiple resources and visitor uncertainty is never retried',()=>{
  const h=harness();
  for(const resourceId of ['WP01','WP02','WP03']) assert.equal(h.call(sign({...valid,resourceId},secret)).state,'accepted');
  assert.equal(h.call(sign({...valid,resourceId:'WP04'},secret)).state,'limited');
  const uncertain=harness({failAt:2}),envelope=sign(valid,secret),result=uncertain.call(envelope);
  assert.equal(result.admin,'submitted');assert.equal(result.visitor,'unknown');assert.equal(uncertain.call(envelope).state,'duplicate');assert.equal(uncertain.mails.length,2);
});

test('supplied filename manifest covers every approved ID and reports exact missing filename',()=>{
  assert.deepEqual(Object.keys(filenames),Object.keys(WHITEPAPERS));
  assert.equal(new Set(Object.values(filenames)).size,10);
  assert.equal(filenames.WP03,'EVC_SEA_Climate_Tech_Whitepaper.docx (1).pdf');
  const h=harness();h.context.setupWhitepapers_();
  const approved=JSON.parse(h.values.WP_APPROVED_MAPPING);
  for(const id of Object.keys(filenames)) assert.equal(approved[id].filename,filenames[id]);
  for(const [options,prefix] of [[{missing:true},'Missing filename: '],[{duplicate:true},'Duplicate filename/file: ']]) {
    assert.throws(()=>harness(options).context.setupWhitepapers_(),error=>error.message === prefix+'WP01 — '+JSON.stringify(filenames.WP01));
  }
});

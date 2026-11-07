// No provider calls. All methods are synchronous inside a SQLite transaction.
export const DAY=86400000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const deny=reason=>({ok:false,send:false,reason});
export class ContactBudgetStore {
 constructor(storage,{visitorLimit=3,dailyLimit=50,monthlyLimit=1500,clock=Date.now}={}) {
  this.storage=storage; this.clock=clock; this.limits={visitorLimit,dailyLimit,monthlyLimit}; this.ready=false;
  try {
   if(![visitorLimit,dailyLimit,monthlyLimit].every(n=>Number.isSafeInteger(n)&&n>0&&n<=1500)) return;
   storage.transactionSync(()=>{
    storage.sql.exec(`CREATE TABLE IF NOT EXISTS reservations(id TEXT PRIMARY KEY, visitor TEXT NOT NULL, issued INTEGER NOT NULL, created INTEGER NOT NULL, state TEXT NOT NULL CHECK(state IN ('reserved','uncertain','confirmed','released','rejected')))`);
    storage.sql.exec('CREATE INDEX IF NOT EXISTS visitor_time ON reservations(visitor,created)');
    storage.sql.exec('CREATE INDEX IF NOT EXISTS reservation_time ON reservations(created)');
    storage.sql.exec('CREATE TABLE IF NOT EXISTS counters(period TEXT PRIMARY KEY, used INTEGER NOT NULL)');
    storage.sql.exec('CREATE TABLE IF NOT EXISTS metadata(singleton INTEGER PRIMARY KEY CHECK(singleton=1), last_time INTEGER NOT NULL)');
   }); this.ready=true;
  } catch {}
 }
 transaction(fn) {
  if(!this.ready) return deny('storage');
  try {return this.storage.transactionSync(()=>{
   const now=this.clock(); if(!Number.isSafeInteger(now)||now<0) throw new Error();
   const prior=this.storage.sql.exec('SELECT last_time FROM metadata WHERE singleton=1').toArray()[0];
   if(prior && now<prior.last_time) throw new Error();
   this.storage.sql.exec('INSERT INTO metadata VALUES(1,?) ON CONFLICT(singleton) DO UPDATE SET last_time=excluded.last_time',now);
   const iso=new Date(now).toISOString(), day='d:'+iso.slice(0,10), month='m:'+iso.slice(0,7);
   // Fixed retention and hard row cap bound metadata, including after limit changes.
   this.storage.sql.exec('DELETE FROM reservations WHERE created <= ?',now-35*DAY);
   this.storage.sql.exec('DELETE FROM counters WHERE period NOT IN (?,?)',day,month);
   return fn(now,day,month);
  });} catch {return deny('storage');}
 }
 reserve(input) {
  if(!input || typeof input!=='object' || Array.isArray(input)) return deny('invalid');
  const {id,visitorId,issuedAt}=input;
  if(!UUID.test(id??'')||!HASH.test(visitorId??'')||!Number.isSafeInteger(issuedAt)) return deny('invalid');
  return this.transaction((now,day,month)=>{
   if(issuedAt>now||issuedAt<now-DAY) return deny('stale');
   const sql=this.storage.sql;
   const old=sql.exec('SELECT visitor,issued,state FROM reservations WHERE id=?',id).toArray()[0];
   if(old) return old.visitor===visitorId&&old.issued===issuedAt ? {ok:true,send:false,state:old.state,duplicate:true} : deny('conflict');
   const count=query=>query.toArray()[0].n;
   if(count(sql.exec('SELECT COUNT(*) AS n FROM reservations WHERE visitor=? AND created>?',visitorId,now-3600000))>=this.limits.visitorLimit) return deny('visitor');
   for(const [period,limit,reason] of [[day,this.limits.dailyLimit,'daily'],[month,this.limits.monthlyLimit,'monthly']]) {
    if((sql.exec('SELECT used FROM counters WHERE period=?',period).toArray()[0]?.used??0)>=limit) return deny(reason);
   }
   if(count(sql.exec('SELECT COUNT(*) AS n FROM reservations'))>=5000) return deny('capacity');
   sql.exec("INSERT INTO reservations VALUES(?,?,?,?, 'reserved')",id,visitorId,issuedAt,now);
   for(const period of [day,month]) sql.exec('INSERT INTO counters VALUES(?,1) ON CONFLICT(period) DO UPDATE SET used=used+1',period);
   return {ok:true,send:false,state:'reserved',duplicate:false};
  });
 }
 claim(id) {
  if(!UUID.test(id??'')) return deny('invalid');
  return this.transaction(now=>{
   const row=this.storage.sql.exec('SELECT state,created FROM reservations WHERE id=?',id).toArray()[0];
   if(!row) return deny('missing');
   if(row.state!=='reserved') return {ok:true,send:false,state:row.state};
   // Do not let a delayed reservation authorize a send against a later budget period.
   if(now-row.created>=300000 || new Date(row.created).toISOString().slice(0,10)!==new Date(now).toISOString().slice(0,10)) {
    this.storage.sql.exec("UPDATE reservations SET state='released' WHERE id=?",id);
    return {ok:true,send:false,state:'released'};
   }
   this.storage.sql.exec("UPDATE reservations SET state='uncertain' WHERE id=?",id);
   return {ok:true,send:true,state:'uncertain'};
  });
 }
 settle(id,outcome) {
  if(!UUID.test(id??'')||!['confirmed','uncertain','rejected','released'].includes(outcome)) return deny('invalid');
  return this.transaction(()=>{
   const row=this.storage.sql.exec('SELECT state FROM reservations WHERE id=?',id).toArray()[0];
   if(!row) return deny('missing');
   if(row.state===outcome) return {ok:true,send:false,state:outcome};
   const allowed=(row.state==='reserved'&&outcome==='released') || (row.state==='uncertain'&&['confirmed','rejected'].includes(outcome));
   if(!allowed) return deny('transition');
   this.storage.sql.exec('UPDATE reservations SET state=? WHERE id=?',outcome,id);
   // Deliberately never refund counters, even for known rejection/cancellation.
   return {ok:true,send:false,state:outcome};
  });
 }
 cleanup(){return this.transaction(()=>({ok:true,send:false,retained:this.storage.sql.exec('SELECT COUNT(*) AS n FROM reservations').toArray()[0].n}));}
}

// Call only with a trusted, canonical visitor/IP identifier, never browser input.
// HMAC binding is not written to SQLite. Stable key required across replicas/rotation.
export async function contactVisitorId(env,canonicalVisitor) {
 const secret=env?.CONTACT_VISITOR_HASH_SECRET;
 if(typeof secret!=='string'||secret.length<32||secret.length>1024||typeof canonicalVisitor!=='string'||!canonicalVisitor||canonicalVisitor.length>256) throw new Error('Visitor identity unavailable');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const result=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('contact-visitor-v1:'+canonicalVisitor));
 return Array.from(new Uint8Array(result),b=>b.toString(16).padStart(2,'0')).join('');
}

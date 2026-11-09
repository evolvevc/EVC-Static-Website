import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directContactIngress} from '../server/contact-ingress.js';
const endpoint='https://contact.synthetic.workers.dev/api/contact/';
const env={CONTACT_ENDPOINT:endpoint,CONTACT_INGRESS_POLICY:'direct-workers-dev-v1'};
function req(headers={},cf={colo:'LHR',tlsVersion:'TLSv1.3'},url=endpoint){
 const r=new Request(url,{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.10',...headers}});
 Object.defineProperty(r,'cf',{value:cf});return r;
}
test('explicit audited policy allows platform-shaped IPv4/IPv6 ingress',()=>{
 assert.equal(directContactIngress(req(),env),true);
 assert.equal(directContactIngress(req({'CF-Connecting-IP':'2001:db8::1'}),env),true);
 for(const policy of [undefined,'unverified','direct-zone-waf-v1'])assert.equal(directContactIngress(req(),{...env,CONTACT_INGRESS_POLICY:policy}),false);
});
test('all Worker markers, empty marker and canonical cross-zone address fail closed',()=>{
 for(const headers of [{'CF-Worker':'attacker.workers.dev'},{'CF-Worker':''},{'CF-Connecting-IP':'2a06:98c0:3600::103'},{'CF-Connecting-IP':'2a06:98c0:3600:0:0:0:0:0103'},{'CF-Connecting-IPv6':'2001:db8::1'}])assert.equal(directContactIngress(req(headers),env),false);
});
test('missing metadata, invalid identity and wrong destination fail closed',()=>{
 for(const cf of [undefined,null,{}, {colo:'LHR',tlsVersion:'TLSv1.1'},{colo:'',tlsVersion:'TLSv1.3'}]){
 const r=req();const bare=new Request(r);Object.defineProperty(bare,'cf',{value:cf});assert.equal(directContactIngress(bare,env),false);
 }
 for(const ip of ['','unknown','192.0.2.1, 192.0.2.2'])assert.equal(directContactIngress(req({'CF-Connecting-IP':ip}),env),false);
 for(const url of [endpoint+'?x=1',endpoint.replace('contact.synthetic','other.synthetic'),endpoint.replace('https:','http:')])assert.equal(directContactIngress(req({},undefined,url),env),false);
});
test('Origin and forwarded identities cannot authorize ingress',()=>{
 const headers={Origin:'https://evolve-vc.vercel.app','X-Forwarded-For':'192.0.2.20','X-Real-IP':'192.0.2.30'};
 assert.equal(directContactIngress(new Request(endpoint,{headers}),env),false);
 assert.equal(directContactIngress(req({...headers,'CF-Worker':'attacker'}),env),false);
 assert.equal(directContactIngress(req(headers),{...env,CONTACT_INGRESS_POLICY:'unverified'}),false);
});
test('tracked production remains disabled and quota/binding settings retained',()=>{
 const c=JSON.parse(readFileSync(new URL('../wrangler.contact-production.json',import.meta.url)));
 assert.equal(c.vars.CONTACT_ENABLED,'false');assert.equal(c.vars.CONTACT_INGRESS_POLICY,'unverified');assert.equal(c.workers_dev,false);assert.equal(c.preview_urls,false);assert.deepEqual(c.routes,[]);
 assert.deepEqual([c.vars.CONTACT_VISITOR_LIMIT,c.vars.CONTACT_DAILY_LIMIT,c.vars.CONTACT_MONTHLY_LIMIT],['3','50','1500']);assert.equal(c.durable_objects.bindings[0].class_name,'ContactBudget');assert.deepEqual(c.migrations[0].new_sqlite_classes,['ContactBudget']);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {contactEmail} from '../server/contact-email.js';
import {contactEmail as shared} from '../server/contact-email-render.js';
const logo=readFileSync(new URL('../build-inputs/logo.png',import.meta.url)).toString('base64');
test('Node output matches approved pre-change template byte for byte',()=>{
 const fields={"full-name":"Synthetic <Visitor>","your-email":"test@example.test","company":"","role":"Founder","message":"Hello & goodbye\r\nSecond line"};
 const mail=contactEmail(fields,'synthetic-reference');
 assert.equal(createHash('sha256').update(JSON.stringify(mail)).digest('hex'),'f9fa31a219352de458b7f2d80e15934d1efcefa8ea7dabeaa48a4176923705a7');
 assert.deepEqual(shared(fields,'synthetic-reference',logo),mail);
});
test('all visitor HTML values escaped and original CID PNG retained',()=>{
 const attack='<img src=x onerror="bad()"> & \' <script>bad()</script>';
 const mail=shared({'full-name':attack,'your-email':attack,company:attack,role:attack,message:attack+'\r\nnext'},attack,logo);
 const $=load(mail.html);
 assert.equal($('script,[onerror],a').length,0);
 assert.equal($('img').length,1); assert.equal($('img').attr('src'),'cid:evc-logo');
 assert.equal($('td').filter((_,el)=>$(el).text()===attack).length,4);
 assert.ok($.text().includes('Enquiry reference: '+attack));
 assert.ok(mail.html.includes('&amp;')); assert.ok(mail.html.includes('&#39;'));
 assert.ok(mail.html.includes('&quot;')); assert.ok(mail.html.includes('<br>next'));
 assert.deepEqual(mail.attachments,[{filename:'evc-logo.png',content_type:'image/png',content_id:'evc-logo',content:logo}]);
});

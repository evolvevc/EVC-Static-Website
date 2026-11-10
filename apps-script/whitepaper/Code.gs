// Trusted website titles below. Runtime filenames/IDs come only from private Script Properties.
const OWNER = 'evolvevc.2024@gmail.com';
const FOLDER = '1KiBArPSZ2qJOTSGGRUkEAvZif3OR9CXm';
const MAX_PDF = 10 * 1024 * 1024;
const DAY = 86400000;
const CATALOGUE = {
  "WP01": "Climate Returns Framework: Measuring Real Impact Across Southeast Asia's Portfolio",
  "WP02": "The Carbon Verification Gap: Why Southeast Asia's Carbon Credits Are Undervalued — and How To Fix It",
  "WP03": "SEA Climate Tech Investment Thesis: 2026–2030 Sector Map",
  "WP04": "The Institutional LP Decision Framework: How Capital Allocators Evaluate VC Funds in 2026",
  "WP05": "Southeast Asia VC Landscape 2026: Where Institutional Capital Is Moving and Why",
  "WP06": "The Map Has Changed: Why Venture Capital's Future Is Outside Silicon Valley",
  "WP07": "Let's Talk Numbers: The Four Metrics That Define (and De-Risk) Your Startup",
  "WP08": "The Value in Waiting: Building an LP Portfolio for the Era of the 10-Year Exit (And How to Get Paid Anyway)",
  "WP09": "The Silent Shift: Early-Stage Liquidity Is Re-Writing VC Economics",
  "WP10": "The Power of Value Investing in Tech Startups: Identifying Undervalued Gems"
};

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function hex_(bytes) { return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function mac_(text, secret) { return hex_(Utilities.computeHmacSha256Signature(text, secret, Utilities.Charset.UTF_8)); }
function equal_(a, b) { if (typeof a !== 'string' || a.length !== b.length) return false; var diff = 0; for (var i = 0; i < b.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
function owner_() { if (Session.getEffectiveUser().getEmail() !== OWNER) throw Error('Wrong executing account'); }
function text_(v, max, optional) {
  if (optional && v === undefined) return '';
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u001f\u007f<>]/.test(v) || (!optional && !v.trim())) throw Error('Invalid');
  return v.trim();
}
function payload_(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).sort().join(',') !== 'company,consent,email,name,resourceId') throw Error('Invalid');
  p.name = text_(p.name,100); p.company = text_(p.company,150,true); p.email = text_(p.email,254).toLowerCase();
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(p.email) || p.email.split('@')[0].length > 64 || (typeof p.resourceId !== 'string' || !Object.prototype.hasOwnProperty.call(CATALOGUE,p.resourceId)) || p.consent !== true) throw Error('Invalid');
  return p;
}
function pdf_(file, filename) {
  if (file.isTrashed() || file.getName() !== filename || file.getMimeType() !== 'application/pdf' || file.getSize() <= 0 || file.getSize() > MAX_PDF) throw Error('Invalid PDF');
  const parents = file.getParents(); var member = false;
  while (parents.hasNext()) if (parents.next().getId() === FOLDER) member = true;
  if (!member) throw Error('Wrong folder');
  const blob = file.getBlob(), bytes = blob.getBytes();
  if (blob.getContentType() !== 'application/pdf' || bytes.length <= 0 || bytes.length > MAX_PDF || bytes.slice(0,5).map(function(b) { return String.fromCharCode(b); }).join('') !== '%PDF-') throw Error('Invalid PDF content');
  return blob;
}

// Run manually in the editor as OWNER only. Never dispatched by doPost.
// Trailing underscore prevents invocation through google.script.run.
function setupWhitepapers_() {
  owner_();
  if (Session.getActiveUser().getEmail() !== OWNER) throw Error('Owner editor session required');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const names = JSON.parse(props.getProperty('WP_FILENAMES') || 'null');
    if (!names || Object.keys(names).sort().join(',') !== Object.keys(CATALOGUE).sort().join(',')) throw Error('Supply all ten exact filenames');
    const folder = DriveApp.getFolderById(FOLDER), mapping = {}, used = {};
    Object.keys(CATALOGUE).forEach(function(id) {
      const name = names[id];
      if (typeof name !== 'string' || !name.trim() || name.length > 240 || /[\r\n]/.test(name)) throw Error('Invalid filename: ' + id);
      const matches = folder.getFilesByName(name);
      if (!matches.hasNext()) throw Error('Missing filename: ' + id + ' — ' + JSON.stringify(name));
      const file = matches.next();
      if (matches.hasNext() || used[file.getId()]) throw Error('Duplicate filename/file: ' + id + ' — ' + JSON.stringify(name));
      pdf_(file, name); used[file.getId()] = true;
      mapping[id] = {title:CATALOGUE[id],filename:name,fileId:file.getId()};
    });
    const encoded = JSON.stringify(mapping);
    if (Utilities.newBlob(encoded).getBytes().length > 8000) throw Error('Mapping too large');
    props.setProperty('WP_APPROVED_MAPPING', encoded);
    return 'Verified all ten PDFs. No emails sent.';
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  var requestId, lock;
  try {
    if (!e || !e.postData || e.postData.type !== 'application/json' || e.postData.contents.length > 8192 || e.contentLength > 8192) return json_({state:'rejected'});
    const env = JSON.parse(e.postData.contents), props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('WHITEPAPER_HMAC_SECRET');
    if (!/^[a-f0-9]{64}$/i.test(secret || '') || !Number.isSafeInteger(env.timestamp) || Math.abs(Date.now() - env.timestamp) > 300000 || !/^[a-f0-9-]{36}$/.test(env.requestId || '') || typeof env.body !== 'string' || env.body.length > 4096 || !/^[a-f0-9]{64}$/.test(env.signature || '')) return json_({state:'rejected'});
    if (!equal_(env.signature, mac_('whitepaper-v1\n' + env.timestamp + '\n' + env.requestId + '\n' + env.body, secret))) return json_({state:'rejected'});
    requestId = env.requestId;
    // All Drive, Mail and state mutations happen only after authentication.
    const p = payload_(JSON.parse(env.body)); owner_();
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return json_({requestId:requestId,state:'unavailable'});
    const now = Date.now(), all = props.getProperties(), records = [];
    Object.keys(all).filter(function(k) { return k.indexOf('WP_REQ_') === 0; }).forEach(function(k) {
      const r = JSON.parse(all[k]);
      if (!Number.isSafeInteger(r.at)) throw Error('Invalid ledger');
      if (now - r.at > 7 * DAY) props.deleteProperty(k); else records.push(r);
    });
    const recipient = mac_('recipient\n' + p.email, secret);
    if (props.getProperty('WP_REQ_' + requestId) || records.some(function(r) { return r.recipient === recipient && r.resource === p.resourceId && now - r.at < DAY; })) return json_({requestId:requestId,state:'duplicate'});
    const recent = records.filter(function(r) { return now - r.at < DAY; });
    if (records.length >= 160 || recent.length >= 20 || recent.filter(function(r) { return r.recipient === recipient; }).length >= 3) return json_({requestId:requestId,state:'limited'});
    if (MailApp.getRemainingDailyQuota() < 2) return json_({requestId:requestId,state:'limited'});
    const mapping = JSON.parse(props.getProperty('WP_APPROVED_MAPPING') || 'null');
    if (!mapping || Object.keys(mapping).sort().join(',') !== Object.keys(CATALOGUE).sort().join(',')) throw Error('Setup required');
    const selected = mapping[p.resourceId];
    if (!selected || selected.title !== CATALOGUE[p.resourceId] || typeof selected.fileId !== 'string' || typeof selected.filename !== 'string') throw Error('Setup required');
    const record = {at:now,recipient:recipient,resource:p.resourceId,admin:'not_attempted',visitor:'not_attempted'};
    const save = function() { props.setProperty('WP_REQ_' + requestId, JSON.stringify(record)); };
    // Reserve before Drive or Mail: failed/uncertain attempts consume the cap and cooldown too.
    save();
    const attachment = pdf_(DriveApp.getFileById(selected.fileId), selected.filename);
    const title = CATALOGUE[p.resourceId], time = new Date(now).toISOString();
    function deliver(channel, message) {
      record[channel] = 'unknown'; save(); // durable intent BEFORE irreversible operation
      try { MailApp.sendEmail(message); } catch (_) { return; } // never retry an uncertain send
      record[channel] = 'submitted'; save(); // means MailApp returned, not confirmed inbox delivery
    }
    deliver('admin', {to:OWNER,name:'Evolve Venture Capital',subject:'Whitepaper download request: ' + title,body:'Name: ' + p.name + '\nCompany: ' + (p.company || '(not supplied)') + '\nEmail: ' + p.email + '\nWhitepaper: ' + title + '\nResource: ' + p.resourceId + '\nTime (UTC): ' + time + '\nRequest ID: ' + requestId});
    const escape = function(s) { return s.replace(/[&<>"']/g,function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
    deliver('visitor', {to:p.email,name:'Evolve Venture Capital',subject:'Your Evolve VC whitepaper: ' + title,body:'Hello ' + p.name + ',\n\nThank you for your interest in Evolve Venture Capital. Your selected whitepaper, ' + title + ', is attached.\n\nEvolve Venture Capital\nhttps://evolvevcap.com',htmlBody:'<div style="font-family:Arial,sans-serif;color:#163c34"><h2>Evolve Venture Capital</h2><p>Hello ' + escape(p.name) + ',</p><p>Thank you for your interest. Your selected whitepaper is attached:</p><p><strong>' + escape(title) + '</strong></p><p>Evolve Venture Capital<br><a href="https://evolvevcap.com">evolvevcap.com</a></p></div>',attachments:[attachment]});
    return json_({requestId:requestId,state:'accepted',admin:record.admin,visitor:record.visitor});
  } catch (_) { return json_({requestId:requestId,state:'uncertain'}); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}

function listWhitepaperFileIds() {
  const folderId = "1KiBArPSZ2qJOTSGGRUkEAvZif3OR9CXm";
  const files = DriveApp.getFolderById(folderId).getFiles();

  while (files.hasNext()) {
    const file = files.next();

    Logger.log(
      file.getName() + " | " + file.getId()
    );
  }
}

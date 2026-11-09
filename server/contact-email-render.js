// Shared renderer: logoContent is trusted, bundled PNG content encoded as base64.

const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function contactEmail(fields, id, logoContent) {
  const rows = [['Name',fields['full-name']],['Email',fields['your-email']],['Company',fields.company || 'Not provided'],['Role',fields.role]];
  const message = fields.message.replace(/\r\n?/g,'\n');
  const tableRows = rows.map(([label,value]) => `<tr><th scope="row" align="left" style="width:25%;vertical-align:top;padding:12px 8px;border-bottom:1px solid #ddd">${label}</th><td style="padding:12px 8px;border-bottom:1px solid #ddd;overflow-wrap:anywhere;word-break:break-word">${escape(value)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0;background:#f2f3f3;font:15px/1.5 Arial,sans-serif;color:#0a1026"><table role="presentation" align="center" width="100%" style="max-width:600px;background:#fff;border-top:4px solid #0abf84"><tr><td style="padding:20px"><img src="cid:evc-logo" width="140" alt="Evolve Venture Capital"><h1 style="font-size:22px;border-bottom:2px solid #e9b21f;padding-bottom:12px">New Client Enquiry</h1><table width="100%" style="border-collapse:collapse;table-layout:fixed">${tableRows}</table><h2 style="font-size:16px">Message</h2><p style="overflow-wrap:anywhere;word-break:break-word">${escape(message).replaceAll('\n','<br>')}</p><p style="font-size:12px;color:#43574f">Enquiry reference: ${escape(id)}</p></td></tr></table></body></html>`;
  const text = ['Evolve Venture Capital','New Client Enquiry','',...rows.map(([k,v])=>k+': '+v),'','Message',message,'','Enquiry reference: '+id].join('\n');
  return {subject:'New client enquiry | Evolve Venture Capital', html, text,
    attachments:[{filename:'evc-logo.png',content_type:'image/png',content_id:'evc-logo',content:logoContent}]};
}

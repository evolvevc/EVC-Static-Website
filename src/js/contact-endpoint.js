// Public deployment setting only. Empty retains the existing same-origin path.
export function contactEndpoint(value='') {
 if(value==='')return '/api/contact/';
 if(typeof value!=='string')throw new Error('Invalid Contact endpoint');
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||
  url.pathname!=='/api/contact/'||url.href!==value||!url.hostname.endsWith('.workers.dev'))throw new Error('Invalid Contact endpoint');
 return url.href;
}

let loading;
async function api() {
 if(globalThis.turnstile)return globalThis.turnstile;
 if(!loading)loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
  const timer=setTimeout(()=>{script.remove();loading=undefined;reject(new Error('Verification unavailable'));},15000);
  script.onload=()=>{clearTimeout(timer);globalThis.turnstile?resolve(globalThis.turnstile):reject(new Error('Verification unavailable'));};
  script.onerror=()=>{clearTimeout(timer);script.remove();loading=undefined;reject(new Error('Verification unavailable'));};document.head.appendChild(script);
 });
 return loading;
}
export async function contactToken(form) {
 const sitekey=form.dataset.turnstileSitekey,container=form.querySelector('[data-contact-turnstile]');
 if(!sitekey||!container)throw new Error('Verification unavailable');
 const turnstile=await api();let widget,timer;
 try {return await new Promise((resolve,reject)=>{
  timer=setTimeout(()=>reject(new Error('Verification timed out')),120000);
  const fail=()=>{clearTimeout(timer);reject(new Error('Verification unavailable'));};
  widget=turnstile.render(container,{sitekey,action:'contact_us',execution:'execute','response-field':false,
   callback:token=>{clearTimeout(timer);typeof token==='string'&&token.length>0&&token.length<=2048?resolve(token):fail();},'error-callback':fail,'expired-callback':fail,'timeout-callback':fail});
  turnstile.execute(widget);
 });}finally{clearTimeout(timer);if(widget!==undefined)turnstile.remove(widget);}
}

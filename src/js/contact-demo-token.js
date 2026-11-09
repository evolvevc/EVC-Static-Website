// Private operator tab only. Token never enters URL, form data or build configuration.
export function demoHeaders(contact,readable,endpoint){
 if(!contact||readable||endpoint!=='/api/contact/'||globalThis.location?.origin!=='https://evolve-vc.vercel.app')return {};
 try{const token=sessionStorage.getItem('evc-contact-demo-token');if(!token)return {};sessionStorage.removeItem('evc-contact-demo-token');return {'X-Contact-Demo-Token':token};}catch{return {};}
}

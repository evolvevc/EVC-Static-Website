import {DurableObject} from 'cloudflare:workers';
import {ContactBudgetStore,DAY} from './contact-budget-store.js';
// Internal binding/RPC only: no public fetch route and no sender implementation.
export class ContactBudget extends DurableObject {
 constructor(ctx,env) {
  super(ctx,env); this.storage=ctx.storage;
  this.budget=new ContactBudgetStore(ctx.storage,{
   visitorLimit:env.CONTACT_VISITOR_LIMIT===undefined?3:Number(env.CONTACT_VISITOR_LIMIT),
   dailyLimit:env.CONTACT_DAILY_LIMIT===undefined?50:Number(env.CONTACT_DAILY_LIMIT),
   monthlyLimit:env.CONTACT_MONTHLY_LIMIT===undefined?1500:Number(env.CONTACT_MONTHLY_LIMIT)});
 }
 async reserve(input){
  try {
   // Schedule before reserving: alarm/storage failure never grants capacity.
   if(await this.storage.getAlarm()===null) await this.storage.setAlarm(Date.now()+DAY);
   return this.budget.reserve(input);
  } catch {return {ok:false,send:false,reason:'storage'};}
 }
 async alarm(){
  const result=this.budget.cleanup();
  if(!result.ok || result.retained>0) await this.storage.setAlarm(Date.now()+DAY);
 }
 claim(id){return this.budget.claim(id);}
 settle(id,outcome){return this.budget.settle(id,outcome);}
 cleanup(){return this.budget.cleanup();}
}
// All callers must use this one stable name, not visitor-specific objects.
export function contactBudget(namespace) {
 let stub;
 try {stub=namespace.get(namespace.idFromName('evc-contact-global-budget-v1'));} catch {};
 const safe=method=>async(...args)=>{try{return await stub[method](...args);}catch{return {ok:false,send:false,reason:'storage'};}};
 return {reserve:safe('reserve'),claim:safe('claim'),settle:safe('settle'),cleanup:safe('cleanup')};
}

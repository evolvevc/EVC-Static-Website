import {DurableObject} from 'cloudflare:workers';
import {ContactBudgetStore} from '../server/contact-budget-store.js';
import {readableCases} from './contact-readable-cases.mjs';
import logo from '../build-inputs/logo.png';
export class ReadableBudgetTest extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.storage=ctx.storage;}
 initialize(options){this.budget=new ContactBudgetStore(this.storage,{...options,clock:()=>Date.parse('2026-11-06T10:00:00Z')});return true;}
 reserve(value){return this.budget.reserve(value);}
 claim(value){return this.budget.claim(value);}
 settle(id,outcome){return this.budget.settle(id,outcome);}
}
export default {async fetch(_req,env){
 try {
  let serial=0;
  const make=async options=>{const stub=env.BUDGET.get(env.BUDGET.idFromName('isolated-scenario-'+serial++));const {clock,...limits}=options;await stub.initialize(limits);return stub;};
  return Response.json({passed:await readableCases(make,logo)});
 }catch{return Response.json({error:'Offline orchestration check failed'},{status:500});}
}};

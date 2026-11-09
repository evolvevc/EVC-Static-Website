import {ContactBudget,contactBudget} from '../server/contact-budget.js';
import {ContactBudgetStore} from '../server/contact-budget-store.js';
import {cases,setup,id,visitor,start} from './contact-budget-cases.mjs';
export class BudgetTest extends ContactBudget {
 constructor(ctx,env){super(ctx,env);this.context=ctx;this.budget=new ContactBudgetStore(ctx.storage,{clock:()=>start,dailyLimit:5});}
 async alarmCheck(){
  await this.alarm();
  return (await this.storage.getAlarm())!==null;
 }
 async runCases(){
  for(const [,run] of cases) await run(options=>{
   const storage=this.context.storage;
   storage.transactionSync(()=>{for(const table of ['reservations','counters','metadata'])storage.sql.exec('DROP TABLE IF EXISTS '+table);});
   return setup(storage,options);
  });
  return cases.length;
 }
}
export default {async fetch(_request,env){
 try {
  const suite=env.SUITE.get(env.SUITE.idFromName('offline-suite'));
  const count=await suite.runCases();
  const global=contactBudget(env.BUDGET);
  const reservations=await Promise.all(Array.from({length:20},(_,i)=>global.reserve({id:id(i+1),visitorId:visitor(i+1),issuedAt:start})));
  const claims=await Promise.all(Array.from({length:20},()=>global.claim(id(1))));
  const fail=contactBudget({idFromName:n=>n,get:()=>({reserve(){throw new Error('synthetic secret');}})});
  const closed=await fail.reserve({});
  const missing=await contactBudget(undefined).claim(id(1));
  const scheduled=await env.BUDGET.get(env.BUDGET.idFromName('evc-contact-global-budget-v1')).alarmCheck();
  return Response.json({cases:count,reserved:reservations.filter(r=>r.ok).length,grants:claims.filter(r=>r.send).length,closed:!closed.ok&&!closed.send&&!missing.ok,scheduled});
 }catch{return Response.json({error:'Offline budget check failed'},{status:500});}
}};

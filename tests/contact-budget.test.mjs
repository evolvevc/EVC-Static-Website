import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {cases,setup} from './contact-budget-cases.mjs';
for(const [name,run] of cases)test(name,async t=>{
 const make=options=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const storage={sql:{exec(query,...args){const statement=db.prepare(query);const rows=statement.all(...args);return {toArray:()=>rows};}},transactionSync(fn){db.exec('BEGIN');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
  return setup(storage,options);
 };
 await run(make);
});

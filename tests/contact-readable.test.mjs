import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {ContactBudgetStore} from '../server/contact-budget-store.js';
import {readableCases} from './contact-readable-cases.mjs';
test('offline readable orchestration with real SQLite budget', {timeout:30000},async t=>{
 const make=options=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  const storage={sql:{exec(query,...args){const rows=db.prepare(query).all(...args);return {toArray:()=>rows};}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
  return new ContactBudgetStore(storage,options);
 };
 const passed=await readableCases(make,readFileSync(new URL('../build-inputs/logo.png',import.meta.url)).toString('base64'));
 assert.equal(passed.length,18);t.diagnostic('18 synthetic orchestration scenarios passed.');
});

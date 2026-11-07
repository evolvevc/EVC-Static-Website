import {test} from 'node:test';
import {cases} from './contact-turnstile-cases.mjs';
for (const [name,run] of cases) test(name,run);

import {cases} from './contact-resend-cases.mjs';
export default {async fetch(){try{for(const [,run]of cases)await run();return Response.json({passed:cases.length});}catch{return Response.json({error:'Offline check failed'},{status:500});}}};

import { handle } from '../server/whitepaper.js';
export default {fetch: request => handle(request, process.env)};

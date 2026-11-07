import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { publicKey } from '../../server/envelope.js';

const settings = parseEnv(readFileSync(new URL('../../.env.local', import.meta.url), 'utf8'));
const env = { ...process.env };
// Use the file as the source of truth for this local session. Never log its values.
for (const name of ['CONTACT_PUBLIC_JWK','CONTACT_ORIGIN','CONTACT_LOCAL_ACCOUNT_TEST','CONTACT_FROM']) {
  if (settings[name] !== undefined) env[name] = settings[name];
}
env.RESEND_API_KEY ||= settings.RESEND_API_KEY;
if (!env.RESEND_API_KEY) delete env.RESEND_API_KEY;
if (env.CONTACT_ORIGIN !== 'http://127.0.0.1:3000') throw new Error('Set CONTACT_ORIGIN to http://127.0.0.1:3000');
try { publicKey(env.CONTACT_PUBLIC_JWK); } catch { throw new Error('Set a valid public-only CONTACT_PUBLIC_JWK in .env.local'); }
// Fixed command and arguments; no settings are interpolated into the shell command.
const result = spawnSync('vercel', ['dev','--listen','127.0.0.1:3000','--non-interactive'], {
  env, stdio:'inherit', shell:process.platform === 'win32'
});
if (result.error) console.error('Could not start the installed Vercel CLI.');
process.exitCode = result.status ?? 1;
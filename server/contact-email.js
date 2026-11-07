import { readFileSync } from 'node:fs';
import { contactEmail as renderContactEmail } from './contact-email-render.js';

// Preserve the synchronous Node entry point and its existing inline attachment.
export function contactEmail(fields, id) {
  return renderContactEmail(fields, id,
    readFileSync(new URL('../build-inputs/logo.png',import.meta.url)).toString('base64'));
}

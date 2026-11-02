// Generates security headers + redirects for Apache (.htaccess) and Netlify / Cloudflare Pages (_headers, _redirects).
import { SITE } from './lib/site.mjs';

const endpointOrigin = (() => { try { return SITE.formEndpoint ? new URL(SITE.formEndpoint).origin : ''; } catch { return ''; } })();
const GA_SCRIPT = 'https://www.googletagmanager.com';
const GA_CONNECT = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';

export const CSP = [
  "default-src 'none'",
  `script-src 'self' 'inline-speculation-rules' ${GA_SCRIPT}`,
  "style-src 'self'",
  `img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com`,
  "font-src 'self'",
  `connect-src 'self' ${GA_CONNECT}${endpointOrigin ? ' ' + endpointOrigin : ''}`,
  "manifest-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  `form-action 'self'${endpointOrigin ? ' ' + endpointOrigin : ''}`,
  'upgrade-insecure-requests',
].join('; ');

const HEADERS = {
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), publickey-credentials-get=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Old WordPress URLs that must keep working (SEO) or be retired.
export const REDIRECTS = [
  ['/raise-capital-2/', '/raise-capital/'], ['/_investment-options/', '/investment-options/'], ['/blogs-2/', '/blogs/'], ['/contact-test/', '/contact-us/'], ['/sample-page/', '/'],
  ['/category/blogs/', '/blogs/'], ['/category/industry-reports/', '/industry-reports/'], ['/category/whitepapers/', '/whitepapers/'],
  ['/feed/', '/feed.xml'], ['/index.php', '/'], ['/case-studies/', '/insights/'], ['/pitch-deck-templates/', '/whitepapers/'], ['/faq/', '/investor-faqs/'], ['/faqs/', '/investor-faqs/'], ['/about/', '/about-us/'], ['/contact/', '/contact-us/'], ['/terms/', '/terms-and-conditions/'],
  ['/wp-content/uploads/2025/11/The-Silent-Shift_-Early-Stage-Liquidity-Is-Re-Writing-VC-Economics-_-Evolve-VC_compressed.pdf', '/assets/downloads/the-silent-shift-early-stage-liquidity-evolve-vc.pdf'],
];
const WILDCARDS = [['/category/*', '/insights/'], ['/author/*', '/about-us/'], ['/tag/*', '/insights/']];

export function serverFiles() {
  const headersFile = `/*\n${Object.entries(HEADERS).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/*.html\n  Cache-Control: no-cache\n\n/\n  Cache-Control: no-cache\n`;
  const redirectsFile = [...REDIRECTS, ...WILDCARDS].map(([a, b]) => `${a}  ${b}  301`).join('\n') + '\n';
  const hdrApache = Object.entries(HEADERS).map(([k, v]) => `  Header always set ${k} "${v.replace(/"/g, '\\"')}"`).join('\n');
  const htaccess = `# Evolve Venture Capital — Apache hardening, redirects and caching
# Requires mod_rewrite, mod_headers, mod_expires, mod_deflate (standard on shared hosting).
Options -Indexes -MultiViews
ServerSignature Off
DirectoryIndex index.html
ErrorDocument 404 /404.html
ErrorDocument 403 /404.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  # 1) Force HTTPS (also behind a proxy / CDN) and the canonical non-www host — runs before any cache.
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://evolvevcap.com%{REQUEST_URI} [L,R=301]
  RewriteCond %{HTTP_HOST} ^www\\. [NC]
  RewriteRule ^ https://evolvevcap.com%{REQUEST_URI} [L,R=301]
  # 2) Block dotfiles (except .well-known), backups, source and CMS probes
  RewriteRule ^(?!\\.well-known/)(.*/)?\\.[^/]+ - [F,L]
  RewriteRule ^api/submit\\.php$ - [L]
  RewriteRule \\.(bak|sql|log|ini|env|git|ya?ml|md|map|php|inc|sh)$ - [F,L]
  RewriteRule ^(wp-admin|wp-login|xmlrpc|wp-includes|wp-json) - [F,L]
  # 3) Retired and renamed WordPress URLs
${REDIRECTS.map(([a, b]) => `  RewriteRule ^${a.slice(1).replace(/[.]/g, '\\.')}$ ${b} [R=301,L]`).join('\n')}
  RewriteRule ^category/ /insights/ [R=301,L]
  RewriteRule ^author/ /about-us/ [R=301,L]
  RewriteRule ^tag/ /insights/ [R=301,L]
</IfModule>

<IfModule mod_headers.c>
${hdrApache}
  Header unset X-Powered-By
  Header always unset X-Powered-By
  <FilesMatch "\\.(css|js|woff2|webp|jpg|png|svg|pdf)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(html|xml|txt|webmanifest)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
  AddType font/woff2 .woff2
  AddType image/webp .webp
  AddType text/javascript .js
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json application/xml image/svg+xml text/plain
</IfModule>
`;
  return { _headers: headersFile, _redirects: redirectsFile, '.htaccess': htaccess };
}

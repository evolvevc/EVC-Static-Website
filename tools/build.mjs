// Static site generator: node tools/build.mjs  ->  dist/
import { rmSync, mkdirSync, writeFileSync, readFileSync, cpSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import { page, SITE, esc, abs } from './lib/site.mjs';
import { eMarkFile, logoFile } from './lib/brand.mjs';
import { posts } from './lib/content.mjs';
import * as home from './pages/home.mjs';
import * as core from './pages/core.mjs';
import * as res from './pages/resources.mjs';
import * as misc from './pages/misc.mjs';
import { allToolPages } from './pages/tools.mjs';
import { makeOg } from './og.mjs';
import { serverFiles } from './server-files.mjs';

const DIST = 'dist';
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const write = (p, c) => { const f = join(DIST, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, c); };

/* ---------- static assets ---------- */
cpSync('src/assets', join(DIST, 'assets'), { recursive: true });
write('assets/img/e-mark.svg', eMarkFile);
write('assets/img/e-mark-green.svg', eMarkFile.replace('#ffffff', '#0abf84'));
write('assets/img/logo.svg', logoFile());
await sharp('build-inputs/logo.png').resize({ width: 1776 }).png({ compressionLevel: 9 }).toFile(join(DIST, 'assets/img/logo.png'));
const emblem = readFileSync('src/assets/img/emblem-512.png');
for (const [n, s] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) await sharp(emblem).resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(join(DIST, n));
write('manifest.webmanifest', JSON.stringify({ name: SITE.name, short_name: 'Evolve VC', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#eef9f4', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }));

/* ---------- CSS + JS ---------- */
const css = ['fonts', 'base', 'components', 'pages', 'gfx'].map((n) => readFileSync(`src/css/${n}.css`, 'utf8')).join('\n');
const minCss = (await esbuild.transform(css, { loader: 'css', minify: true })).code;
write('assets/css/site.css', minCss);
const jsFiles = readdirSync('src/js').filter((f) => f.endsWith('.js'));
for (const f of jsFiles) write(`assets/js/${f}`, (await esbuild.transform(readFileSync(`src/js/${f}`, 'utf8'), { minify: true, target: 'es2020' })).code);
const V = createHash('md5').update(minCss + jsFiles.map((f) => readFileSync(`src/js/${f}`, 'utf8')).join('')).digest('hex').slice(0, 8);

/* ---------- pages ---------- */
const builders = [
  home.build(), core.about(), core.startInvesting(), core.raiseCapital(), core.fundingSolutions(), core.investmentOptions(), core.mentorship(), core.dueDiligence(),
  res.investorFaqs(), res.whitepaperPage(), res.roti(), res.insightsHub(), res.blogsHub(), res.reportsHub(),
  ...allToolPages(),
  misc.contact(), misc.privacy(), misc.terms(), misc.cookies(), misc.notFound(),
  ...posts.map((p) => res.post(p)),
];
// Per-page SEO title/description overrides, written by the portal's Pages screen (portal/server/publish.mjs).
// Absent by default — nothing here requires the portal to exist. Never applies to article pages: those own
// their SEO title/description directly (see tools/pages/resources.mjs post(), and the portal's Articles editor).
const seoOverrides = existsSync('content/portal-seo-overrides.json') ? JSON.parse(readFileSync('content/portal-seo-overrides.json', 'utf8')) : {};

const urls = [];
for (const b of builders) {
  const ov = seoOverrides[b.path];
  if (ov && b.headProps.type !== 'article') { if (ov.title) b.headProps.title = ov.title; if (ov.description) b.headProps.description = ov.description; }
  const html = page({ path: b.path, headProps: b.headProps, body: b.body, bodyClass: b.bodyClass || '' }).replaceAll('__V__', V);
  const out = b.path === '/404.html' ? '404.html' : join(b.path, 'index.html');
  write(out, html);
  if (b.headProps.robots !== 'noindex, follow') urls.push({ loc: abs(b.path), path: b.path, lastmod: (b.path.length > 1 && posts.find((p) => p.path === b.path)?.modified) || new Date().toISOString() });
}

/* ---------- OG images ---------- */
await makeOg(builders, posts);

/* ---------- discovery files ---------- */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /404.html\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
const pageList = [['Home', '/'], ['About', '/about-us/'], ['Start Investing', '/start-investing/'], ['Raise Capital', '/raise-capital/'], ['Funding Solutions', '/funding-solutions/'], ['Investment Options', '/investment-options/'], ['Startup Mentorship', '/startup-mentorship/'], ['Due Diligence', '/due-diligence/'], ['Investor FAQs', '/investor-faqs/'], ['Whitepapers', '/whitepapers/'], ['ROTI Calculator', '/return-on-time-invested-roti-calculator/'], ['Free Tools', '/tools/'], ['Contact', '/contact-us/']];
write('llms.txt', `# ${SITE.name}\n\n> ${SITE.name} is a Singapore-based venture capital firm connecting ambitious founders with visionary investors across Southeast Asia and India. Offices: Singapore (headquarters), Hyderabad and Guntur, India. Contact: ${SITE.email}\n\n## Key pages\n${pageList.map(([n, p]) => `- [${n}](${SITE.url}${p})`).join('\n')}\n\n## Insights\n- [All insights](${SITE.url}/insights/)\n- [Blogs](${SITE.url}/blogs/)\n- [Industry reports](${SITE.url}/industry-reports/)\n${posts.slice(0, 12).map((p) => `- [${p.title}](${SITE.url}${p.path}): ${p.excerpt.slice(0, 140)}`).join('\n')}\n\n## Optional\n- [Sitemap](${SITE.url}/sitemap.xml)\n- [Privacy Policy](${SITE.url}/privacy-policy/)\n- [Terms & Conditions](${SITE.url}/terms-and-conditions/)\n`);
write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(SITE.name)} Insights</title><link>${SITE.url}/insights/</link><description>Funding trends and founder playbooks across Southeast Asia and India.</description><language>en</language><atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>\n${posts.slice(0, 30).map((p) => `<item><title>${esc(p.title)}</title><link>${SITE.url}${p.path}</link><guid isPermaLink="true">${SITE.url}${p.path}</guid><pubDate>${new Date(p.published).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('\n')}\n</channel></rss>\n`);
write('.well-known/security.txt', `Contact: mailto:${SITE.email}\nExpires: 2027-10-27T00:00:00.000Z\nPreferred-Languages: en\nCanonical: ${SITE.url}/.well-known/security.txt\nPolicy: ${SITE.url}/privacy-policy/\n`);
for (const [p, c] of Object.entries(serverFiles({ posts }))) write(p, c);

console.log(`Built ${builders.length} pages, version ${V}, ${urls.length} URLs in sitemap.`);

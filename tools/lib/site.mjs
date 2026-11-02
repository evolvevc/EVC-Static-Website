// Shared site config, helpers and layout partials.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
import { logoSvg, icon } from './brand.mjs';

export const cfg = existsSync(ROOT + 'site.config.json') ? JSON.parse(readFileSync(ROOT + 'site.config.json', 'utf8')) : {};
export const IMG = JSON.parse(readFileSync(ROOT + 'content/img-map.json', 'utf8'));

export const SITE = {
  name: 'Evolve Venture Capital',
  legalName: 'Evolve Venture Capital Pte. Ltd.',
  url: cfg.siteUrl || 'https://evolvevcap.com',
  email: 'contact@evolvevcap.com',
  tagline: 'Venture capital firm in Singapore and India',
  ga4: cfg.ga4 || 'G-L7W09B9XS0',
  formEndpoint: cfg.formEndpoint || '',
  publicKey: cfg.publicKeyJwkBase64 || '',
  offices: [
    { id: 'sg', city: 'Singapore', role: 'Headquarters', lines: ['1 Raffles Place, #34-04', 'Singapore 048616'], addr: { streetAddress: '1 Raffles Place, #34-04', addressLocality: 'Singapore', postalCode: '048616', addressCountry: 'SG' }, coords: '1.29° N · 103.85° E' },
    { id: 'hyd', city: 'Hyderabad', role: 'India office', lines: ['16-2-100/728/729, Flat No 5A, Grand View Tower', 'Gopal Nagar, Hydernagar, KPHB', 'Hyderabad, Telangana, India - 500085'], addr: { streetAddress: '16-2-100/728/729, Flat No 5A, Grand View Tower, Gopal Nagar, Hydernagar, KPHB', addressLocality: 'Hyderabad', addressRegion: 'Telangana', postalCode: '500085', addressCountry: 'IN' }, coords: '17.38° N · 78.48° E' },
    { id: 'gnt', city: 'Guntur', role: 'India office', lines: ['5th Floor, Friends Plaza', 'Mainroad Lakshmipuram', 'Guntur, Andhra Pradesh, India - 522007'], addr: { streetAddress: '5th Floor, Friends Plaza, Mainroad Lakshmipuram', addressLocality: 'Guntur', addressRegion: 'Andhra Pradesh', postalCode: '522007', addressCountry: 'IN' }, coords: '16.31° N · 80.44° E' },
  ],
  socials: [
    { n: 'LinkedIn', i: 'linkedin', u: 'https://www.linkedin.com/company/evolvevc' },
    { n: 'X', i: 'x', u: 'https://x.com/evolvevc' },
    { n: 'Instagram', i: 'instagram', u: 'https://www.instagram.com/evolvevcap/' },
    { n: 'Facebook', i: 'facebook', u: 'https://www.facebook.com/evolvevc' },
    { n: 'YouTube', i: 'youtube', u: 'https://www.youtube.com/@evolvevc' },
    { n: 'Pinterest', i: 'pinterest', u: 'https://www.pinterest.com/evolvevcap/' },
  ],
};

export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Start Investing', href: '/start-investing/' },
  { label: 'Raise Capital', href: '/raise-capital/' },
  { label: 'Services', children: [
    { label: 'Funding Solutions', href: '/funding-solutions/', desc: 'Seed, expansion, bridge and convertible capital' },
    { label: 'Investment Options', href: '/investment-options/', desc: 'Four ways to back Southeast Asia and India' },
    { label: 'Startup Mentorship', href: '/startup-mentorship/', desc: 'Operators and advisors beside you' },
    { label: 'Due Diligence', href: '/due-diligence/', desc: 'How we assess every opportunity' },
  ] },
  { label: 'Insights', children: [
    { label: 'Blogs', href: '/blogs/', desc: 'Funding, markets and founder playbooks' },
    { label: 'Industry Reports', href: '/industry-reports/', desc: 'Regional trends and analysis' },
    { label: 'All Insights', href: '/insights/', desc: 'Search and filter every article' },
  ] },
  { label: 'Resources', children: [
    { label: 'Investor FAQs', href: '/investor-faqs/', desc: 'Answers for founders and investors' },
    { label: 'Whitepapers', href: '/whitepapers/', desc: 'Practical guides, free to download' },
  ] },
  { label: 'Free Tools', wide: true, children: [
    { label: 'All Free Tools', href: '/tools/', desc: 'Every calculator, checklist and guide in one place' },
    { label: 'Dilution Calculator', href: '/tools/dilution-calculator/', desc: 'What founders keep after each round' },
    { label: 'Convertible Note & SAFE', href: '/tools/convertible-note-calculator/', desc: 'Conversion price, shares and ownership' },
    { label: 'Readiness Checklist', href: '/tools/fundraising-readiness-checklist/', desc: 'Are you ready to meet investors?' },
    { label: 'Runway & Burn', href: '/tools/runway-calculator/', desc: 'Months of cash and when to raise' },
    { label: 'Fund Returns', href: '/tools/fund-returns-calculator/', desc: 'MOIC, DPI, TVPI and approximate IRR' },
    { label: 'ROTI Calculator', href: '/return-on-time-invested-roti-calculator/', desc: 'Measure the return on your time' },
    { label: 'Equity Split', href: '/tools/founder-equity-split-calculator/', desc: 'A fair starting split for co-founders' },
    { label: 'VC Glossary', href: '/tools/venture-capital-glossary/', desc: '44 terms in plain English' },
    { label: 'Pitch Deck Outline', href: '/tools/pitch-deck-outline/', desc: 'The 12 slides investors expect' },
  ] },
  { label: 'About Us', href: '/about-us/' },
  { label: 'Contact Us', href: '/contact-us/' },
];

export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const abs = (p) => (p.startsWith('http') ? p : SITE.url + p);
export const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export { icon, logoSvg };

/** Responsive <img> from a remote URL that was processed by tools/assets.mjs */
export function img(url, alt = '', { sizes = '100vw', eager = false, cls = '', fetchpriority } = {}) {
  const m = IMG[url];
  if (!m) return '';
  const srcset = m.widths.map((w) => `/assets/img/${m.name}-${w}.webp ${w}w`).join(', ');
  const src = `/assets/img/${m.name}-${m.widths[m.widths.length - 1]}.webp`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${src}" srcset="${srcset}" sizes="${sizes}" width="${m.w}" height="${m.h}" alt="${esc(alt)}" ${eager ? 'loading="eager"' : 'loading="lazy"'} decoding="async"${fetchpriority ? ` fetchpriority="${fetchpriority}"` : ''}>`;
}
export const imgSrc = (url) => { const m = IMG[url]; return m ? `/assets/img/${m.name}-${m.widths[m.widths.length - 1]}.webp` : ''; };
export const U = (path) => 'https://evolvevcap.com/wp-content/uploads/' + path;

/* ---------- JSON-LD ---------- */
export function orgSchema() {
  return {
    '@type': ['Organization', 'FinancialService'],
    '@id': SITE.url + '/#organization',
    name: SITE.name, legalName: SITE.legalName, url: SITE.url + '/',
    logo: { '@type': 'ImageObject', url: SITE.url + '/assets/img/logo.png', width: 1776, height: 486 },
    image: SITE.url + '/assets/og/default.jpg',
    description: 'Evolve Venture Capital is a Singapore-based venture capital firm connecting ambitious founders with visionary investors across Southeast Asia and India.',
    email: SITE.email,
    areaServed: ['Singapore', 'India', 'Southeast Asia'],
    address: SITE.offices.map((o) => ({ '@type': 'PostalAddress', ...o.addr })),
    location: SITE.offices.map((o) => ({ '@type': 'Place', name: `Evolve Venture Capital, ${o.city}`, address: { '@type': 'PostalAddress', ...o.addr } })),
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SITE.email, areaServed: ['SG', 'IN'], availableLanguage: ['en'] }],
    sameAs: SITE.socials.map((s) => s.u),
  };
}
export const websiteSchema = () => ({ '@type': 'WebSite', '@id': SITE.url + '/#website', url: SITE.url + '/', name: SITE.name, publisher: { '@id': SITE.url + '/#organization' }, inLanguage: 'en' });
export const crumbSchema = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: abs(c[1]) })) });
export const faqSchema = (faqs) => ({ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

/* ---------- Head ---------- */
export function head({ title, description, path, image, type = 'website', robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1', schema = [], preload = [], article }) {
  const canonical = abs(path);
  const og = abs(image || '/assets/og/default.jpg');
  const graph = [orgSchema(), websiteSchema(), ...schema];
  const art = article ? `<meta property="article:published_time" content="${article.published}"><meta property="article:modified_time" content="${article.modified}"><meta property="article:author" content="${SITE.name}">${(article.tags || []).map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('')}` : '';
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#eef9f4">
<meta name="color-scheme" content="light dark">
<meta property="og:site_name" content="${SITE.name}"><meta property="og:locale" content="en_SG"><meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)}">
${art}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@evolvevc"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${og}">
<meta name="evolve:contact-email" content="${SITE.email}"><meta name="evolve:form-endpoint" content="${esc(SITE.formEndpoint)}"><meta name="evolve:pubkey" content="${esc(SITE.publicKey)}"><meta name="evolve:ga4" content="${SITE.ga4}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${SITE.name} insights" href="/feed.xml">
<link rel="preload" href="/assets/fonts/lexend.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/atkinson-hyperlegible-next.woff2" as="font" type="font/woff2" crossorigin>
${preload.map((p) => `<link rel="preload" as="image" href="${p}">`).join('\n')}
<link rel="stylesheet" href="/assets/css/site.css?v=__V__">
<script src="/assets/js/boot.js?v=__V__"></script>
<script type="speculationrules">{"prefetch":[{"where":{"href_matches":"/*"},"eagerness":"moderate"}]}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

/* ---------- Header / footer ---------- */
const isCurrent = (cur, href) => (href === '/' ? cur === '/' : cur === href || cur.startsWith(href));
export function header(cur) {
  const items = NAV.map((n) => {
    if (!n.children) return `<li class="nav__item"><a class="nav__link" href="${n.href}"${isCurrent(cur, n.href) ? ' aria-current="page"' : ''}>${n.label}</a></li>`;
    const act = n.children.some((c) => isCurrent(cur, c.href));
    return `<li class="nav__item"><button class="nav__link" type="button" aria-expanded="false" aria-haspopup="true"${act ? ' aria-current="true"' : ''}>${n.label}${icon('chevron')}</button><div class="mega${n.wide ? ' mega--wide' : ''}" role="menu">${n.children.map((c) => `<a role="menuitem" href="${c.href}"><strong>${c.label}${icon('arrow')}</strong><span>${c.desc}</span></a>`).join('')}</div></li>`;
  }).join('');
  const mobile = NAV.map((n) => n.children
    ? `<details><summary>${n.label}${icon('chevron')}</summary><div class="mm-sub">${n.children.map((c) => `<a href="${c.href}">${c.label}<small>${c.desc}</small></a>`).join('')}</div></details>`
    : `<a class="mm-link" href="${n.href}">${n.label}</a>`).join('');
  return `<header class="site-header" id="top">
<div class="container">
<a class="logo" href="/" aria-label="Evolve Venture Capital — home">${logoSvg()}</a>
<div class="header-right">
<nav class="nav" aria-label="Primary"><ul class="nav__list">${items}</ul></nav>
<a class="btn btn--sm header-cta" href="/raise-capital/#pitch">Pitch Your Startup ${icon('arrow')}</a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span></button>
</div>
</div></header>
<div class="mobile-menu" id="mobile-menu"><nav aria-label="Mobile">${mobile}<a class="btn btn--yellow" href="/raise-capital/#pitch">Pitch Your Startup ${icon('arrow')}</a></nav></div>`;
}

export const preloader = () => `<div class="preloader" aria-hidden="true"><div class="preloader__inner"><img class="preloader__emblem" src="/assets/img/emblem-192.png" width="96" height="96" alt=""><div class="preloader__word">${logoSvg({ variant: 'pre' })}</div><div class="preloader__meter"><i></i></div></div></div>`;

export const consent = () => `<div class="consent" id="consent" role="dialog" aria-modal="false" aria-labelledby="consent-title">
<div id="consent-main"><h2 id="consent-title">Your privacy</h2><p>We use essential storage to run this site. With your permission we also use privacy-friendly analytics to improve it. Nothing loads until you choose. <a href="/cookie-policy/">Cookie policy</a></p>
<div class="btn-row"><button class="btn btn--sm btn--green" type="button" data-consent="accept">Accept all</button><button class="btn btn--sm btn--ghost" type="button" data-consent="reject">Reject</button><button class="btn btn--sm btn--ghost" type="button" data-consent="prefs">Preferences</button></div></div>
<div id="consent-prefs" hidden><h2>Preferences</h2><p>Essential storage is always on. Analytics is optional.</p><label><input type="checkbox" id="consent-analytics"> Allow analytics (Google Analytics 4, anonymised IP)</label><div class="btn-row"><button class="btn btn--sm btn--green" type="button" data-consent="save">Save choices</button></div></div>
</div>`;

export function footer() {
  const col = (title, links) => `<div><h2>${title}</h2><ul>${links.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-footer">
<div class="container footer__grid">
<div class="footer__brand"><a class="logo" href="/" aria-label="Evolve Venture Capital — home">${logoSvg()}</a>
<p>Evolve Venture Capital is a Singapore-based venture capital firm connecting ambitious founders with visionary investors across Southeast Asia and India.</p>
<form class="newsletter" data-secure-form="newsletter" data-success="You are subscribed. Thank you." novalidate aria-label="Newsletter"><div class="field"><label class="sr-only" for="nl-email">Email address</label><input id="nl-email" name="email" type="email" placeholder="Your email address" autocomplete="email" required><span class="err" aria-live="polite"></span></div><div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><button class="btn btn--sm btn--yellow" type="submit">Subscribe</button><div class="form__status" role="status"></div></form>
<div class="socials">${SITE.socials.map((s) => `<a href="${s.u}" target="_blank" rel="noopener noreferrer" aria-label="${s.n}">${icon(s.i)}</a>`).join('')}</div></div>
${col('Raise / Invest', [['Start Investing', '/start-investing/'], ['Raise Capital', '/raise-capital/'], ['Due Diligence', '/due-diligence/']])}
${col('Services', [['Funding Solutions', '/funding-solutions/'], ['Investment Options', '/investment-options/'], ['Startup Mentorship', '/startup-mentorship/']])}
${col('Resources', [['Investor FAQs', '/investor-faqs/'], ['Whitepapers', '/whitepapers/'], ['Free Tools', '/tools/'], ['ROTI Calculator', '/return-on-time-invested-roti-calculator/'], ['Blogs', '/blogs/'], ['Industry Reports', '/industry-reports/']])}
<div><h2>Contact</h2><ul><li><a href="mailto:${SITE.email}">${SITE.email}</a></li><li><a href="/contact-us/">Contact Us</a></li><li><a href="/about-us/">About Us</a></li></ul></div>
</div>
<div class="footer__word" aria-hidden="true">${logoSvg({ title: '' })}</div>
<div class="container footer__legal"><span>© ${new Date().getFullYear()} ${SITE.legalName}. All rights reserved.</span>
<ul><li><a href="/privacy-policy/">Privacy Policy</a></li><li><a href="/terms-and-conditions/">Terms &amp; Conditions</a></li><li><a href="/cookie-policy/">Cookie Policy</a></li><li><a href="#" data-consent-open>Cookie settings</a></li></ul>
<p class="footer__credit">Website designed &amp; developed by <a href="https://www.pulsedigimedia.com" target="_blank" rel="noopener">Pulse Digital Media</a></p></div>
</footer>`;
}

/** Full document */
export function page({ path, headProps, body, bodyClass = '', scripts = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
${head({ path, ...headProps })}
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#main">Skip to content</a>
${preloader()}
<div class="progress-bar" aria-hidden="true"></div>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${consent()}
<button class="to-top" type="button" aria-label="Back to top">${icon('arrow')}</button>
<script type="module" src="/assets/js/main.js?v=__V__"></script>
${scripts}
</body>
</html>`;
}

/* ---------- Component helpers used by pages ---------- */
export const crumbs = (items) => `<ol class="crumbs" aria-label="Breadcrumb">${items.map((c, i) => `<li>${i < items.length - 1 ? `<a href="${c[1]}">${c[0]}</a>` : `<span aria-current="page">${c[0]}</span>`}</li>`).join('')}</ol>`;

export function pageHero({ crumbItems, eyebrow, h1, lead, ctas = '', media = '' }) {
  return `<section class="page-hero">
<div class="page-hero__mark page-hero__mark--l" aria-hidden="true"></div><div class="page-hero__mark page-hero__mark--r" aria-hidden="true"></div>
<div class="container${media ? ' has-media' : ''}"><div class="page-hero__inner">${crumbs(crumbItems)}${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1 class="h1" data-split>${h1}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${ctas ? `<div class="btn-row">${ctas}</div>` : ''}</div>${media ? `<div class="page-hero__media">${media}</div>` : ''}</div>
<div class="page-hero__bar" aria-hidden="true"></div></section>`;
}

export const btn = (label, href, cls = '', attrs = '') => `<a class="btn ${cls}" href="${href}" ${attrs}>${label} ${icon('arrow')}</a>`;
export const titleBlock = ({ eyebrow, h2, lead, center = false, tag = 'h2' }) => `<div class="title-block${center ? ' center' : ''}">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<${tag} class="h2" data-split>${h2}</${tag}>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;

/** Accordion from [{q,a}] — answers are HTML-escaped text */
export const accordion = (faqs, { single = true } = {}) => `<div class="acc"${single ? ' data-acc-single' : ''}>${faqs.map((f, i) => `<details${i === 0 && false ? ' open' : ''}><summary><span>${esc(f.q)}</span><span class="plus" aria-hidden="true"></span></summary><div class="acc__body"><p>${esc(f.a)}</p></div></details>`).join('')}</div>`;

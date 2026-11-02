// Content layer: processed posts, FAQ copy, whitepaper catalogue.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
import * as cheerio from 'cheerio';
import { IMG, img, esc, slugify } from './site.mjs';

const raw = JSON.parse(readFileSync(ROOT + 'content/posts.json', 'utf8'));
const faqRaw = JSON.parse(readFileSync(ROOT + 'content/faqs-raw.json', 'utf8'));
// Written by the portal (portal/server/publish.mjs) whenever an admin publishes an article or whitepaper there.
// Both files are plain, hand-editable JSON and start out absent/empty — nothing here requires the portal to exist.
const readJsonIfExists = (p, fallback) => (existsSync(ROOT + p) ? JSON.parse(readFileSync(ROOT + p, 'utf8')) : fallback);
const portalRaw = readJsonIfExists('content/portal-posts.json', []);
const portalWhitepapers = readJsonIfExists('content/portal-whitepapers.json', []);

/* ---------- Posts ---------- */
const REPORT_SLUGS = new Set([
  'the-illusion-of-stability-why-your-safe-portfolio-is-the-greatest-threat-to-your-legacy',
  'we-are-not-out-of-the-bear-market-heres-the-hidden-indicator-that-says-vcs-are-wrong',
  'the-ai-funding-frenzy-climate-tech-cool-down-whats-your-2025-investment-play',
  'ai-funding-boom-october-2025s-1billiondollars-signals-new-vc-era',
  'dubais-ai-push-diversis-capitals-1billiondollars-fund-a-defining-moment-for-global-investors',
  'ai-and-tariffs-shaping-2025s-venture-capital-trends',
  'navigating-the-regional-markets-a-venture-capital-perspective',
  'innovation-is-overhyped-heres-whats-actually-worth-your-time-and-investment',
  '2025-tech-sector-insights-trends-opportunities-and-challenges',
  'global-financial-market-trends-in-2025-opportunities-and-challenges',
  'global-tech-industry-trends-in-april-2025-opportunities-and-challenges',
]);
const TOPICS = ['Funding Insights', 'Market Trends', 'Growth Strategies', 'Investor Tips', 'Financial Planning', 'Leadership Advice', 'Sustainable Tech Insights'];
const TOPIC_MAP = { 'Funding Analysis': 'Funding Insights', 'Sector Insights': 'Sustainable Tech Insights', 'Climate Tech Investing': 'Sustainable Tech Insights', 'Global Trends': 'Market Trends', 'Regional Markets': 'Market Trends', 'Innovation Reports': 'Market Trends', 'Investor Behavior': 'Investor Tips', 'Investment Strategies': 'Investor Tips' };

const ALLOWED = new Set(['a', 'strong', 'em', 'b', 'i', 'br', 'sup', 'sub', 'span', 'u']);
export function sanitize(html) {
  const $ = cheerio.load(`<div id="r">${html}</div>`, null, false);
  $('#r *').each((_, el) => {
    if (!ALLOWED.has(el.tagName)) { $(el).replaceWith($(el).contents()); return; }
    const keep = {};
    if (el.tagName === 'a') {
      let h = $(el).attr('href') || '';
      h = h.replace(/^https?:\/\/(www\.)?evolvevcap\.com/, '');
      if (/\/wp-content\/uploads\//.test(h)) { $(el).replaceWith($(el).contents()); return; }
      h = { '/about': '/about-us/', '/about/': '/about-us/', '/contact': '/contact-us/', '/blog/': '/blogs/' }[h] || h;
      if (/^(https?:|mailto:|\/|#)/.test(h)) { keep.href = h; if (/^https?:/.test(h)) { keep.rel = 'noopener noreferrer'; keep.target = '_blank'; } }
    }
    el.attribs = keep;
  });
  return $('#r').html().replace(/ /g, ' ').trim();
}

const cleanTitle = (t) => t.replace(/\s+/g, ' ').replace(/\s*[|\-–—]\s*Evolve.*$/i, '').trim();
const readMin = (p) => { const m = /(\d+)/.exec(p.readTime || ''); return m ? +m[1] : Math.max(3, Math.round(p.blocks.reduce((a, b) => a + (b.text || '').split(' ').length, 0) / 210)); };

function blocksToHtml(p) {
  let last = 1; const out = []; const toc = []; const seen = new Map();
  for (const b of p.blocks) {
    if (b.t === 'p') {
      if (/<img/i.test(b.html)) {
        const $i = cheerio.load(b.html, null, false);
        $i('img').each((_, im) => { const src = $i(im).attr('src') || $i(im).attr('data-src'); const full = src && src.replace(/-\d+x\d+(\.\w+)$/, '$1'); const tag = img(IMG[full] ? full : src, $i(im).attr('alt') || '', { sizes: '(min-width: 900px) 760px, 100vw' }); if (tag) out.push(`<figure>${tag}</figure>`); $i(im).remove(); });
        const rest = sanitize($i.html()); if (rest.replace(/<[^>]+>/g, '').trim()) out.push(`<p>${rest}</p>`);
      } else { const h = sanitize(b.html); if (h) out.push(`<p>${h}</p>`); }
    }
    else if (/^h[2-6]$/.test(b.t)) {
      let lvl = +b.t[1]; if (lvl > last + 1) lvl = last + 1; if (lvl < 2) lvl = 2; last = lvl;
      const text = b.text.replace(/\s+/g, ' ').trim(); let id = slugify(text).slice(0, 60) || 'section'; const n = (seen.get(id) || 0) + 1; seen.set(id, n); if (n > 1) id += '-' + n;
      if (lvl === 2) toc.push({ id, text });
      out.push(`<h${lvl} id="${id}">${sanitize(b.html)}</h${lvl}>`);
    } else if (b.t === 'ul' || b.t === 'ol') out.push(`<${b.t}>${b.items.map((i) => `<li>${sanitize(i)}</li>`).join('')}</${b.t}>`);
    else if (b.t === 'img') { const i = img(b.src, b.alt || '', { sizes: '(min-width: 900px) 760px, 100vw' }); if (i) out.push(`<figure>${i}</figure>`); }
    else if (b.t === 'table') { const $ = cheerio.load(b.html, null, false); $('*').removeAttr('style').removeAttr('class').removeAttr('id'); out.push(`<div class="table-wrap">${$.html()}</div>`); }
    else if (b.t === 'blockquote') { out.push(`<blockquote>${sanitize(cheerio.load(b.html, null, false).text())}</blockquote>`); }
  }
  return { html: out.join('\n'), toc };
}

/** Portal-authored body is already sanitized once (portal/server/sanitize-html.mjs) before it's saved; this is
    a second, cheap defensive pass for anyone who hand-edits content/portal-posts.json directly, plus heading
    id + table-of-contents assignment — the same job blocksToHtml() does for scraped posts, just working from
    finished HTML instead of raw blocks. */
function portalBodyToHtml(html) {
  const $ = cheerio.load(`<div id="r">${html || ''}</div>`, null, false);
  $('#r script, #r style, #r iframe, #r object, #r embed, #r form').remove();
  $('#r *').each((_, el) => { for (const a of Object.keys(el.attribs || {})) if (/^on/i.test(a) || (a === 'style')) delete el.attribs[a]; });
  const toc = []; const seen = new Map();
  $('#r h2').each((_, h) => {
    const text = $(h).text().replace(/\s+/g, ' ').trim();
    let id = ($(h).attr('id') || '').trim() || slugify(text).slice(0, 60) || 'section';
    const n = (seen.get(id) || 0) + 1; seen.set(id, n); if (n > 1) id += '-' + n;
    $(h).attr('id', id); toc.push({ id, text });
  });
  return { html: $('#r').html() || '', toc };
}

const portalPosts = portalRaw.map((p) => {
  const body = portalBodyToHtml(p.body);
  const words = body.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const excerpt = (p.excerpt || p.description || '').replace(/\s+/g, ' ').trim();
  const topics = (p.topics && p.topics.length) ? p.topics : [p.type === 'report' ? 'Market Trends' : 'Funding Insights'];
  return {
    slug: p.slug, path: `/${p.slug}/`, title: (p.title || '').replace(/\s+/g, ' ').trim(), seoTitle: (p.seoTitle || p.title || '').replace(/\s+/g, ' ').trim(),
    description: (p.description || excerpt).replace(/\s+/g, ' ').trim(),
    excerpt: excerpt.length > 190 ? excerpt.slice(0, 187).replace(/\s+\S*$/, '') + '…' : excerpt,
    published: p.published, modified: p.modified || p.published, readMin: Math.max(3, Math.round(words / 210)),
    type: p.type === 'report' ? 'report' : 'blog', topics, tags: p.tags || [], image: p.image || '', body: body.html, toc: body.toc, words,
  };
});

const scrapedPosts = raw.map((p) => {
  const cats = p.categories || [];
  const isReport = REPORT_SLUGS.has(p.slug);
  const topics = [...new Set(cats.map((c) => (TOPICS.includes(c) ? c : TOPIC_MAP[c])).filter(Boolean))];
  if (!topics.length) topics.push(isReport ? 'Market Trends' : 'Funding Insights');
  const body = blocksToHtml(p);
  const first = p.blocks.find((b) => b.t === 'p');
  const desc = (p.description || (first && first.text) || '').replace(/\s+/g, ' ').trim();
  const excerpt = (first?.text || desc).replace(/\s+/g, ' ');
  return {
    slug: p.slug, path: `/${p.slug}/`, title: p.title.replace(/\s+/g, ' ').trim(), seoTitle: cleanTitle(p.seoTitle),
    description: desc, excerpt: excerpt.length > 190 ? excerpt.slice(0, 187).replace(/\s+\S*$/, '') + '…' : excerpt,
    published: p.published, modified: p.modified || p.published, readMin: readMin(p),
    type: isReport ? 'report' : 'blog', topics, tags: p.tags || [], image: p.image, body: body.html, toc: body.toc,
    words: p.blocks.reduce((a, b) => a + (b.text || (b.items || []).join(' ') || '').split(/\s+/).length, 0),
  };
});
// Portal-authored articles are merged in and the whole set re-sorted newest first, so latest()/byType() behave
// the same regardless of which pipeline a given post came from.
export const posts = [...scrapedPosts, ...portalPosts].sort((a, b) => b.published.localeCompare(a.published));
{ const seen = new Map(); for (const p of posts) { const k = p.seoTitle + '|' + p.description; if (seen.has(k)) { p.seoTitle = p.title; p.description = p.excerpt; } else seen.set(k, p.slug); } }
export const TOPIC_LIST = TOPICS;
export const byType = (t) => posts.filter((p) => p.type === t);
export const latest = (n = 3) => posts.slice(0, n);
export const related = (p, n = 3) => posts.filter((x) => x.slug !== p.slug).map((x) => ({ x, s: x.topics.filter((t) => p.topics.includes(t)).length * 2 + (x.type === p.type ? 1 : 0) })).sort((a, b) => b.s - a.s || b.x.published.localeCompare(a.x.published)).slice(0, n).map((o) => o.x);

/** Post card HTML */
export function postCard(p, { feature = false, eager = false, h = 3 } = {}) {
  const t = p.type === 'report' ? 'Industry report' : p.topics[0];
  const media = img(p.image, p.title, { sizes: feature ? '(min-width: 900px) 640px, 100vw' : '(min-width: 1100px) 400px, (min-width: 700px) 45vw, 100vw', eager });
  const d = new Date(p.published).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `<article class="post-card${feature ? ' post-card--feature' : ''}" data-cats="${esc([...p.topics, p.type === 'report' ? 'Industry Reports' : 'Blogs'].join('|'))}" data-text="${esc((p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase())}" data-cursor="Read"><div class="post-card__media">${media}</div><div class="post-card__body"><div class="post-card__meta"><span class="chip chip--tag">${esc(t)}</span><time datetime="${p.published}">${d}</time><span>${p.readMin} min read</span></div><h${h}><a href="${p.path}">${esc(p.title)}</a></h${h}><p>${esc(p.excerpt)}</p></div></article>`;
}

/* ---------- FAQs ---------- */
const fix = (s) => s.replace(/\s+/g, ' ').trim();
export const faqStart = faqRaw['_start-investing_'].map((f) => ({ q: fix(f.q), a: fix(f.a) }));
export const faqRaise = faqRaw['_raise-capital_'].map((f) => ({ q: fix(f.q), a: fix(f.a) }));

// Investor FAQ: questions are unchanged from the previous site. Answers were rewritten to remove unverifiable
// statistics, fund-performance figures and superlatives (see docs/CHANGES.md).
const L = (q, a) => ({ q, a });
export const faqInvestor = [
  { cat: 'Firm Overview', items: [
    L('What makes Evolve VC unique in Asian markets?', 'Evolve is a Singapore-headquartered venture capital firm with offices in Hyderabad and Guntur, India. That presence gives us on-the-ground insight into the Singapore–India corridor. We invest across sectors, aim to be an active partner rather than a passive financier, and stay involved after investment through our mentorship programme.'),
    L('Which high-growth sectors do you prioritize?', 'We back technology-led businesses, including AI and machine learning, fintech and payments, healthtech, climate and clean technology, and enterprise software. We look for companies that can scale across Southeast Asia and India and are solving a regional problem, not just a local one.'),
    L("What's your geographic investment strategy?", 'We cover Singapore, India, Malaysia, Dubai (UAE), London (UK) and the USA, working across borders from our Singapore headquarters. Opportunities outside these markets are considered where there is a clear link to them.'),
    L('Which startup stages do you fund?', 'We focus on early-stage companies, from seed and pre-Series A through Series A, and we consider growth-stage opportunities. Ticket sizes depend on the opportunity and are discussed directly with founders.'),
    L('Do you lead investment rounds?', 'Where the opportunity and the terms fit, yes. We aim to structure founder-friendly terms with balanced governance, and we also co-invest alongside other investors in cross-border syndicates.'),
    L("How does your team's expertise benefit startups?", 'Our team combines venture investing experience with operating and advisory backgrounds across Singapore, India and Southeast Asia. Founders get practical help with go-to-market, fundraising and governance through one-on-one mentorship, workshops and our advisor network.'),
  ] },
  { cat: 'Investment Process', items: [
    L('How do I submit my startup for funding?', 'Submit your pitch through the form on our Raise Capital page, with your deck and key materials such as financial projections, cap table and market analysis. Every submission is read by our investment team, and you will hear from us either way.'),
    L('What are key due diligence focus areas?', 'We assess market opportunity, product and IP defensibility, unit economics, founder-market fit and regulatory compliance. Our due diligence also looks at the people behind the company. See our Due Diligence page for the full approach.'),
    L('How long until funding disbursement?', 'Timelines vary by deal. After an initial review within 5 business days and a founder call, due diligence and the term sheet typically take 4 to 6 weeks.'),
    L('What ownership stake do you require?', "There is no fixed stake. Ownership depends on valuation, round size and stage, and is agreed in the term sheet. Our aim is a structure that keeps founders motivated and in control of the company's direction."),
    L('Do you use SAFE/convertible notes?', 'Yes, where they suit the company. We offer equity investment, convertible notes and venture debt, and we choose the structure with you based on your stage and capital needs. See Funding Solutions for details.'),
    L('What disqualifies startups during screening?', 'Common reasons include weak unit economics, an unclear or fragmented cap table, undisclosed legal or regulatory issues, and a team that is not aligned. Being open about risks early helps far more than hiding them.'),
  ] },
  { cat: 'Portfolio Support', items: [
    L('How do you assist with India/ASEAN market entry?', 'Through our offices in Singapore, Hyderabad and Guntur and our partner network, we help portfolio companies understand local regulation, meet the right advisors and plan a practical entry strategy for India and Southeast Asia.'),
    L('Do you provide growth talent sourcing?', "We introduce portfolio companies to operators and advisors in our network and help founders think through key hires. Support is tailored to each company's stage."),
    L('How do you facilitate enterprise sales?', 'We open doors where we can through our network of corporate and investor relationships, and we help founders prepare for enterprise buyers, from positioning to pilot structure.'),
    L('Can you help secure follow-on funding?', 'Yes. We help portfolio companies prepare materials, sharpen their story and meet co-investors and later-stage funds when they are ready to raise again.'),
    L('What operational frameworks do you implement?', 'We work with founders on go-to-market plans, financial planning, KPI tracking and investor reporting. The frameworks are adapted to each company rather than imposed.'),
    L('How involved are you in governance?', 'We aim to provide strategic guidance rather than manage day-to-day operations. Board and information rights are agreed per deal, with regular reviews of progress against agreed milestones.'),
  ] },
  { cat: 'Returns & Exits', items: [
    L('What ROI targets do you set?', 'Venture investing is high-risk and returns are not guaranteed. We do not publish target returns. Expected outcomes depend on the company, the stage and the market, and prospective investors receive relevant information in the offering documents.'),
    L("What's your primary exit strategy?", 'Exits typically come through strategic acquisition, secondary sale or public listing, depending on the company and market conditions. We discuss likely exit routes with founders and investors from the start.'),
    L('How do you mitigate downside risk?', 'We diversify across stages and sectors, stage capital against milestones where appropriate, run thorough due diligence and negotiate protective terms. These measures reduce risk but cannot remove it, and capital can be lost.'),
    L("What's your 2025 fund performance?", 'We do not publish fund performance on this website. Eligible investors can request performance information through the investor relations process, subject to applicable regulations.'),
    L('How do currency risks impact Asian investments?', 'Investing across Singapore, India and Southeast Asia involves exposure to several currencies. We consider currency risk when structuring investments and discuss it with investors during the investment process.'),
    L('Do you facilitate secondary sales for founders?', 'Where it makes sense for the company and its investors, we can discuss partial liquidity options at later rounds. Any secondary transaction depends on the terms of the deal and market conditions.'),
  ] },
  { cat: 'Investor Relations', items: [
    L('How can I invest as an LP?', 'Investment opportunities are available to eligible investors, in line with applicable regulations. Contact us through the Start Investing page and our team will explain the process, including the information and verification checks we require.'),
    L('What reporting do LPs receive?', 'Investors receive regular updates on portfolio performance and company developments, plus periodic investor meetings. The format and frequency of reporting are set out in the investment documents.'),
    L('Are co-investment opportunities available?', "Co-investment opportunities arise from time to time for selected deals. Availability depends on the opportunity, the investor's profile and applicable regulations. Speak to our team to discuss your interests."),
    L('How do you address ESG compliance?', 'We consider environmental, social and governance factors during due diligence and portfolio support, with a growing focus on climate and sustainable technology. Our Insights section shares our views.'),
    L("What's your dry powder allocation?", 'We do not publish fund size or allocation figures on this website. Information about capital and deployment is shared with prospective investors directly.'),
    L('Do you use AI in portfolio management?', 'We use data and analytical tools to support deal evaluation and portfolio monitoring. Investment decisions are made by our team.'),
  ] },
  { cat: 'Founder Collaboration', items: [
    L('What founder traits do you prioritize?', 'We look for resilience, domain expertise, clear thinking and the ability to execute across borders. Our due diligence looks closely at how founders have handled adversity and how they work with their teams.'),
    L('Can I retain control post-investment?', "Our goal is to keep founders motivated and in control of the company's direction. Governance terms, such as board composition and reserved matters, are agreed in the term sheet and are founder-friendly where possible."),
    L('How do you support technical hiring?', 'We introduce portfolio companies to our network and advisors, and we help founders define roles, evaluate candidates and plan hiring as they scale.'),
    L('Do you help with regulatory licensing?', 'We help founders understand the regulatory requirements in their markets and connect them with legal and compliance advisors in Singapore and India.'),
    L('What mentorship do partners provide?', 'Founders can access one-on-one sessions, workshops and advisory boards. See Startup Mentorship for the full programme.'),
    L('How do you resolve founder-investor conflicts?', 'We aim to prevent conflict through clear terms, regular communication and open feedback. If disagreements arise, we address them directly and follow the dispute resolution process set out in the agreements.'),
  ] },
];

/* ---------- Whitepapers ---------- */
export const whitepapers = [
  { title: "Climate Returns Framework: Measuring Real Impact Across Southeast Asia's Portfolio", blurb: 'A practical framework for measuring verified climate impact alongside financial returns, covering carbon, economic development, biodiversity, technology transfer, and portfolio-level reporting.', tag: 'Climate' },
  { title: "The Carbon Verification Gap: Why Southeast Asia's Carbon Credits Are Undervalued — and How To Fix It", blurb: "Unlock exclusive insights into Southeast Asia's carbon verification opportunity, emerging technologies, and the investment trends shaping tomorrow's climate economy.", tag: 'Climate' },
  { title: 'SEA Climate Tech Investment Thesis: 2026–2030 Sector Map', blurb: "Southeast Asia's climate transition is creating one of the decade's biggest investment opportunities. Explore the sectors, market forces, and venture strategies positioned to generate long-term value before the window narrows.", tag: 'Climate' },
  { title: 'The Institutional LP Decision Framework: How Capital Allocators Evaluate VC Funds in 2026', blurb: 'How institutional limited partners assess venture funds in 2026, and what fund managers should prepare before the first meeting.', tag: 'LP strategy' },
  { title: 'Southeast Asia VC Landscape 2026: Where Institutional Capital Is Moving and Why', blurb: 'A view of where institutional capital is flowing across Southeast Asian venture capital in 2026, and the forces behind the shift.', tag: 'Market map' },
  { title: "The Map Has Changed: Why Venture Capital's Future Is Outside Silicon Valley", blurb: 'Venture capital has already shifted beyond Silicon Valley. This whitepaper reveals how India, Southeast Asia, and the Gulf are creating a new investment corridor, unlocking higher returns, faster exits, and opportunities most LPs have yet to recognize.', tag: 'Market map' },
  { title: "Let's Talk Numbers: The Four Metrics That Define (and De-Risk) Your Startup", blurb: 'The four metrics investors look at first, and how founders can use them to de-risk their startup before raising.', tag: 'Founders' },
  { title: 'The Value in Waiting: Building an LP Portfolio for the Era of the 10-Year Exit (And How to Get Paid Anyway)', blurb: 'How limited partners can build a portfolio for longer exit horizons while still generating liquidity along the way.', tag: 'LP strategy' },
  { title: 'The Silent Shift: Early-Stage Liquidity Is Re-Writing VC Economics', blurb: 'How earlier liquidity options are changing the economics of venture capital for founders, funds and investors.', tag: 'VC economics', file: '/assets/downloads/the-silent-shift-early-stage-liquidity-evolve-vc.pdf' },
  { title: 'The Power of Value Investing in Tech Startups: Identifying Undervalued Gems', blurb: 'Applying value-investing discipline to early-stage technology companies: how to spot undervalued opportunities before the market does.', tag: 'Investing' },
  ...portalWhitepapers,
];

export const PARTNERS = [
  ['MDK Sustech', 'https://evolvevcap.com/wp-content/uploads/2025/04/MDK-Sustech-Logo.png'],
  ['InyPay', 'https://evolvevcap.com/wp-content/uploads/2024/12/InyPay.png'],
  ['Foslife', 'https://evolvevcap.com/wp-content/uploads/2024/12/Foslife.png'],
  ['Railbus', 'https://evolvevcap.com/wp-content/uploads/2024/12/Railbus.png'],
  ['Apiwiz', 'https://evolvevcap.com/wp-content/uploads/2024/12/Apiwiz.png'],
];

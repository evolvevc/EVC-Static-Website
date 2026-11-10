// Investor FAQs, Whitepapers, ROTI calculator, Insights hubs, Post template
import { SITE, icon, img, btn, titleBlock, pageHero, esc, crumbSchema, faqSchema, fmtDate, crumbs, imgSrc } from '../lib/site.mjs';
import { gfx } from '../lib/gfx.mjs';
import { posts, byType, postCard, related, faqInvestor, whitepapers, TOPIC_LIST } from '../lib/content.mjs';
import { sec, tiles } from '../lib/comp.mjs';
import { TOOL_LIST, toolGrid } from './tools.mjs';

const wp = (path, name, extra = {}) => ({ '@type': 'WebPage', '@id': SITE.url + path + '#webpage', url: SITE.url + path, name, isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#organization' }, inLanguage: 'en', ...extra });

/* ----------------------------------------------------------- INVESTOR FAQS */
export function investorFaqs() {
  const path = '/investor-faqs/';
  const all = faqInvestor.flatMap((g) => g.items.map((f) => ({ ...f, cat: g.cat })));
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Investor FAQs', path]], media: gfx('radar', { ratio: '1x1', tone: 'white' }), eyebrow: 'Resources', h1: 'Investor <span class="hl-y">FAQs</span>', lead: 'Straight answers on how Evolve Venture Capital invests, what we look for, how long decisions take and how founders and investors can work with us.' })}
<section class="section surface-paper" data-filter-group>
  <div class="container faq-layout">
    <div class="faq-layout__nav">
      <label class="search"><span class="sr-only">Search the FAQs</span>${icon('search')}<input type="search" data-search placeholder="Search questions" autocomplete="off"></label>
      <p class="faq-count"><span data-count>${all.length}</span> questions</p>
      <div class="chips" role="group" aria-label="Filter by category"><button class="chip" type="button" data-cat="all" aria-pressed="true">All questions</button>${faqInvestor.map((g) => `<button class="chip" type="button" data-cat="${esc(g.cat)}" aria-pressed="false">${g.cat}</button>`).join('')}</div>
    </div>
    <div>
      <div class="acc faq-list" data-acc-single>
        ${all.map((f) => `<details data-cats="${esc(f.cat)}" data-text="${esc((f.q + ' ' + f.a).toLowerCase())}"><summary><span><small class="faq-cat">${f.cat}</small>${esc(f.q)}</span><span class="plus" aria-hidden="true"></span></summary><div class="acc__body"><p>${esc(f.a)}</p></div></details>`).join('')}
      </div>
      <div class="empty-state" data-empty hidden>No questions match your search. Try a different word or <a href="/contact-us/">contact the team</a>.</div>
    </div>
  </div>
</section>
${sec({ label: 'Explore Investing with Confidence', chapter: 'Confidence', cls: 'sec--soft', h2: 'Carefully curated opportunities, <span class="hl">backed by expertise</span>', lead: 'Explore our carefully curated investment opportunities designed to maximize returns, backed by strategic expertise, transparent insights, and personalized partnerships. Partner with us to elevate your portfolio and achieve sustainable growth.', headExtra: `<div class="btn-row">${btn('Ask us something else', '/contact-us/')}</div>`, body: tiles([['handshake', 'Personalized Partnerships', 'Building long-term relationships with investors for tailored, impactful investment experiences.'], ['compass', 'Strategic Expertise', 'Leveraging proven strategies and deep market insights to maximize your investment returns.'], ['chart', 'Transparent Insights', 'Providing regular updates, clear reports, and seamless communication to keep you informed.'], ['target', 'Curated Opportunities', 'Access carefully vetted ventures across diverse industries to elevate your portfolio.']]) })}`;
  return { path, headProps: { title: 'Venture Capital FAQs for Founders & Investors | Evolve VC', description: 'Straight answers on how Evolve Venture Capital invests, what we look for, how long decisions take and how founders and investors can work with us.', image: '/assets/og/investor-faqs.jpg', schema: [wp(path, 'Investor FAQs'), crumbSchema([['Home', '/'], ['Investor FAQs', path]]), faqSchema(all)] }, body };
}

/* -------------------------------------------------------------- WHITEPAPERS */
export function whitepaperPage() {
  const path = '/whitepapers/';
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Whitepapers', path]], media: gfx('stack', { ratio: '4x3', tone: 'white', params: { labels: ['Climate', 'LP strategy', 'Market map'] } }), eyebrow: 'Resources', h1: '<span class="hl-y">White</span>papers', lead: 'Practical guides for founders and investors who want more than just theory. Empowering transformative ideas with customized financial solutions and expert guidance.' })}
${sec({ label: 'Free to download', chapter: 'Library', h2: 'Practical Guides for Founders and Investors Who Want <span class="hl">More Than Just Theory</span>', lead: 'Empowering transformative ideas with customized financial solutions and expert guidance.', body: `<ol class="wp-list" data-stagger>${whitepapers.map((w, i) => `<li class="wp-row"><span class="wp-row__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><span class="chip chip--tag">${w.tag}</span><h3>${esc(w.title)}</h3><p>${esc(w.blurb)}</p></div><button class="btn btn--sm btn--ghost" type="button" data-modal-open="wp-modal" data-title="${esc(w.title)}" data-resource-id="${esc(w.id || '')}">Get the whitepaper ${icon('download')}</button></li>`).join('')}</ol>` })}
<dialog class="modal" id="wp-modal" aria-labelledby="wp-modal-title">
  <div class="modal__head"><div><p class="eyebrow">Free download</p><h2 class="h3" id="wp-modal-title" data-modal-title>Download the whitepaper</h2></div><button class="modal__close" type="button" data-modal-close aria-label="Close">${icon('close')}</button></div>
  <div class="modal__body"><form class="form" data-secure-form="whitepaper" data-success="Your selected whitepaper has been submitted to our email service." novalidate aria-label="Whitepaper request form">
    <div class="field"><label for="w-name">Full name <span class="req">*</span></label><input id="w-name" name="full-name" autocomplete="name" required><span class="err" aria-live="polite"></span></div>
    <div class="field"><label for="w-company">Company</label><input id="w-company" name="company" autocomplete="organization"></div>
    <div class="field"><label for="w-email">Work email <span class="req">*</span></label><input id="w-email" name="your-email" type="email" autocomplete="email" required><span class="err" aria-live="polite"></span></div>
    <input type="hidden" name="resource" value=""><input type="hidden" name="lead-source" value="whitepapers-page">
    <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="field"><label class="check"><input type="checkbox" name="consent" required> <span>I agree to be contacted about this whitepaper, as described in the <a href="/privacy-policy/">Privacy Policy</a>.</span></label><span class="err" aria-live="polite"></span></div>
    <button class="btn" type="submit">Send me the whitepaper ${icon('arrow')}</button>
    <p class="form__secure">${icon('lock')}<span>Your details are sent over HTTPS and processed by our website and Google email service to deliver your selected whitepaper.</span></p>
    <div class="form__status" role="status"></div>
  </form></div>
</dialog>`;
  return { path, headProps: { title: 'Venture Capital Whitepapers: SEA & India | Evolve VC', description: 'Free whitepapers on climate tech investing, LP decision frameworks and Southeast Asia venture capital, written by the Evolve Venture Capital team.', image: '/assets/og/whitepapers.jpg', schema: [wp(path, 'Whitepapers', { '@type': 'CollectionPage' }), crumbSchema([['Home', '/'], ['Whitepapers', path]])] }, body };
}

/* --------------------------------------------------------------- ROTI */
export function roti() {
  const path = '/return-on-time-invested-roti-calculator/';
  const slider = (id, label, min, max, step, val, unit) => `<div class="field slider"><label for="${id}">${label}</label><div class="slider__row"><input id="${id}-r" type="range" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${label} slider"><input id="${id}" type="number" min="0" step="${step}" value="${val}" inputmode="decimal"><span class="slider__u mono">${unit}</span></div></div>`;
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['ROTI Calculator', path]], media: gfx('compass', { ratio: '1x1', tone: 'white', params: { labels: ['Time', 'Capital', 'Return'] } }), eyebrow: 'Resources', h1: 'Return on Time Invested <span class="hl-y">(ROTI)</span> Calculator', lead: 'Measure the true value of an investment, not just the financial return but the return on your time and attention as an investor.' })}
<section class="section surface-paper">
  <div class="container roti" id="roti">
    <form class="roti__inputs" aria-label="ROTI inputs" novalidate>
      <h2 class="h3-display">Your investment</h2>
      <div class="form__row"><div class="field"><label for="roti-cur">Currency</label><select id="roti-cur"><option value="USD">USD (US$)</option><option value="SGD">SGD (S$)</option><option value="INR">INR (₹)</option></select></div><div class="field"><label for="roti-capital">Capital invested</label><input id="roti-capital" type="number" min="0" step="1000" value="100000" inputmode="decimal"></div></div>
      <div class="field"><label for="roti-gain">Total gain or loss on the investment</label><input id="roti-gain" type="number" step="1000" value="120000" inputmode="decimal"></div>
      <h2 class="h3-display">Your time</h2>
      ${slider('roti-hours', 'Hours per month (sourcing, diligence, calls, reporting)', 0, 80, 1, 12, 'h / month')}
      ${slider('roti-months', 'Months invested', 1, 120, 1, 36, 'months')}
      ${slider('roti-rate', 'What an hour of your time is worth', 0, 1000, 10, 150, 'per hour')}
    </form>
    <div class="roti__result" aria-live="polite">
      <p class="eyebrow">Your ROTI</p>
      <div class="gauge"><svg viewBox="0 0 200 120" role="img" aria-label="ROTI gauge from 0 to 8 times"><path class="gauge__track" d="M20 100A80 80 0 0 1 180 100"/><path id="gauge-arc" class="gauge__arc" d="M20 100A80 80 0 0 1 180 100"/><g id="gauge-needle" class="gauge__needle"><line x1="100" y1="100" x2="100" y2="34"/><circle cx="100" cy="100" r="7"/></g><text x="14" y="116" class="gauge__t">0×</text><text x="100" y="12" class="gauge__t" text-anchor="middle">4×</text><text x="186" y="116" class="gauge__t" text-anchor="end">8×</text></svg><div class="gauge__num"><strong id="out-roti">0.00×</strong><span id="out-verdict" class="chip chip--tag">—</span></div></div>
      <p id="out-verdict-text" class="roti__verdict"></p>
      <dl class="roti__stats">
        <div><dt>Total hours</dt><dd id="out-hours">—</dd></div><div><dt>Time cost</dt><dd id="out-cost">—</dd></div>
        <div><dt>Gain after time cost</dt><dd id="out-net">—</dd></div><div><dt>Gain per hour</dt><dd id="out-perhour">—</dd></div>
        <div><dt>Financial return</dt><dd id="out-roi">—</dd></div><div><dt>Time-adjusted return</dt><dd id="out-adj">—</dd></div>
      </dl>
    </div>
  </div>
</section>
<section class="section surface-white">
  <div class="container split split--top">
    <div><p class="eyebrow">How it works</p><h2 class="h2" data-split>Time is the <span class="hl">hidden cost</span> of every investment</h2></div>
    <div class="stack"><p class="lead">Returns are usually measured in money. But every investment also consumes attention: finding the deal, reviewing it, joining calls, reading reports. ROTI puts a price on that attention.</p>
      <p><strong>ROTI = gain ÷ time cost</strong>, where <em>time cost</em> is the total hours you spend multiplied by what an hour of your time is worth. A ROTI of 1× means the gain only covers the value of your time. Above 3× your attention is earning a healthy premium. Below 1× the investment is costing you more than it returns.</p>
      <p>The calculator runs entirely in your browser. Nothing you enter is sent anywhere. It is an educational tool, not investment advice.</p></div>
  </div>
</section>
${sec({ label: 'More free tools', chapter: 'More tools', cls: 'sec--soft', layout: 'stack', h2: 'More free <span class="hl">tools</span>', body: `${toolGrid([TOOL_LIST[4], TOOL_LIST[6], TOOL_LIST[1]])}<div class="row-cta">${btn('All free tools', '/tools/', 'btn--ghost')}</div>` })}`;
  return { path, headProps: { title: 'ROTI Calculator: Return on Time Invested | Evolve VC', description: "Free calculator that measures an investment's return on time and attention, not only money. Built by Evolve Venture Capital for investors.", image: '/assets/og/roti.jpg', schema: [wp(path, 'Return on Time Invested (ROTI) Calculator'), crumbSchema([['Home', '/'], ['ROTI Calculator', path]]), { '@type': 'SoftwareApplication', name: 'ROTI Calculator', applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': SITE.url + '/#organization' } }] }, body };
}

/* --------------------------------------------------------------- HUBS */
function hub({ path, name, h1, eyebrow, lead, list, chips, title, description, extraSchema = [], showType = false }) {
  const cats = chips ? ['all', ...chips] : ['all'];
  const body = `${pageHero({ crumbItems: [['Home', '/'], [name, path]], eyebrow, h1, lead })}
<section class="section surface-paper" data-filter-group>
  <div class="container">
    <div class="faq-tools">
      <label class="search"><span class="sr-only">Search articles</span>${icon('search')}<input type="search" data-search placeholder="Search articles" autocomplete="off"></label>
      <div class="chips" role="group" aria-label="Filter by topic">${cats.map((c, i) => `<button class="chip" type="button" data-cat="${esc(c)}" aria-pressed="${i === 0}">${c === 'all' ? 'All' : c}</button>`).join('')}</div>
      <p class="mono faq-count"><span data-count>${list.length}</span> articles</p>
    </div>
    <div class="post-grid">${list.map((p, i) => postCard(p, { feature: false, eager: i < 3, h: 2 })).join('')}</div>
    <div class="empty-state" data-empty hidden>No articles match. Try a different search or topic.</div>
  </div>
</section>`;
  return { path, headProps: { title, description, image: '/assets/og/insights.jpg', schema: [wp(path, name, { '@type': 'CollectionPage' }), crumbSchema([['Home', '/'], [name, path]]), { '@type': 'ItemList', itemListElement: list.slice(0, 20).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + p.path, name: p.title })) }] }, body };
}
export const insightsHub = () => hub({ path: '/insights/', name: 'Insights', h1: 'Insights', eyebrow: 'Insights', lead: 'Funding trends, founder playbooks and the investor psychology behind capital decisions across Southeast Asia and India.', list: posts, chips: ['Blogs', 'Industry Reports', ...TOPIC_LIST], title: 'Singapore Venture Capital Insights & Funding Trends | Evolve', description: 'Explore Singapore venture capital insights, startup funding trends, and strategies with Evolve Venture Capital for smarter investments and growth.' });
export const blogsHub = () => hub({ path: '/blogs/', name: 'Blogs', h1: 'Blogs', eyebrow: 'Insights', lead: 'Insights that help you build, invest, and grow with confidence. The venture capital world moves fast. At Evolve Venture Capital, we share what we are seeing across Southeast Asia and India — from funding trends to the investor psychology behind capital decisions.', list: byType('blog'), chips: TOPIC_LIST, title: 'Venture Capital Blog for Founders & Investors | Evolve VC', description: 'Analysis on startup funding, VC trends and growth strategy for founders and investors in Southeast Asia and India.' });
export const reportsHub = () => hub({ path: '/industry-reports/', name: 'Industry Reports', h1: 'Industry <span class="hl-y">Reports</span>', eyebrow: 'Insights', lead: "Research on startup funding, VC trends, and market analysis across Southeast Asia and India from Evolve Venture Capital.", list: byType('report'), chips: TOPIC_LIST.filter((t) => byType('report').some((p) => p.topics.includes(t))), title: 'Venture Capital Industry Reports | Evolve VC', description: 'Market analysis on funding trends, regional markets and sector shifts across Southeast Asia and India from Evolve Venture Capital.' });

/* --------------------------------------------------------------- POST */
function trimTitle(p) {
  const base = (p.seoTitle || p.title).replace(/\s*[|\-–—]\s*Evolve.*$/i, '').trim();
  if ((base + ' | Evolve VC').length <= 62) return base + ' | Evolve VC';
  if (base.length <= 62) return base;
  const cut = base.slice(0, 60).replace(/\s+\S*$/, '').replace(/[:,—–-]\s*$/, '');
  return cut + '…';
}
function trimDesc(d) {
  d = d.replace(/\s+/g, ' ').trim(); if (d.length <= 158) return d;
  const cut = d.slice(0, 156); const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return (stop > 90 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, '') + '…');
}
export function post(p) {
  const rel = related(p, 3);
  const t = p.type === 'report' ? 'Industry reports' : 'Blogs'; const hub = p.type === 'report' ? '/industry-reports/' : '/blogs/';
  const body = `<section class="post-hero">
  <div class="page-hero__mark page-hero__mark--r" data-parallax="0.1" aria-hidden="true"></div>
  <div class="container container--read">${crumbs([['Home', '/'], [t, hub], ['Article', p.path]])}
    <div class="post-hero__chips">${p.topics.map((x) => `<span class="chip chip--tag">${esc(x)}</span>`).join('')}</div>
    <h1 class="post-title">${esc(p.title)}</h1>
    <p class="post-meta mono"><span>By ${SITE.name}</span><time datetime="${p.published}">${fmtDate(p.published)}</time><span>${p.readMin} min read</span>${p.modified.slice(0, 10) !== p.published.slice(0, 10) ? `<span>Updated <time datetime="${p.modified}">${fmtDate(p.modified)}</time></span>` : ''}</p>
  </div>
</section>
<div class="container post-cover"><figure class="photo reveal reveal--scale">${img(p.image, p.title, { sizes: '(min-width: 1100px) 1200px, 100vw', eager: true, fetchpriority: 'high' })}</figure></div>
<article class="section section--tight post" data-article>
  <div class="container post__grid">
    <aside class="post__toc" aria-label="In this article">${p.toc.length > 2 ? `<p class="mono">In this article</p><nav data-spy>${p.toc.map((h) => `<a href="#${h.id}">${esc(h.text)}</a>`).join('')}</nav>` : ''}<div class="post__share"><p class="mono">Share</p><a class="icon-btn" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE.url + p.path)}" aria-label="Share on LinkedIn" title="Share on LinkedIn">${icon('linkedin')}</a><a class="icon-btn" target="_blank" rel="noopener noreferrer" href="https://x.com/intent/post?url=${encodeURIComponent(SITE.url + p.path)}&amp;text=${encodeURIComponent(p.title)}" aria-label="Share on X" title="Share on X">${icon('x')}</a><button class="icon-btn" type="button" data-copy aria-label="Copy link" title="Copy link">${icon('link')}</button></div></aside>
    <div class="prose">${p.body}
      <aside class="author-card"><div class="author-card__mark" aria-hidden="true"><img src="/assets/img/emblem-96.png" width="52" height="53" alt=""></div><div><p class="mono">Written by</p><p><strong>${SITE.name}</strong> is a Singapore-based venture capital firm backing founders across Southeast Asia and India. <a href="/about-us/">About the firm</a></p></div></aside>
      <p class="disclaimer">This article is for information only and is not investment, legal or tax advice. Venture investing involves risk, including loss of capital.</p>
    </div>
  </div>
</article>
<section class="section surface-paper"><div class="container">${titleBlock({ eyebrow: 'Keep reading', h2: 'Related <span class="hl">articles</span>' })}<div class="post-grid">${rel.map((r) => postCard(r)).join('')}</div></div></section>
<section class="section section--tight surface-white"><div class="container"><div class="cta-band"><p class="eyebrow">Work with Evolve</p><h2 class="h2" data-split>Ready to take the next step?</h2><p class="lead">Founders can pitch us in about ten minutes. Investors can talk to the team about current opportunities.</p><div class="btn-row">${btn('Pitch Your Startup', '/raise-capital/#pitch', 'btn')}${btn('Start Investing', '/start-investing/', 'btn--ghost')}</div></div></div></section>`;
  const ogImg = `/assets/og/post-${p.slug}.jpg`;
  return {
    path: p.path, bodyClass: 'page-post',
    headProps: {
      title: trimTitle(p), description: trimDesc(p.description || p.excerpt), image: ogImg, type: 'article', article: { published: p.published, modified: p.modified, tags: p.tags },
      schema: [wp(p.path, p.title), crumbSchema([['Home', '/'], [t, hub], [p.title, p.path]]),
        { '@type': 'Article', '@id': SITE.url + p.path + '#article', headline: p.title.slice(0, 110), description: trimDesc(p.description || p.excerpt), image: SITE.url + ogImg, datePublished: p.published, dateModified: p.modified, author: { '@id': SITE.url + '/#organization' }, publisher: { '@id': SITE.url + '/#organization' }, mainEntityOfPage: { '@id': SITE.url + p.path + '#webpage' }, wordCount: p.words, keywords: p.tags, articleSection: p.topics, inLanguage: 'en' }],
    },
    body,
  };
}

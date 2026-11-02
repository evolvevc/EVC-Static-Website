import { SITE, icon, img, btn, esc } from '../lib/site.mjs';
import { latest, postCard, TOPIC_LIST, PARTNERS } from '../lib/content.mjs';
import { gfx } from '../lib/gfx.mjs';
import { sec, rows, checks, statement, explorer } from '../lib/comp.mjs';
import { TOOL_LIST, toolGrid } from './tools.mjs';

const SOLUTIONS = [
  ['sprout', 'Startup Growth Programs', 'Build strong foundations with resources designed to foster progress.', 'founders'],
  ['network', 'Global Network Access', 'Unlock partnerships with industry-leading innovators and investors.', 'founders investors'],
  ['chart', 'Investor Support Services', 'Diversify and expand portfolios with data-backed strategies.', 'investors'],
  ['file', 'Pitch Deck Assistance', 'Create compelling narratives that capture investor attention.', 'founders'],
];
const PILLARS = [
  ['rocket', 'Startup Acceleration', 'Access funding and expertise that align with your growth ambitions.', 'VC funding for tech startups at every stage — seed, pre-Series A, and Series A — with hands-on startup accelerator support in Singapore. We help founders move faster, build smarter, and scale further across Southeast Asia and India.'],
  ['chart', 'Investor Excellence', 'Capitalise on vetted opportunities with strong return potential.', 'Ideal for family offices, HNWIs, and LPs finding venture capital for startups in high-growth markets across the Singapore–India corridor and the wider Southeast Asia region.'],
  ['layers', 'Scalable Strategies', 'Build ventures with proven methodologies and global reach.', "Proven methodologies and a reach spanning Singapore, India, and Southeast Asia. We bring the playbooks that turn early-stage investors' capital into category-leading businesses."],
  ['shield', 'Secure Processes', 'Work seamlessly with reliable and transparent systems.', 'Our secure due diligence and deal structure processes are designed for firms that invest in startups responsibly, protecting both founders and investors at every step.'],
];

export function build() {
  const posts = latest(6);
  const body = `
<section class="hero">
  <div class="hero__bg" aria-hidden="true"><div class="page-hero__mark page-hero__mark--l"></div><div class="page-hero__mark page-hero__mark--r"></div></div>
  <div class="container hero__grid">
    <div class="hero__copy">
      <p class="pill reveal"><span class="pill__dot"></span>Empowering Visionaries</p>
      <h1 class="hero__title" data-split>Venture Capital Firm <span class="hl">in Singapore</span></h1>
      <p class="hero__kicker reveal">Built to back <span class="hl-y">visionary founders</span></p>
      <p class="lead reveal">We do not just write cheques. We walk the journey with you — from seed funding to Series A and beyond.</p>
      <div class="btn-row reveal">${btn('Raise Capital for Your Tech Startup', '/raise-capital/')}${btn('Explore VC Investment Opportunities in Singapore', '/start-investing/', 'btn--ghost')}</div>
      <p class="hero__markets reveal"><strong>Markets we cover</strong><span>Singapore</span><span>India</span><span>Malaysia</span><span>Dubai · UAE</span><span>London · UK</span><span>USA</span></p>
    </div>
    <div class="hero__visual">${gfx('orbit', { ratio: '1x1', tone: 'clear' })}</div>
  </div>
</section>

<div class="container">
  <div class="doors" data-stagger>
    <article class="door"><span class="door__tag">For founders</span><h2>Where founders find the right venture capital for tech startups</h2><p>We walk the journey with you, from seed funding to Series A and beyond.</p><a class="door__go" href="/raise-capital/">Raise Capital for Your Tech Startup ${icon('arrow')}</a></article>
    <article class="door"><span class="door__tag">For investors</span><h2>Where investors unlock Southeast Asia’s highest-growth opportunities</h2><p>Carefully vetted early-stage opportunities, matched to your investment profile.</p><a class="door__go" href="/start-investing/">Explore VC Investment Opportunities in Singapore ${icon('arrow')}</a></article>
  </div>
</div>

<section class="section section--tight trust">
  <div class="container trust__row">
    <div><p class="eyebrow">Companies</p><h2 class="h3-display">Our Partners</h2></div>
    <ul class="logo-wall" data-stagger>${PARTNERS.map(([n, u]) => `<li>${img(u, n, { sizes: '160px' })}</li>`).join('')}</ul>
  </div>
</section>

${sec({ label: 'Evolve Venture Capital', chapter: 'About us', h2: 'Global Venture Capital Firm Driving Growth for <span class="hl">Tech Startups</span>', body: statement(['Evolve Venture Capital is a leading venture capital firm in Singapore dedicated to backing the bold, the builders, and the boundary-breakers. Whether you are a founder seeking startup funding in Singapore for your first round, or a visionary investor looking for attractive returns across Southeast Asia and India — you have found the right venture capital partner.']) })}

${sec({ label: 'Why Partner With Us?', chapter: 'Why Evolve', cls: 'sec--soft', h2: 'Why Choose a Venture Capital Firm That Knows <span class="hl">Singapore\'s</span> Startup Ecosystem?', lead: 'Great ideas do not always arrive with a polished pitch deck. Sometimes the most transformative tech startups begin with a single founder, a problem they cannot stop thinking about, and the courage to act. That is exactly the kind of opportunity we look for at Evolve Venture Capital.', headExtra: `<div class="reveal">${gfx('growth', { ratio: 'auto', tone: 'white' })}</div>`,
  body: `<div class="stack why-text"><p>As a trusted venture capital company in Singapore, we have built a firm that bridges two of the world’s most dynamic startup ecosystems — Singapore and India. We believe the next generation of category-defining companies will be born at this intersection. Our cross-border investment model gives founders access to capital, networks, and expertise on both sides of the corridor.</p><p>From early-stage investors providing seed funding to growth-stage businesses raising Series A, Evolve offers structured venture capital investment across the full startup lifecycle.</p></div>${rows([['target', 'Matched opportunities', "Matched investment opportunities aligned to your startup's growth stage and sector — from seed funding to late-stage VC rounds in Singapore and beyond"], ['compass', 'Market insight', 'Practical market insight from experienced venture capitalists in Singapore with deep knowledge of Southeast Asia and the India–Singapore corridor'], ['users', 'Founder mentorship', 'Founder mentorship programmes built for the Singapore startup ecosystem — connecting you with operators, advisors, and co-investors who have done it before.'], ['chart', 'Growth strategies', 'Sustained growth strategies for startups scaling regionally and globally']])}` })}

${sec({ label: 'What we do', chapter: 'What we do', h2: 'Four ways we <span class="hl">build with you</span>', body: explorer('pil', 'What we do', PILLARS) })}

${sec({ label: 'Solutions That Work', chapter: 'Solutions', cls: 'sec--soft', layout: 'stack', h2: 'Why Evolve Venture Capital Is Trusted by <span class="hl">Global Innovators?</span>', headExtra: '<h3 class="h3-display">Empowering Founders and Investors Alike</h3><p class="lead">We aim to build meaningful relationships from developing creative concepts through the delivery of sustainable returns. Evolve Venture Capital offers tailored investment solutions, connecting exceptional ideas and vision-driven investors.</p>',
  body: `<div data-switcher>
      <div class="seg" role="group" aria-label="Show solutions for"><button class="seg__btn" type="button" data-filter="all" aria-pressed="true">Everyone</button><button class="seg__btn" type="button" data-filter="founders" aria-pressed="false">Founders</button><button class="seg__btn" type="button" data-filter="investors" aria-pressed="false">Investors</button></div>
      <div class="solutions" data-stagger>${SOLUTIONS.map(([ic, t, d, f]) => `<article class="card" data-for="${f}"><span class="icon-badge">${icon(ic)}</span><h3 class="h3">${t}</h3><p>${d}</p></article>`).join('')}</div>
    </div>` })}

${sec({ label: 'Advancing the Future of Investment', chapter: 'Our model', h2: 'Connecting Bold Founders with Visionary Investors in <span class="hl">South East Asia &amp; India</span>', lead: 'Our speciality is identifying growth-stage businesses and connecting them with vision driven investors. As a leading venture capital firm for startups in Singapore, we are redefining what is possible within the regional startup ecosystem — not just for individual companies, but for the entire investment landscape across Southeast Asia and India.',
  body: `<p class="band-title" data-split>Global Investment Redefined by <span class="hl">Smart Venture Capital</span></p><div class="reveal">${gfx('flow', { ratio: 'auto', tone: 'white' })}</div><p class="lead">We offer private venture capital investment structures tailored to scalable business models, data-driven financial decision-making for maximum capital deployment, and cross-border partnerships that give our portfolio companies an edge in market penetration — whether they are raising their first seed round or preparing for an exit.</p>${checks(['Private venture capital funding structures tailored to scalable, tech-first business models across Singapore and India', 'Data-driven financial decision-making for efficient capital deployment and measurable investor returns', 'Cross-border investment partnerships spanning Singapore, India, and Southeast Asia for greater market penetration', 'Transparent and secure operations designed for investors and founders who value accountability from their early-stage investors'])}` })}

${sec({ label: 'About Evolve Venture Capital', chapter: 'About', cls: 'sec--soft', h2: 'Singapore\'s Cross-Border <span class="hl">Venture Capital</span> Investment Partner', headExtra: `<div class="btn-row">${btn('About Evolve', '/about-us/')}${btn('Contact the team', '/contact-us/', 'btn--ghost')}</div>`,
  body: `<div class="reveal">${gfx('network', { ratio: 'auto', tone: 'white' })}</div><p class="lead">Evolve Venture Capital is a global venture capital firm headquartered in Singapore, with deep investment roots across India and Southeast Asia. Founded on the belief that the world’s most transformative tech startups often start with nothing more than an unflinching conviction, we have built a firm that meets founders at that earliest stage of courage.</p><div class="about-cols"><p>Our team of experienced venture capitalists in Singapore combines local expertise with global perspective — bringing the full weight of our networks, operational experience, and capital to bear on the startups and investment opportunities that matter most.</p><p>With a presence across key markets, Evolve Venture Capital connects ideas, resources, and expertise on a global scale. Whether you are a tech startup in Singapore seeking your first VC round, or an investor looking to access the best venture capital opportunities in Southeast Asia — join our platform and access unparalleled opportunities for collaboration and growth.</p></div>` })}

${sec({ label: 'Innovating Global Markets with a Venture Capital Firm', chapter: 'Why Singapore', h2: 'Why Singapore Is the Hub for Venture Capital in <span class="hl">Southeast Asia</span>', headExtra: `<div class="reveal">${gfx('venn', { ratio: 'auto', tone: 'white' })}</div>`,
  body: `<div class="stack sing-text"><p class="lead">Singapore has consistently ranked as one of Asia’s top destinations for venture capital investment — and for good reason. Its pro-business regulatory environment, world-class financial infrastructure, and strategic position between the markets of India and Southeast Asia make it the natural home for a venture capital firm with global ambitions.</p><p>At Evolve, we have embedded ourselves within the Singapore startup ecosystem from day one. We understand what it takes for tech startups to scale from a Singapore base into the wider region — and we bring that knowledge to every investment decision we make.</p><p>Whether you are finding venture capital for startups in fintech, SaaS, deep tech, or consumer technology, Evolve Venture Capital offers the networks, capital, and expertise you need to succeed in Singapore and beyond.</p></div>` })}

${sec({ label: 'Free tools', chapter: 'Free tools', layout: 'stack', h2: 'Free tools for <span class="hl">founders and investors</span>', lead: 'Calculators, a checklist and a glossary to help you plan a raise or judge a return. No login, and nothing leaves your browser.', body: `${toolGrid([TOOL_LIST[0], TOOL_LIST[1], TOOL_LIST[2], TOOL_LIST[8]])}<div class="row-cta">${btn('All free tools', '/tools/', 'btn--ghost')}</div>` })}

<section class="sec sec--soft" data-chapter="Insights" data-filter-group>
  <div class="container">
    <div class="sec__bar reveal"><span class="sec__no"></span><span class="sec__label">Explore Our Insights</span></div>
    <div class="insights-head">
      <div class="stack"><h2 class="h2" data-split>Insights from Singapore's <span class="hl">Leading</span> Venture Capital Firm</h2><p class="lead">Dive into startup success stories, industry trends, and expert insights from the Evolve team. Get the latest updates on venture capital, startup funding in Singapore, and the trends shaping innovation across Southeast Asia and India.</p></div>
      <div class="carousel__nav"><button class="icon-btn" type="button" data-carousel-prev aria-label="Previous articles">${icon('arrow')}</button><button class="icon-btn" type="button" data-carousel-next aria-label="Next articles">${icon('arrow')}</button></div>
    </div>
    <div class="chips" role="group" aria-label="Filter insights by topic"><button class="chip" type="button" data-cat="all" aria-pressed="true">All Posts</button>${TOPIC_LIST.map((t) => `<button class="chip" type="button" data-cat="${esc(t)}" aria-pressed="false">${t}</button>`).join('')}</div>
    <p class="sr-only" role="status"><span data-count>${posts.length}</span> articles shown</p>
    <div class="carousel" data-carousel><div class="carousel__track">${posts.map((p) => postCard(p)).join('')}</div></div>
    <div class="empty-state" data-empty hidden>No recent articles under this topic. <a href="/insights/">Browse all insights</a>.</div>
    <div class="row-cta">${btn('View all insights', '/insights/', 'btn--ghost')}</div>
  </div>
</section>

<section class="section section--tight surface-white">
  <div class="container">
    <div class="cta-band">
      <p class="eyebrow">Join Our Venture Capital Network in Singapore</p>
      <h2 class="h2" data-split>Raise. Invest. Evolve.</h2>
      <p class="lead">Founders: pitch us in about ten minutes. Investors: see the opportunities we are backing across Southeast Asia and India.</p>
      <div class="btn-row">${btn('Pitch Your Startup', '/raise-capital/#pitch')}${btn('Start Investing', '/start-investing/', 'btn--ghost')}</div>
    </div>
  </div>
</section>`;
  return {
    path: '/',
    headProps: {
      title: 'Venture Capital Firm in Singapore & India | Evolve VC',
      description: 'Evolve Venture Capital backs tech founders and connects investors with early-stage deals across Singapore, Southeast Asia and India. Pitch or invest today.',
      image: '/assets/og/home.jpg', schema: [{ '@type': 'WebPage', '@id': SITE.url + '/#webpage', url: SITE.url + '/', name: 'Evolve Venture Capital', isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#organization' }, inLanguage: 'en' }],
    },
    body, bodyClass: 'page-home',
  };
}

// Free tools hub and tool pages. Every tool runs in the browser (src/js/tools.js); nothing is sent anywhere.
import { SITE, icon, btn, pageHero, esc, crumbSchema } from '../lib/site.mjs';
import { gfx } from '../lib/gfx.mjs';
import { sec, checks } from '../lib/comp.mjs';

const wp = (path, name, extra = {}) => ({ '@type': 'WebPage', '@id': SITE.url + path + '#webpage', url: SITE.url + path, name, isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#organization' }, inLanguage: 'en', ...extra });

/* ------------------------------------------------------------ glossary data */
export const GLOSSARY = [
  ['Accredited investor', 'A person or institution that meets wealth or income thresholds set by a regulator and may therefore invest in private offerings that are closed to the general public. The test differs from country to country.'],
  ['Angel investor', 'An individual who invests their own money in very early-stage companies, often before institutional funds get involved.'],
  ['Anti-dilution', 'A term that adjusts an investor’s conversion price if the company later sells shares at a lower price, partly protecting the investor’s stake. Common forms are full ratchet and weighted average.'],
  ['Bridge round', 'Short-term financing, often a convertible note, that carries a company to its next priced round or a specific milestone.'],
  ['Burn rate', 'The amount of cash a company spends each month. Net burn is spending minus revenue.'],
  ['Cap table', 'Short for capitalisation table: a record of who owns which shares, options and convertible instruments in a company.'],
  ['Carried interest (carry)', 'The share of a fund’s profits, commonly 20%, paid to the fund managers after investors have received their capital back and any hurdle rate has been met.'],
  ['Cliff', 'The first period of a vesting schedule, often 12 months, before any shares vest. Someone who leaves before the cliff keeps none of the shares.'],
  ['Co-investment', 'An investment made directly into a company alongside a fund or lead investor, in the same round.'],
  ['Convertible note', 'A loan that converts into shares at a later funding round, usually at a discount or subject to a valuation cap. It normally accrues interest and has a maturity date.'],
  ['Dilution', 'The reduction in an existing shareholder’s percentage ownership when new shares are issued.'],
  ['Down round', 'A funding round priced below the company’s previous valuation.'],
  ['DPI', 'Distributions to paid-in capital: the cash returned to investors divided by the capital they have paid in. It measures returns that have already been realised.'],
  ['Drag-along', 'A right that lets majority shareholders require minority shareholders to join a sale of the company on the same terms.'],
  ['Due diligence', 'The investigation of a company’s finances, legal position, product, market and team before an investor commits money.'],
  ['Exit', 'An event that lets investors turn their shares into cash, such as an acquisition, a stock market listing or a secondary sale.'],
  ['Follow-on investment', 'Additional money put in by an existing investor in a later round of the same company.'],
  ['Fully diluted', 'A share count or ownership figure that assumes all options, warrants and convertible securities have been exercised or converted.'],
  ['General partner (GP)', 'The firm or people who manage a venture fund and make its investment decisions.'],
  ['Hurdle rate', 'The minimum return a fund must deliver to its investors before the general partner earns carried interest.'],
  ['IRR', 'Internal rate of return: the annualised return that takes into account when cash went in and when it came out.'],
  ['Lead investor', 'The investor that sets the terms of a funding round. It usually writes the largest cheque and often takes a board seat.'],
  ['Limited partner (LP)', 'An investor in a fund, such as a family office or institution, that provides capital but does not manage the investments.'],
  ['Liquidation preference', 'A term that decides who is paid first, and how much, when a company is sold or wound up. A 1x non-participating preference lets the investor take either its money back or its share of the proceeds, whichever is higher.'],
  ['Management fee', 'An annual fee that a fund’s investors pay the manager, often around 2% of committed capital, to cover the cost of running the fund.'],
  ['MOIC', 'Multiple on invested capital: the total value of an investment divided by the amount invested.'],
  ['Option pool (ESOP)', 'Shares set aside for employee stock options. It is usually created before a funding round and counted in the pre-money valuation.'],
  ['Post-money valuation', 'The value of a company immediately after a round: the pre-money valuation plus the new money raised.'],
  ['Pre-money valuation', 'The value of a company before the new investment is added.'],
  ['Pre-seed', 'The earliest funding stage, used to test an idea and build a first prototype. Cheques are small and often come from founders, angels or micro-funds.'],
  ['Pro-rata rights', 'The right to invest in future rounds so that an investor can keep its percentage ownership.'],
  ['Runway', 'The number of months a company can keep operating before its cash runs out at the current rate of spending.'],
  ['SAFE', 'Simple Agreement for Future Equity: an agreement that gives an investor the right to shares in a future priced round. Unlike a convertible note it is not debt and has no interest or maturity date.'],
  ['Secondary sale', 'A sale of existing shares by shareholders to another buyer, rather than the company issuing new shares.'],
  ['Seed round', 'The first significant round of funding, used to build the product and find out whether customers want it.'],
  ['Series A', 'A funding round that usually follows seed, used to scale a product that already has early signs of demand.'],
  ['Tag-along', 'A right that lets minority shareholders join a sale on the same terms when a major shareholder sells.'],
  ['Term sheet', 'A non-binding summary of the main terms of a proposed investment, agreed before the legal documents are written.'],
  ['TVPI', 'Total value to paid-in capital: distributions plus the remaining value of the investments, divided by the capital paid in.'],
  ['Unicorn', 'A privately held company valued at US$1 billion or more.'],
  ['Valuation cap', 'The maximum valuation at which a convertible note or SAFE converts into shares. It protects early investors from paying a much higher price.'],
  ['Venture debt', 'A loan to a venture-backed company, often alongside equity funding. It is repaid with interest and sometimes comes with warrants.'],
  ['Vesting', 'Earning ownership of shares or options gradually over time, usually over four years.'],
  ['Vintage year', 'The year a fund made its first investment. Funds of the same vintage year are compared because they faced similar market conditions.'],
];

/* ---------------------------------------------------------------- helpers */
const num = (k, label, val, { step = 1, min = 0, max = '', hint = '' } = {}) => `<div class="field"><label for="f-${k}">${label}</label><input id="f-${k}" data-k="${k}" type="number" inputmode="decimal" min="${min}"${max !== '' ? ` max="${max}"` : ''} step="${step}" value="${val}">${hint ? `<small class="hint">${hint}</small>` : ''}</div>`;
const curSel = `<div class="field"><label for="f-cur">Currency</label><select id="f-cur" data-k="cur"><option value="USD">USD (US$)</option><option value="SGD">SGD (S$)</option><option value="INR">INR (₹)</option></select></div>`;
const stat = (k, label) => `<div><dt>${label}</dt><dd data-o="${k}">—</dd></div>`;
const DISCLAIMER = 'This tool is for education and planning. It is not investment, legal, tax or accounting advice, and real outcomes depend on the legal documents you sign.';

/* ------------------------------------------------------------ tool pages */
const rounds = [['Pre-seed', true, 500000, 4500000, 0], ['Seed', true, 2000000, 8000000, 10], ['Series A', true, 8000000, 32000000, 5], ['Series B', false, 20000000, 80000000, 0]];
const readiness = [
  ['Team', 'Founders work on the company full-time, or have a dated plan to', 'Investors back committed founders. Decide the date you go full-time and be ready to say it.'],
  ['Team', 'Roles, equity and vesting between founders are agreed and written down', 'Put founder equity, vesting and a cliff in writing before you raise. Unclear splits slow deals down.'],
  ['Team', 'The cap table is clean, with no unexplained promises of equity', 'List every shareholder, option and promise of equity in one cap table and fix anything unclear.'],
  ['Team', 'You know which key hires or advisors you need next', 'Name the two or three roles that matter most over the next 12 months and who could fill them.'],
  ['Product & traction', 'There is a working product or prototype that real users have tried', 'Put something in front of real users, even if it is rough, so you can show how they respond.'],
  ['Product & traction', 'You can show demand: users, revenue, pilots or letters of intent', 'Collect the strongest proof of demand you have and put numbers on it.'],
  ['Product & traction', 'You track one or two key metrics every month', 'Pick the metrics that show whether the business works and report them monthly, starting now.'],
  ['Product & traction', 'At least two customers or users would speak to an investor', 'Ask happy customers whether they would take a short reference call.'],
  ['Market & money', 'You can say who pays you and why in one sentence', 'Practise a one-sentence description of the customer, the problem and why they pay.'],
  ['Market & money', 'Your market size is based on bottom-up reasoning', 'Estimate the market from the customers you can realistically reach multiplied by price, not a top-down percentage.'],
  ['Market & money', 'You have a financial plan for the next 18 to 24 months', 'Build a simple monthly model of revenue, costs, hiring and cash for 18 to 24 months.'],
  ['Market & money', 'You know how much you are raising and what it will achieve', 'Define the amount, the milestones it funds and how long it lasts. The runway calculator helps with timing.'],
  ['Deck & data room', 'A clear pitch deck of about 10 to 15 slides is ready', 'Draft the deck with the pitch deck outline and ask two people outside the company to review it.'],
  ['Deck & data room', 'Incorporation papers, contracts, financials and cap table are in one organised folder', 'Create a shared folder with company documents, key contracts, financial statements and the cap table.'],
  ['Deck & data room', 'Intellectual property is assigned to the company', 'Make sure founders and contractors have assigned the relevant intellectual property to the company in writing.'],
  ['Deck & data room', 'You have a researched list of investors that fit your stage and sector', 'Research investors who back your stage, sector and region, and look for warm introductions.'],
];
const slides = [
  ['Cover and one-liner', 'Say what the company does in one clear sentence.', ['Company name and logo', 'One sentence on what you do and for whom', 'Your name, role and contact details'], 'Jargon or a long mission statement.'],
  ['Problem', 'Show a real pain that real people have.', ['Who has the problem and how often', 'What it costs them today in time or money', 'One short customer quote or story'], 'Describing a problem you assume exists without any evidence.'],
  ['Solution', 'Show how your product removes the pain.', ['What the product does, in plain words', 'Why it is better than what customers do today', 'A screenshot or a short demo'], 'Feature lists with no link back to the problem.'],
  ['Why now', 'Explain what changed that makes this possible today.', ['A shift in technology, regulation or behaviour', 'Why earlier attempts did not work'], 'Vague trends that have no link to your company.'],
  ['Market', 'Show the size of the prize and how you will reach it.', ['Who your first customers are', 'A bottom-up market size (customers × price)', 'How the market is expected to grow'], 'Quoting a huge top-down figure such as “1% of a billion-dollar market”.'],
  ['Business model', 'Explain how you make money.', ['Who pays and how (subscription, usage, fees)', 'Price and typical customer value', 'Margins, as far as you know them'], 'Leaving pricing as “to be decided”.'],
  ['Traction', 'Prove that people want it.', ['Users, revenue or pilots over time', 'Growth rate and retention', 'Named customers or letters of intent where you may share them'], 'Vanity numbers, such as page views, that do not show demand.'],
  ['Go-to-market', 'Show how you will win customers.', ['Your main ways of reaching customers', 'The cost of winning a customer, if known', 'Sales cycle and next milestones'], 'Listing every channel. Pick the two that matter.'],
  ['Competition', 'Show that you understand the alternatives.', ['Direct competitors and today’s workarounds', 'Your honest advantage', 'Why it is hard to copy'], 'Saying you have no competitors.'],
  ['Team', 'Show why this team can win.', ['Founders’ relevant experience', 'Key hires and advisors', 'Gaps you plan to fill'], 'Long CVs. Focus on what makes you credible for this problem.'],
  ['Financials', 'Show the plan the money will fund.', ['Revenue and cost forecast for 18 to 24 months', 'Key assumptions behind the numbers', 'Burn rate and runway'], 'Hockey-stick forecasts with no stated assumptions.'],
  ['The ask', 'State what you need and what it achieves.', ['The amount you are raising and the instrument', 'Use of funds by category', 'The milestones the round reaches'], 'An ask that is not linked to milestones.'],
];

export const TOOLS = [
  { slug: 'dilution-calculator', name: 'Startup Dilution Calculator', short: 'Model pre-seed to Series B and see how much of the company founders keep.', audience: 'Founders', icon: 'layers', gfx: 'stack', title: 'Startup Dilution Calculator for Funding Rounds | Evolve VC', desc: 'Free startup dilution calculator. Model pre-seed to Series B rounds and option pool top-ups to see how much of your company founders keep.', h1: 'Startup <span class="hl-y">Dilution</span> Calculator', lead: 'Model your funding rounds one by one and see how much of the company the founders and team still own after each.' },
  { slug: 'convertible-note-calculator', name: 'Convertible Note & SAFE Calculator', short: 'See the conversion price, shares issued and ownership after your next round.', audience: 'Founders and investors', icon: 'file', gfx: 'pipeline', title: 'Convertible Note & SAFE Calculator | Evolve VC', desc: 'Free calculator for convertible notes and SAFEs. See the conversion price, the shares issued and the ownership after your next priced round.', h1: 'Convertible Note & <span class="hl-y">SAFE</span> Calculator', lead: 'Enter the terms of a note or SAFE and the details of your next priced round. See what it converts into.' },
  { slug: 'fundraising-readiness-checklist', name: 'Fundraising Readiness Checklist', short: 'Sixteen quick checks that show how ready you are to meet investors.', audience: 'Founders', icon: 'target', gfx: 'radar', title: 'Fundraising Readiness Checklist for Founders | Evolve VC', desc: 'Free checklist with 16 questions on team, traction, financials and data room. Get a readiness score and a to-do list before you pitch investors.', h1: 'Fundraising <span class="hl-y">Readiness</span> Checklist', lead: 'Tick what is already in place. You get a score, a breakdown by area and a to-do list for the gaps.' },
  { slug: 'runway-calculator', name: 'Startup Runway & Burn Calculator', short: 'Find out how many months of cash you have and when to start raising.', audience: 'Founders', icon: 'clock', gfx: 'growth', title: 'Startup Runway and Burn Rate Calculator | Evolve VC', desc: 'Free runway calculator. Enter cash, costs, revenue and growth to see your burn rate, months of runway and when to start your next raise.', h1: 'Startup <span class="hl-y">Runway</span> &amp; Burn Calculator', lead: 'Enter your cash, monthly costs and revenue. See how long the money lasts and when to start raising.' },
  { slug: 'fund-returns-calculator', name: 'VC Fund Returns Calculator', short: 'Work out MOIC, DPI, RVPI, TVPI and an approximate IRR for a fund or deal.', audience: 'Investors', icon: 'chart', gfx: 'flow', title: 'VC Fund Returns Calculator: MOIC, DPI, TVPI, IRR | Evolve VC', desc: 'Free venture fund returns calculator. Enter paid-in capital, distributions and remaining value to get MOIC, DPI, RVPI, TVPI and an approximate IRR.', h1: 'VC Fund <span class="hl-y">Returns</span> Calculator', lead: 'Turn paid-in capital, distributions and remaining value into the return measures investors use.' },
  { slug: 'founder-equity-split-calculator', name: 'Founder Equity Split Calculator', short: 'Get a fair starting point for dividing equity between co-founders.', audience: 'Founders', icon: 'users', gfx: 'venn', title: 'Founder Equity Split Calculator | Evolve VC', desc: 'Free founder equity split calculator. Score each co-founder on commitment, expertise, role, idea and capital to find a fair starting split.', h1: 'Founder <span class="hl-y">Equity</span> Split Calculator', lead: 'Score each founder on what they bring. Weight what matters most to you and see a starting split to discuss.' },
  { slug: 'venture-capital-glossary', name: 'Venture Capital Glossary', short: `${GLOSSARY.length} venture capital terms explained in plain English.`, audience: 'Everyone', icon: 'book', gfx: 'compass', title: `Venture Capital Glossary: ${GLOSSARY.length} Terms Explained | Evolve VC`, desc: `Plain-English definitions of ${GLOSSARY.length} venture capital terms, from pre-money valuation and SAFE to TVPI and liquidation preference. Free and searchable.`, h1: 'Venture Capital <span class="hl-y">Glossary</span>', lead: 'Plain-English meanings of the terms you will hear in term sheets, pitch meetings and fund reports.' },
  { slug: 'pitch-deck-outline', name: 'Pitch Deck Outline', short: 'A slide-by-slide outline of the 12 slides investors expect.', audience: 'Founders', icon: 'rocket', gfx: 'stairs', title: 'Pitch Deck Outline: 12 Slides Investors Expect | Evolve VC', desc: 'Free pitch deck outline with 12 slides. See the purpose of each slide, what to include and what to avoid, and copy the outline to start drafting.', h1: 'Pitch Deck <span class="hl-y">Outline</span>', lead: 'Twelve slides, one at a time: what each is for, what to put on it and the mistakes to avoid.' },
];
const ROTI = { path: '/return-on-time-invested-roti-calculator/', name: 'ROTI Calculator', short: 'Measure the return on your time and attention, not only your money.', audience: 'Investors', icon: 'calc' };
const toolPath = (t) => `/tools/${t.slug}/`;
export const TOOL_LIST = [...TOOLS.map((t) => ({ path: toolPath(t), name: t.name, short: t.short, audience: t.audience, icon: t.icon })), ROTI];

const toolCard = (t) => `<a class="tool-card" href="${t.path}">${icon(t.icon)}<span class="tool-card__tag">${t.audience}</span><h3 class="h3">${t.name}</h3><p>${t.short}</p><span class="tool-card__go">Open the tool ${icon('arrow')}</span></a>`;
export const toolGrid = (list) => `<div class="tool-grid" data-stagger>${list.map(toolCard).join('')}</div>`;

/* ----------------------------------------------------------- tool bodies */
const BODY = {
  'dilution-calculator': () => ({
    tool: `<form class="tool__in" novalidate aria-label="Funding rounds"><h2>Your funding rounds</h2>${curSel}
      ${rounds.map(([n, on, raise, pre, pool]) => { const id = n.toLowerCase().replace(/[^a-z]+/g, '-'); return `<fieldset class="rrow" data-round="${n}"><label class="check"><input type="checkbox" data-r="on"${on ? ' checked' : ''}><span>${n}</span></label><div class="rrow__f"><div class="field"><label for="r-${id}-raise">Amount raised</label><input id="r-${id}-raise" data-r="raise" type="number" inputmode="decimal" min="0" step="1000" value="${raise}"></div><div class="field"><label for="r-${id}-pre">Pre-money valuation</label><input id="r-${id}-pre" data-r="pre" type="number" inputmode="decimal" min="0" step="1000" value="${pre}"></div><div class="field"><label for="r-${id}-pool">Option pool top-up (%)</label><input id="r-${id}-pool" data-r="pool" type="number" inputmode="decimal" min="0" max="50" step="0.5" value="${pool}"></div></div></fieldset>`; }).join('')}
      <small class="hint">Founders and team start with 100%. The option pool top-up is a percentage of the post-money valuation, created before the round.</small></form>`,
    out: `<div class="tool__out" aria-live="polite"><h2>What founders keep</h2><p class="big"><span data-o="founders">—</span><small>Founders and team ownership after the rounds you switched on</small></p>
      <dl class="stats">${stat('given', 'Given up in total')}${stat('rounds', 'Rounds modelled')}</dl>
      <div class="mini-table"><table><thead><tr><th>Round</th><th>Post-money</th><th>New investors</th><th>Founders</th><th>Founders’ stake</th></tr></thead><tbody data-table></tbody></table></div>
      <div class="bars" data-bars></div></div>`,
    how: ['<p>Each round creates new shares for the new investors and, if you set one, tops up the option pool. Everyone who owned shares before the round owns a smaller slice afterwards. This calculator shows by how much.</p>', '<p class="formula">New investors’ share = amount raised ÷ (pre-money + amount raised)<br>Everyone before the round keeps: 1 − new investors’ share − pool top-up</p>', '<p>The pool top-up is counted in the pre-money valuation, so it dilutes the founders and earlier investors but not the investors in that round. This is why investors often ask for a pool to be created before they invest.</p>', '<p>The model leaves out secondary sales, notes or SAFEs that convert later (use the convertible note calculator for those), anti-dilution terms and liquidation preferences.</p>'],
  }),
  'convertible-note-calculator': () => ({
    tool: `<form class="tool__in" novalidate aria-label="Note terms"><h2>The note or SAFE</h2>${curSel}
      <div class="field"><label for="f-type">Instrument</label><select id="f-type" data-k="type"><option value="note">Convertible note (with interest)</option><option value="safe">SAFE (no interest)</option></select></div>
      <div class="form__row">${num('principal', 'Amount invested', 100000, { step: 1000 })}${num('rate', 'Interest rate per year (%)', 6, { step: 0.5 })}</div>
      <div class="form__row">${num('months', 'Months until conversion', 12, { step: 1 })}${num('cap', 'Valuation cap', 5000000, { step: 10000, hint: 'Enter 0 if there is no cap' })}</div>
      ${num('disc', 'Discount (%)', 20, { step: 1, max: 99, hint: 'Enter 0 if there is no discount' })}
      <h2>The next priced round</h2>
      <div class="form__row">${num('pre', 'Pre-money valuation', 8000000, { step: 10000 })}${num('new', 'New money raised', 2000000, { step: 10000 })}</div>
      ${num('shares', 'Fully diluted shares before the round', 10000000, { step: 1000, hint: 'Count founders, existing holders and the option pool. Leave out the note.' })}</form>`,
    out: `<div class="tool__out" aria-live="polite"><h2>What it converts into</h2><p class="big"><span data-o="price">—</span><small>Conversion price per share</small></p>
      <dl class="stats">${stat('round', 'Round price per share')}${stat('applied', 'Term that applies')}${stat('amount', 'Amount converting')}${stat('noteShares', 'Shares issued')}${stat('own', 'Ownership after the round')}${stat('value', 'Value at the round price')}${stat('multiple', 'Multiple on conversion')}${stat('eff', 'Pre-money value implied')}</dl></div>`,
    how: ['<p>A note or SAFE converts at the lowest of three prices: the price of the new round, the round price after the discount, and the price implied by the valuation cap. The investor gets the best deal the terms allow.</p>', '<p class="formula">Round price = pre-money valuation ÷ shares before the round<br>Cap price = valuation cap ÷ shares before the round<br>Discount price = round price × (1 − discount)<br>Conversion price = lowest of the three<br>Shares issued = (amount + interest) ÷ conversion price</p>', '<p>This is a simplified estimate. It counts the shares before the round without the note, and it treats the cap as a pre-money cap. Post-money SAFEs calculate ownership slightly differently, and your legal documents decide the exact result.</p>'],
  }),
  'fundraising-readiness-checklist': () => {
    const groups = [...new Set(readiness.map((r) => r[0]))];
    return {
      tool: `<form class="tool__in" novalidate aria-label="Readiness checklist"><h2>Tick what is in place today</h2>${groups.map((g, gi) => `<fieldset class="cgroup"><legend class="sr-only">${g}</legend><h3>${g}</h3>${readiness.filter((r) => r[0] === g).map((r, i) => `<label class="check"><input type="checkbox" data-item data-group="${g}" data-label="${esc(r[1])}" data-tip="${esc(r[2])}" id="q-${gi}-${i}"><span>${r[1]}</span></label>`).join('')}</fieldset>`).join('')}</form>`,
      out: `<div class="tool__out" aria-live="polite"><h2>Your readiness</h2><p class="big"><span data-o="score">0%</span><small><strong data-o="band">Early</strong> · <span data-o="count">0 of 16 in place</span><br><span data-o="verdict"></span></small></p><div class="bars" data-bars></div><h2>Still to do</h2><ul class="todo" data-todo></ul></div>`,
      how: ['<p>These sixteen questions cover what investors commonly look for before they commit time to a company: a committed team, a product people use, a believable plan and a tidy set of documents.</p>', '<p>The score is simply the share of items you ticked. It is a conversation starter, not a prediction. Different investors weigh things differently, and strong traction can outweigh gaps elsewhere.</p>'],
    };
  },
  'runway-calculator': () => ({
    tool: `<form class="tool__in" novalidate aria-label="Cash and costs"><h2>Your numbers</h2>${curSel}
      <div class="form__row">${num('cash', 'Cash in the bank', 600000, { step: 1000 })}${num('expenses', 'Monthly expenses', 60000, { step: 500 })}</div>
      <div class="form__row">${num('revenue', 'Monthly revenue today', 15000, { step: 500 })}${num('growth', 'Revenue growth per month (%)', 5, { step: 0.5, hint: 'Use 0 for flat revenue' })}</div>
      ${num('raise', 'Months a fundraise takes you', 6, { step: 1, hint: 'Plan for how long it could take, not how fast it could go' })}</form>`,
    out: `<div class="tool__out" aria-live="polite"><h2>Your runway</h2><p class="big"><span data-o="runway">—</span><small data-o="note">Enter your cash balance and monthly expenses.</small></p>
      <dl class="stats">${stat('burn', 'Net burn today')}${stat('zero', 'Cash runs out')}${stat('start', 'Start raising')}</dl><div class="bars" data-bars></div></div>`,
    how: ['<p>The calculator runs your cash forward month by month. Each month it subtracts your expenses and adds revenue, which grows by the percentage you enter. Runway is the point where the balance reaches zero.</p>', '<p class="formula">Net burn = monthly expenses − monthly revenue<br>Start raising when runway falls to the months a raise takes</p>', '<p>Expenses are held flat. If you plan to hire, raise your monthly expenses to the level you expect, or run the calculator twice for two scenarios.</p>'],
  }),
  'fund-returns-calculator': () => ({
    tool: `<form class="tool__in" novalidate aria-label="Fund figures"><h2>Fund or deal figures</h2>${curSel}
      <div class="form__row">${num('paid', 'Paid-in capital', 10000000, { step: 10000 })}${num('dist', 'Distributions received', 4000000, { step: 10000 })}</div>
      <div class="form__row">${num('nav', 'Remaining value of holdings', 14000000, { step: 10000, hint: 'The current value of what is still held' })}${num('years', 'Years since first investment', 6, { step: 0.5 })}</div>
      <h2>What multiple do I need?</h2>
      <div class="form__row">${num('target', 'Target annual return (%)', 20, { step: 0.5 })}${num('tyears', 'Holding period (years)', 7, { step: 0.5 })}</div></form>`,
    out: `<div class="tool__out" aria-live="polite"><h2>Your returns</h2><p class="big"><span data-o="tvpi">—</span><small>TVPI: total value ÷ paid-in capital</small></p>
      <dl class="stats">${stat('dpi', 'DPI (cash returned)')}${stat('rvpi', 'RVPI (still held)')}${stat('gain', 'Gain so far')}${stat('irr', 'Approximate IRR')}${stat('need', 'Multiple needed for target')}</dl></div>`,
    how: ['<p class="formula">TVPI = (distributions + remaining value) ÷ paid-in capital<br>DPI = distributions ÷ paid-in capital<br>RVPI = remaining value ÷ paid-in capital<br>Approximate IRR = TVPI<sup>1 ÷ years</sup> − 1<br>Multiple needed = (1 + target return)<sup>years</sup></p>', '<p>DPI is cash already in your hands. RVPI is value that is still on paper. TVPI adds the two together, which is why a fund can show a high TVPI long before it has returned much cash.</p>', '<p>The IRR here is a simple approximation. It assumes all the money went in at the start and the total value arrives at the end of the period. A true IRR uses the date of each cash flow, so use a spreadsheet function such as XIRR for fund reporting.</p>'],
  }),
  'founder-equity-split-calculator': () => {
    const crit = [['commit', 'Commitment', 30], ['expert', 'Expertise', 20], ['role', 'Role', 20], ['idea', 'Idea', 15], ['capital', 'Capital', 15]];
    const def = [['Founder A', 5, 4, 5, 5, 3], ['Founder B', 5, 5, 4, 2, 3], ['', 3, 3, 3, 3, 3], ['', 3, 3, 3, 3, 3], ['', 3, 3, 3, 3, 3]];
    return {
      tool: `<form class="tool__in" novalidate aria-label="Founders and weights"><h2>What matters most to you</h2><p class="hint">Weights show how much each factor counts. They do not need to add up to 100.</p><div class="weights">${crit.map(([k, l, w]) => num('w-' + k, l, w, { step: 5, max: 100 })).join('')}</div>
        <h2>Score each founder from 0 to 5</h2><div class="fgrid">${def.map((r, i) => `<fieldset class="rrow" data-founder><div class="field"><label for="fn-${i}">Founder ${i + 1} name${i < 2 ? '' : ' (leave blank to skip)'}</label><input id="fn-${i}" data-f="name" value="${r[0]}" maxlength="40" autocomplete="off"></div><div class="rrow__f">${crit.map(([k, l], j) => `<div class="field"><label for="fs-${i}-${k}">${l}</label><input id="fs-${i}-${k}" data-f="${k}" type="number" inputmode="numeric" min="0" max="5" step="1" value="${r[j + 1]}"></div>`).join('')}</div></fieldset>`).join('')}</div></form>`,
      out: `<div class="tool__out" aria-live="polite"><h2>A starting split</h2><p class="big"><span data-o="lead">—</span><small>Largest share · gap between largest and smallest: <span data-o="spread">—</span></small></p><div class="bars" data-bars></div></div>`,
      how: ['<p>Each founder’s score is the weighted average of their five ratings. Their share of the equity is their score divided by the total of all founders’ scores.</p>', '<p>Treat the result as a starting point for an honest conversation, not a final answer. Most founding teams also agree on four-year vesting with a one-year cliff, so that equity is earned over time and a founder who leaves early does not take a full stake with them.</p>', '<p>Splits that look unfair to one founder tend to cause trouble later. If the result surprises you, talk about why.</p>'],
    };
  },
  'pitch-deck-outline': () => ({
    wide: true,
    tool: `<div class="acc slides" data-acc-single>${slides.map(([t, p, inc, avoid], i) => `<details data-slide="${esc(t)}" data-purpose="${esc(p)}"${i === 0 ? ' open' : ''}><summary><span><span class="slide-n">${String(i + 1).padStart(2, '0')}</span>${t}</span><span class="plus" aria-hidden="true"></span></summary><div class="acc__body"><p><strong>Purpose:</strong> ${p}</p><p><strong>Include:</strong></p><ul>${inc.map((x) => `<li>${x}</li>`).join('')}</ul><p><strong>Avoid:</strong> ${avoid}</p></div></details>`).join('')}</div>
      <div class="btn-row"><button class="btn" type="button" data-copy-outline>Copy outline ${icon('arrow')}</button></div>`,
    how: ['<p>Investors read many decks. A clear order lets them find the answers they look for: what is the problem, who pays, why you, and what you need.</p>', '<p>Aim for 10 to 15 slides that someone can understand without you in the room, plus a short appendix for detail. Keep each slide to one message.</p>'],
  }),
};

export function toolPage(t) {
  const path = toolPath(t); const b = BODY[t.slug]();
  const related = TOOL_LIST.filter((x) => x.path !== path && (x.audience === t.audience || t.audience === 'Founders and investors' || x.audience === 'Everyone')).slice(0, 3);
  const founder = !/Investors$/.test(t.audience) || t.audience === 'Founders and investors';
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Free Tools', '/tools/'], [t.name, path]], media: gfx(t.gfx, { ratio: '4x3', tone: 'white' }), eyebrow: 'Free tool · ' + t.audience, h1: t.h1, lead: t.lead })}
${sec({ id: 'tool-section', label: 'Free tool', chapter: 'Tool', layout: 'stack', h2: 'No login. Nothing is sent anywhere.', body: `<div class="${b.wide ? 'tool tool--wide' : 'tool'}" id="tool" data-tool="${t.slug === 'pitch-deck-outline' ? 'pitch' : t.slug === 'dilution-calculator' ? 'dilution' : t.slug === 'convertible-note-calculator' ? 'convertible' : t.slug === 'fundraising-readiness-checklist' ? 'readiness' : t.slug === 'runway-calculator' ? 'runway' : t.slug === 'fund-returns-calculator' ? 'returns' : 'split'}">${b.tool}${b.out || ''}</div>` })}
${sec({ label: 'How it works', chapter: 'How it works', cls: 'sec--soft', h2: 'How it <span class="hl">works</span>', body: `${b.how.join('')}<p class="disclaimer">${DISCLAIMER}</p>` })}
${sec({ label: 'More free tools', chapter: 'More tools', layout: 'stack', h2: 'More free <span class="hl">tools</span>', body: `${toolGrid(related)}<div class="row-cta">${btn('All free tools', '/tools/', 'btn--ghost')}</div>` })}
<section class="section section--tight surface-white"><div class="container"><div class="cta-band"><p class="eyebrow">${founder ? 'Ready to raise?' : 'Looking for opportunities?'}</p><h2 class="h2" data-split>${founder ? 'Take the next step with Evolve' : 'See what we are backing'}</h2><p class="lead">${founder ? 'Founders can pitch us in about ten minutes. We read every submission.' : 'Talk to the team about early-stage opportunities across Southeast Asia and India.'}</p><div class="btn-row">${founder ? btn('Pitch Your Startup', '/raise-capital/#pitch') + btn('Funding solutions', '/funding-solutions/', 'btn--ghost') : btn('Start Investing', '/start-investing/') + btn('Contact us', '/contact-us/', 'btn--ghost')}</div></div></div></section>`;
  const app = { '@type': 'SoftwareApplication', name: t.name, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': SITE.url + '/#organization' }, url: SITE.url + path };
  return { path, headProps: { title: t.title, description: t.desc, image: `/assets/og/tools-${t.slug}.jpg`, schema: [wp(path, t.name), crumbSchema([['Home', '/'], ['Free Tools', '/tools/'], [t.name, path]]), app] }, body };
}

export function glossaryPage(t) {
  const path = toolPath(t);
  const letters = [...new Set(GLOSSARY.map(([n]) => n[0].toUpperCase()))].sort();
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Free Tools', '/tools/'], [t.name, path]], media: gfx(t.gfx, { ratio: '4x3', tone: 'white' }), eyebrow: 'Free tool · Everyone', h1: t.h1, lead: t.lead })}
<section class="sec" data-chapter="Glossary" data-filter-group><div class="container"><div class="sec__bar reveal"><span class="sec__no"></span><span class="sec__label">${GLOSSARY.length} terms, A to Z</span></div>
  <div class="faq-tools"><label class="search"><span class="sr-only">Search the glossary</span>${icon('search')}<input type="search" data-search placeholder="Search terms" autocomplete="off"></label><div class="chips" role="group" aria-label="Filter by first letter"><button class="chip" type="button" data-cat="all" aria-pressed="true">All</button>${letters.map((l) => `<button class="chip" type="button" data-cat="${l}" aria-pressed="false">${l}</button>`).join('')}</div><p class="faq-count"><span data-count>${GLOSSARY.length}</span> terms</p></div>
  <h2 class="sr-only">All terms</h2>
  <ul class="glossary">${GLOSSARY.map(([n, d]) => `<li data-cats="${n[0].toUpperCase()}" data-text="${esc((n + ' ' + d).toLowerCase())}"><h3>${esc(n)}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
  <div class="empty-state" data-empty hidden>No terms match your search. Try a different word.</div>
  <p class="disclaimer">These definitions are general explanations in plain English. Exact meanings depend on the documents you sign. ${DISCLAIMER}</p></div></section>
${sec({ label: 'More free tools', chapter: 'More tools', cls: 'sec--soft', layout: 'stack', h2: 'More free <span class="hl">tools</span>', body: `${toolGrid(TOOL_LIST.filter((x) => x.path !== path).slice(0, 3))}<div class="row-cta">${btn('All free tools', '/tools/', 'btn--ghost')}</div>` })}`;
  const set = { '@type': 'DefinedTermSet', name: 'Venture capital glossary', url: SITE.url + path, hasDefinedTerm: GLOSSARY.map(([n, d]) => ({ '@type': 'DefinedTerm', name: n, description: d })) };
  return { path, headProps: { title: t.title, description: t.desc, image: `/assets/og/tools-${t.slug}.jpg`, schema: [wp(path, t.name), crumbSchema([['Home', '/'], ['Free Tools', '/tools/'], [t.name, path]]), set] }, body };
}

export function hub() {
  const path = '/tools/';
  const by = (a) => TOOL_LIST.filter((t) => t.audience === a || (a === 'Founders' && t.audience === 'Founders and investors'));
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Free Tools', path]], media: gfx('stack', { ratio: '4x3', tone: 'white', params: { labels: ['Plan', 'Model', 'Pitch'] } }), eyebrow: 'Resources', h1: 'Free <span class="hl-y">Tools</span> for Founders and Investors', lead: 'Calculators, a checklist and a glossary to help you plan a raise, read a term sheet or judge a return. No login, no email, and nothing leaves your browser.' })}
${sec({ label: 'For founders', chapter: 'Founders', layout: 'stack', h2: 'Plan your <span class="hl">raise</span>', body: toolGrid(by('Founders')) })}
${sec({ label: 'For investors', chapter: 'Investors', cls: 'sec--soft', layout: 'stack', h2: 'Measure your <span class="hl">returns</span>', body: toolGrid(by('Investors')) })}
${sec({ label: 'For everyone', chapter: 'Everyone', layout: 'stack', h2: 'Learn the <span class="hl">language</span>', body: toolGrid(by('Everyone')) })}
${sec({ label: 'Our promise', chapter: 'Privacy', cls: 'sec--soft', h2: 'Free, private and <span class="hl">simple</span>', lead: 'These tools exist to help you make better decisions. They are not a lead-capture trick.', body: checks(['No login or account is needed.', 'No email address is asked for.', 'Every calculation runs in your browser. The numbers you type never reach our servers.', 'Tools are for education and planning, not investment, legal, tax or accounting advice.']) })}
<section class="section section--tight surface-white"><div class="container"><div class="cta-band"><p class="eyebrow">Next step</p><h2 class="h2" data-split>Talk to a real person</h2><p class="lead">Tools only go so far. If you are raising or investing, we would like to hear from you.</p><div class="btn-row">${btn('Pitch Your Startup', '/raise-capital/#pitch')}${btn('Contact us', '/contact-us/', 'btn--ghost')}</div></div></div></section>`;
  const list = { '@type': 'ItemList', itemListElement: TOOL_LIST.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + t.path, name: t.name })) };
  return { path, headProps: { title: 'Free Tools for Founders and Investors | Evolve VC', description: 'Free calculators, a readiness checklist and a glossary for founders and investors: dilution, SAFE conversion, runway, fund returns and more. No login.', image: '/assets/og/tools.jpg', schema: [wp(path, 'Free Tools', { '@type': 'CollectionPage' }), crumbSchema([['Home', '/'], ['Free Tools', path]]), list] }, body };
}

export const allToolPages = () => [hub(), ...TOOLS.map((t) => (t.slug === 'venture-capital-glossary' ? glossaryPage(t) : toolPage(t)))];

// Contact, legal pages, 404
import { SITE, icon, btn, titleBlock, pageHero, esc, crumbSchema, logoSvg } from '../lib/site.mjs';
import { latest, postCard } from '../lib/content.mjs';
import { gfx } from '../lib/gfx.mjs';

const wp = (path, name, extra = {}) => ({ '@type': 'WebPage', '@id': SITE.url + path + '#webpage', url: SITE.url + path, name, isPartOf: { '@id': SITE.url + '/#website' }, about: { '@id': SITE.url + '/#organization' }, inLanguage: 'en', ...extra });
const UPDATED = '27 October 2026';

export function contact() {
  const path = '/contact-us/';
  const body = `${pageHero({ crumbItems: [['Home', '/'], ['Contact Us', path]], media: gfx('orbit', { ratio: '1x1', tone: 'clear' }), eyebrow: 'Reach us', h1: 'Contact <span class="hl-y">Us</span>', lead: 'Get in touch with our specialists. Founders ready to raise and investors looking for opportunities, three offices across Singapore and India.', ctas: `<a class="btn" href="mailto:${SITE.email}">${SITE.email} ${icon('mail')}</a>` })}
<section class="section surface-white" id="offices">
  <div class="container contact-grid">
    <div class="stack"><p class="eyebrow">Let's connect</p><h2 class="h2" data-split>Get in Touch with Our <span class="hl-y">Specialists</span></h2>
      <p class="lead">Tell us whether you are a founder, an investor or a partner, and we will point you to the right person.</p>
      <dl class="contact-list"><div><dt>Company mail</dt><dd><a href="mailto:${SITE.email}">${SITE.email}</a></dd></div></dl>
      <div class="office-acc" aria-label="Our offices">${SITE.offices.map((o, i) => `<details id="office-${o.id}"${i === 0 ? ' open' : ''}><summary><span class="icon-badge">${icon('pin')}</span><span><strong>${o.city}</strong><span>${o.role}</span></span>${icon('chevron').replace('<svg ', '<svg class="chev" ')}</summary><address>${o.lines.join('<br>')}<small>${o.coords}</small></address></details>`).join('')}</div>
      <div class="socials" aria-label="Social media">${SITE.socials.map((s) => `<a href="${s.u}" target="_blank" rel="noopener noreferrer" aria-label="${s.n}">${icon(s.i)}</a>`).join('')}</div>
      <p class="form__secure">${icon('lock')}<span>Messages are encrypted in your browser before they leave your device.</span></p></div>
    <form class="form form-card" data-secure-form="contact" data-success="Thank you. Your message was sent securely and our team will reply shortly." novalidate aria-label="Contact form">
      <div class="form__row"><div class="field"><label for="c-name">Full name <span class="req">*</span></label><input id="c-name" name="full-name" autocomplete="name" required><span class="err" aria-live="polite"></span></div><div class="field"><label for="c-email">Email <span class="req">*</span></label><input id="c-email" name="your-email" type="email" autocomplete="email" required><span class="err" aria-live="polite"></span></div></div>
      <div class="form__row"><div class="field"><label for="c-company">Company</label><input id="c-company" name="company" autocomplete="organization"></div><div class="field"><label for="c-role">I am a</label><select id="c-role" name="role"><option>Founder</option><option>Investor</option><option>Partner</option><option>Other</option></select></div></div>
      <div class="field"><label for="c-msg">How can we help? <span class="req">*</span></label><textarea id="c-msg" name="message" maxlength="3000" required></textarea><span class="err" aria-live="polite"></span></div>
      <input type="hidden" name="lead-source" value="contact-page">
      <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="field"><label class="check"><input type="checkbox" name="consent" required> <span>I agree to Evolve Venture Capital storing my details to respond to this message, as described in the <a href="/privacy-policy/">Privacy Policy</a>.</span></label><span class="err" aria-live="polite"></span></div>
      <button class="btn" type="submit">Send message ${icon('arrow')}</button>
      <div class="form__status" role="status"></div>
    </form>
  </div>
</section>`;
  return { path, headProps: { title: 'Contact Evolve Venture Capital | Singapore & India', description: 'Contact Evolve Venture Capital at our Singapore office or our Hyderabad and Guntur offices. Founders and investors, send us a message.', image: '/assets/og/contact-us.jpg', schema: [wp(path, 'Contact Evolve Venture Capital', { '@type': 'ContactPage' }), crumbSchema([['Home', '/'], ['Contact Us', path]])] }, body };
}

/* ------------------------------------------------------------- legal pages */
function legal({ path, name, title, description, lead, sections }) {
  const body = `${pageHero({ crumbItems: [['Home', '/'], [name, path]], eyebrow: 'Legal', h1: name, lead })}
<section class="section surface-paper legal">
  <div class="container legal__grid">
    <nav class="legal__toc" data-spy aria-label="On this page"><p class="mono">On this page</p>${sections.map((s) => `<a href="#${s.id}">${s.h}</a>`).join('')}</nav>
    <div class="prose">
      <p class="mono">Last updated ${UPDATED}</p>
      ${sections.map((s) => `<h2 id="${s.id}">${s.h}</h2>${s.html}`).join('')}
    </div>
  </div>
</section>`;
  return { path, headProps: { title, description, image: '/assets/og/default.jpg', schema: [wp(path, name), crumbSchema([['Home', '/'], [name, path]])] }, body };
}

export const privacy = () => legal({
  path: '/privacy-policy/', name: 'Privacy Policy', title: 'Privacy Policy | Evolve Venture Capital', description: 'How Evolve Venture Capital collects, uses, stores and protects personal data submitted through evolvevcap.com.',
  lead: 'How we collect, use and protect your personal data when you use evolvevcap.com.',
  sections: [
    { id: 'who', h: 'Who we are', html: `<p>This website is operated by ${SITE.legalName} ("Evolve", "we", "us"), 1 Raffles Place, #34-04, Singapore 048616, with offices in Hyderabad and Guntur, India. For privacy questions or requests, email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>` },
    { id: 'collect', h: 'What we collect', html: `<ul><li><strong>Pitch submissions:</strong> name, company, email, funding stage, your message and any pitch deck you upload.</li><li><strong>Contact and whitepaper requests:</strong> name, email, company, role and the message or resource you request.</li><li><strong>Newsletter:</strong> your email address.</li><li><strong>Analytics (only with your consent):</strong> anonymised usage data such as pages viewed, approximate location and device type, collected through Google Analytics 4 with IP anonymisation.</li><li><strong>Technical data:</strong> standard server logs (IP address, browser, pages requested) kept briefly for security and reliability.</li></ul>` },
    { id: 'use', h: 'How we use your data', html: `<ul><li>To review pitches, answer messages and send requested resources.</li><li>To send the newsletter, if you subscribed. You can unsubscribe at any time.</li><li>To understand how the site is used and to improve it, if you accepted analytics.</li><li>To keep the site secure and to meet legal obligations.</li></ul><p>We do not sell personal data and we do not use it for automated decision-making.</p>` },
    { id: 'basis', h: 'Legal basis and consent', html: `<p>We process data on the basis of your consent (forms, newsletter, analytics), our legitimate interest in running and securing the site, and legal obligations. Where the Singapore Personal Data Protection Act 2012 (PDPA), India's Digital Personal Data Protection Act 2023 or the GDPR applies, we handle your data in line with those laws. You can withdraw consent at any time.</p>` },
    { id: 'security', h: 'How we protect your data', html: `<p>The site is served over HTTPS only. Forms on this site encrypt your submission in your browser before it is sent, so that only Evolve can read it. We restrict access to submissions to the people who need them and we keep a minimal set of third-party services.</p>` },
    { id: 'share', h: 'Who we share it with', html: `<p>We share data only with service providers that help us run the site and communicate with you (for example hosting, email delivery and analytics providers), and with professional advisers or authorities where required by law. Your data may be processed in Singapore, India and other countries where our providers operate. We take steps to ensure comparable protection.</p>` },
    { id: 'retention', h: 'How long we keep it', html: `<p>We keep pitch and enquiry data for as long as needed to respond and for a reasonable period afterwards, then delete or anonymise it. Newsletter data is kept until you unsubscribe. Analytics data is kept according to the retention period configured in Google Analytics.</p>` },
    { id: 'rights', h: 'Your rights', html: `<p>You can ask us to access, correct, delete or restrict the use of your personal data, to withdraw consent, and to receive a copy of your data. Email <a href="mailto:${SITE.email}">${SITE.email}</a>. You may also complain to your local data protection authority.</p>` },
    { id: 'cookies', h: 'Cookies and local storage', html: `<p>We use local storage to remember your consent choice. Analytics cookies are set only if you accept them. See the <a href="/cookie-policy/">Cookie Policy</a> for details.</p>` },
    { id: 'changes', h: 'Changes to this policy', html: `<p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>` },
  ],
});

export const terms = () => legal({
  path: '/terms-and-conditions/', name: 'Terms & Conditions', title: 'Terms & Conditions | Evolve Venture Capital', description: 'Terms governing use of evolvevcap.com, including important notices about investment risk and the nature of the information provided.',
  lead: 'The terms for using evolvevcap.com, including important notices about investment risk.',
  sections: [
    { id: 'accept', h: 'Acceptance of these terms', html: `<p>By using evolvevcap.com you agree to these terms. If you do not agree, please do not use the site.</p>` },
    { id: 'info', h: 'Information only, not an offer', html: `<p>The content on this website is provided for general information only. It is not an offer or solicitation to buy or sell any security or fund interest, and it is not investment, legal, tax or accounting advice. Any investment opportunity is made only through formal offering documents to persons who are eligible to receive them under applicable law.</p>` },
    { id: 'risk', h: 'Investment risk', html: `<p>Venture capital and early-stage investing are high risk. Capital can be lost in full. Past performance is not a reliable indicator of future results, and nothing on this site is a promise or guarantee of returns. Statements about markets, sectors and opportunities reflect our views at the time of writing and may change.</p>` },
    { id: 'eligibility', h: 'Who may invest', html: `<p>Investment opportunities are available only to persons who meet the eligibility requirements of the relevant jurisdiction, such as accredited or institutional investors. Access to this website does not mean you are eligible to invest.</p>` },
    { id: 'submissions', h: 'Pitches and enquiries', html: `<p>Submitting a pitch or enquiry does not create any commitment, partnership or investment obligation on either side. Please do not include information you are not comfortable sharing. We handle submissions as described in our <a href="/privacy-policy/">Privacy Policy</a>.</p>` },
    { id: 'ip', h: 'Intellectual property', html: `<p>The content, design, logo and trademarks on this site belong to ${SITE.legalName} or its licensors. You may view and share pages for personal, non-commercial use and may quote short extracts with attribution. You may not copy or reuse the site's content, design or code for other purposes without written permission.</p>` },
    { id: 'links', h: 'Third-party links', html: `<p>This site links to third-party websites, including social networks. We do not control and are not responsible for their content or practices.</p>` },
    { id: 'liability', h: 'Limitation of liability', html: `<p>To the fullest extent permitted by law, we are not liable for any loss arising from your use of, or reliance on, this website or its content. The site is provided "as is" without warranties of any kind.</p>` },
    { id: 'law', h: 'Governing law', html: `<p>These terms are governed by the laws of Singapore, and the courts of Singapore have non-exclusive jurisdiction.</p>` },
    { id: 'contact', h: 'Contact', html: `<p>Questions about these terms: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>` },
  ],
});

export const cookies = () => legal({
  path: '/cookie-policy/', name: 'Cookie Policy', title: 'Cookie Policy | Evolve Venture Capital', description: 'The cookies and browser storage used on evolvevcap.com, and how to change your choices.',
  lead: 'What this website stores in your browser, and how to change your choice.',
  sections: [
    { id: 'what', h: 'What we store', html: `<p>We keep browser storage to a minimum. Nothing optional loads until you choose.</p>
<div class="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr></thead><tbody>
<tr><td><code>evolve-consent</code></td><td>Local storage, essential</td><td>Remembers your cookie choice</td><td>Until you clear it</td></tr>
<tr><td><code>evolve-pl</code></td><td>Session storage, essential</td><td>Skips the intro animation on later pages of the same visit</td><td>Browser session</td></tr>
<tr><td><code>_ga</code>, <code>_ga_*</code></td><td>Cookie, analytics (optional)</td><td>Google Analytics 4 usage statistics, with IP anonymisation. Set only if you accept analytics.</td><td>Up to 2 years</td></tr>
</tbody></table></div>` },
    { id: 'choice', h: 'Your choice', html: `<p>You can accept, reject or customise analytics in the banner shown on your first visit. To change your choice later, use <a href="#" data-consent-open>Cookie settings</a> in the footer. Rejecting analytics does not affect how the site works.</p>` },
    { id: 'browser', h: 'Browser controls', html: `<p>You can also block or delete cookies and site data in your browser settings. Doing so will reset your cookie choice.</p>` },
    { id: 'more', h: 'More information', html: `<p>See our <a href="/privacy-policy/">Privacy Policy</a> or email <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>` },
  ],
});

/* --------------------------------------------------------------------- 404 */
export function notFound() {
  const body = `<section class="nf surface-soft"><div class="page-hero__mark page-hero__mark--l" aria-hidden="true"></div><div class="page-hero__mark page-hero__mark--r" aria-hidden="true"></div>
<div class="container nf__inner"><p class="eyebrow">Error 404</p><h1 class="h1" data-split>Page <span class="hl-y">not found</span></h1><p class="lead">The page you are looking for has moved or never existed. Try one of these instead.</p>
<div class="btn-row">${btn('Back to home', '/', '')}${btn('Raise capital', '/raise-capital/', 'btn--ghost')}${btn('Start investing', '/start-investing/', 'btn--ghost')}${btn('Insights', '/insights/', 'btn--ghost')}</div></div></section>
<section class="section surface-paper"><div class="container"><h2 class="h3-display">Latest insights</h2><div class="post-grid">${latest(3).map((p) => postCard(p)).join('')}</div></div></section>`;
  return { path: '/404.html', headProps: { title: 'Page not found | Evolve Venture Capital', description: 'The page you are looking for could not be found.', robots: 'noindex, follow', schema: [] }, body };
}

// Generates 1200x630 branded Open Graph images (SVG -> JPEG) for pages and posts.
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { esc, IMG } from './lib/site.mjs';
import { LOGO } from './lib/brand.mjs';
import { TOOLS } from './pages/tools.mjs';

const mapSvg = () => { let o = ''; for (const r of [150, 230, 310]) o += `<circle cx="930" cy="315" r="${r}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2" stroke-dasharray="6 10"/>`; for (const [a, r] of [[20, 150], [140, 150], [260, 150], [80, 230], [200, 230], [320, 310]]) o += `<circle cx="${930 + r * Math.cos(a * Math.PI / 180)}" cy="${315 + r * Math.sin(a * Math.PI / 180)}" r="9" fill="#0abf84"/>`; return o + '<circle cx="930" cy="315" r="46" fill="#fbc94b" opacity=".9"/>'; };
const logoWhite = (x, y, w) => { const k = w / 2010; return `<g transform="translate(${x} ${y}) scale(${k})"><rect x="365" y="26" width="1263" height="64" fill="#fbc94b"/>${LOGO.paths.map(([c, d, r]) => `<path fill="${c === 'l-navy' ? '#fff' : '#0abf84'}"${r ? ` fill-rule="${r}"` : ''} d="${d}"/>`).join('')}</g>`; };
function wrap(text, max) { const words = text.split(/\s+/); const lines = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; } if (cur) lines.push(cur.trim()); return lines; }

export async function makeOg(builders, posts) {
  mkdirSync('dist/assets/og', { recursive: true });
  const jobs = [];
  const make = async (file, title, sub, bgImg) => {
    const size = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;
    const lines = wrap(title, Math.floor(980 / (size * 0.56))).slice(0, 4);
    const text = lines.map((l, i) => `<text x="64" y="${330 + i * (size * 1.12)}" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${size}" fill="${i === lines.length - 1 && lines.length > 1 ? '#0abf84' : '#ffffff'}">${esc(l)}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#0a1026" stop-opacity=".96"/><stop offset=".62" stop-color="#0a1026" stop-opacity=".8"/><stop offset="1" stop-color="#0a1026" stop-opacity=".35"/></linearGradient></defs>${bgImg ? '' : '<rect width="1200" height="630" fill="#0a1026"/>' + mapSvg()}<rect width="1200" height="630" fill="${bgImg ? 'url(#g)' : 'none'}"/>${logoWhite(64, 60, 230)}${text}<text x="64" y="590" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#aeb7d3" letter-spacing="2">${esc(sub.toUpperCase())}</text><rect x="0" y="618" width="520" height="12" fill="#fbc94b"/></svg>`;
    let img = sharp(Buffer.from(svg));
    if (bgImg) { const base = await sharp(bgImg).resize(1200, 630, { fit: 'cover' }).toBuffer(); img = sharp(base).composite([{ input: Buffer.from(svg) }]); }
    await img.jpeg({ quality: 82, mozjpeg: true }).toFile(file);
  };
  await make('dist/assets/og/default.jpg', 'Venture Capital Firm in Singapore & India', 'Evolve Venture Capital');
  const pageTitles = { home: 'Venture Capital Firm in Singapore & India', 'about-us': 'About Evolve Venture Capital', 'start-investing': 'Invest in Early-Stage Startups', 'raise-capital': 'Raise Capital for Your Startup', 'funding-solutions': 'Startup Funding Solutions', 'investment-options': 'Venture Capital Investment Options', 'startup-mentorship': 'Startup Mentorship Programme', 'due-diligence': 'Comprehensive Due Diligence', 'investor-faqs': 'Investor FAQs', whitepapers: 'Whitepapers', roti: 'ROTI Calculator: Return on Time Invested', insights: 'Insights', 'contact-us': 'Contact Evolve Venture Capital' };
  for (const [k, t] of Object.entries(pageTitles)) jobs.push(make(`dist/assets/og/${k}.jpg`, t, 'Evolve Venture Capital'));
  jobs.push(make('dist/assets/og/tools.jpg', 'Free Tools for Founders and Investors', 'Evolve Venture Capital'));
  for (const t of TOOLS) jobs.push(make(`dist/assets/og/tools-${t.slug}.jpg`, t.name, 'Free tool · Evolve Venture Capital'));
  for (const p of posts) {
    const m = IMG[p.image]; const src = m ? `dist/assets/img/${m.name}-${m.widths[m.widths.length - 1]}.webp` : null;
    jobs.push(make(`dist/assets/og/post-${p.slug}.jpg`, p.title, p.type === 'report' ? 'Industry report' : 'Evolve Insights', src && existsSync(src) ? src : null));
  }
  for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8));
}

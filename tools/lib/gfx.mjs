// Animated, interactive SVG graphics used in place of photographs (logo green + yellow, light, calm motion).
// Pure SVG + CSS (src/css/gfx.css); no inline styles, so the strict CSP stays intact.
import { esc } from './site.mjs';

const svg = (vb, label, inner, cls = '') => `<svg class="g ${cls}" viewBox="${vb}" role="img" aria-label="${esc(label)}" focusable="false" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

export const COUNTRIES = [['Singapore', 'Hub'], ['India', ''], ['Malaysia', ''], ['Dubai', 'UAE'], ['London', 'UK'], ['USA', '']];
const CAPTIONS = { growth: 'Funding stages', orbit: 'Markets we cover', pipeline: 'Funding process', venn: 'Founders + investors', stack: 'Layers of support', shield: 'Secure process', rocket: 'Growth path', radar: 'Opportunity radar', network: 'Founder network', flow: 'Capital flow', stairs: 'Milestones', compass: 'Our approach', target: 'Focus' };

const G = {
  growth: () => svg('0 0 400 300', 'Bars rising across funding stages from Pre-Seed to Growth', `
<g class="g-grid">${[60, 110, 160, 210].map((y) => `<line x1="20" x2="380" y1="${y}" y2="${y}"/>`).join('')}</g>
${['Pre-Seed', 'Seed', 'Pre-A', 'Series A', 'Growth'].map((t, i) => { const h = [48, 92, 138, 186, 232][i]; const x = 32 + i * 70; return `<g class="col"><rect class="g-bar ${i === 4 ? 'g-bar--y' : ''}" x="${x}" y="${260 - h}" width="48" height="${h}" rx="4"/><text class="g-t" x="${x + 24}" y="282" text-anchor="middle">${t}</text></g>`; }).join('')}
<polyline class="g-draw" points="56,208 126,164 196,118 266,70 336,26" fill="none"/>
${[[56, 208], [126, 164], [196, 118], [266, 70], [336, 26]].map(([x, y]) => `<circle class="g-dot" cx="${x}" cy="${y}" r="6"/>`).join('')}`),

  orbit: ({ countries = COUNTRIES } = {}) => {
    const R = 140;
    const nodes = countries.map(([name, sub], i) => {
      const a = (-90 + i * 60) * Math.PI / 180; const x = 200 + R * Math.cos(a); const y = 200 + R * Math.sin(a);
      const side = Math.cos(a); const anchor = side > 0.2 ? 'start' : side < -0.2 ? 'end' : 'middle';
      const lx = side > 0.2 ? 20 : side < -0.2 ? -20 : 0; const ly = Math.abs(side) > 0.2 ? 5 : (Math.sin(a) < 0 ? -22 : 34);
      return { name, sub, x, y, anchor, lx, ly };
    });
    return svg('-60 -10 520 420', 'Evolve at the centre of a network covering Singapore, India, Malaysia, Dubai, London and the USA', `
<circle class="o-ring" cx="200" cy="200" r="${R}"/><circle class="o-ring o-ring--2" cx="200" cy="200" r="88"/>
${nodes.map((n, i) => `<path id="o-l${i}" class="o-line" d="M200 200L${n.x.toFixed(1)} ${n.y.toFixed(1)}"/>`).join('')}
${nodes.map((n, i) => `<circle class="o-pkt" r="4.5"><animateMotion dur="5s" begin="${(i * 0.8).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"><mpath href="#o-l${i}"/></animateMotion></circle>`).join('')}
${nodes.map((n) => `<g class="o-node" transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})"><circle class="o-halo" r="20"/><circle class="o-dot" r="11"/><circle class="o-in" r="4.5"/><text class="o-name" x="${n.lx}" y="${n.ly}" text-anchor="${n.anchor}">${n.name}</text>${n.sub ? `<text class="o-sub" x="${n.lx}" y="${n.ly + 16}" text-anchor="${n.anchor}">${n.sub}</text>` : ''}</g>`).join('')}
<circle class="o-pulse" cx="200" cy="200" r="54"/><circle class="o-pulse o-pulse--2" cx="200" cy="200" r="54"/>
<g class="o-core"><circle class="o-core-bg" cx="200" cy="200" r="54"/><image href="/assets/img/emblem-96.png" x="158" y="156" width="84" height="86"/></g>`, 'g--orbit');
  },

  pipeline: ({ steps = [['Pitch', '10 min'], ['Review', '5 days'], ['Call', '1 hour'], ['Term sheet', '4–6 weeks']] } = {}) => svg('0 26 440 150', 'A funding pipeline from pitch to term sheet', `
<path id="pl-path" class="p-rail" d="M60 90H380"/>
${steps.map(([t, s], i) => `<g class="p-step"><rect x="${14 + i * 106}" y="62" width="92" height="56" rx="6"/><text class="g-t g-t--b" x="${60 + i * 106}" y="95" text-anchor="middle">${t}</text><text class="g-t g-t--m" x="${60 + i * 106}" y="146" text-anchor="middle">${s}</text><path class="p-check" d="M${50 + i * 106} 44l8 8 14-16"/></g>`).join('')}
<circle class="p-packet" r="7"><animateMotion dur="8s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#pl-path"/></animateMotion></circle>`),

  venn: ({ a = 'Founders', b = 'Investors', mid = 'Evolve' } = {}) => svg('40 40 320 220', `${a} and ${b} meeting through Evolve`, `
<g class="v-left"><circle class="v-c v-c--a" cx="150" cy="150" r="96"/><text class="g-t g-t--b" x="98" y="155" text-anchor="middle">${a}</text></g>
<g class="v-right"><circle class="v-c v-c--b" cx="250" cy="150" r="96"/><text class="g-t g-t--b" x="302" y="155" text-anchor="middle">${b}</text></g>
<g class="v-mid"><circle class="v-ring" cx="200" cy="150" r="32"/><rect class="v-badge" x="168" y="134" width="64" height="32" rx="6"/><text class="g-t g-t--b" x="200" y="155" text-anchor="middle">${mid}</text></g>`),

  stack: ({ labels = ['Custom Capital', 'Strategic Mentorship', 'Scaling Strategies'] } = {}) => svg('50 30 280 296', 'Layers of capital, mentorship and strategy stacked together', labels.map((t, i) => { const y = 190 - i * 74; return `<g class="s-plate s-plate--${i + 1}"><polygon class="s-side" points="70,${y + 55} 190,${y + 110} 190,${y + 124} 70,${y + 69}"/><polygon class="s-side s-side--r" points="190,${y + 110} 310,${y + 55} 310,${y + 69} 190,${y + 124}"/><polygon class="s-top" points="190,${y} 310,${y + 55} 190,${y + 110} 70,${y + 55}"/><text class="g-t g-t--b" x="190" y="${y + 82}" text-anchor="middle">${t}</text></g>`; }).join('')),

  shield: () => svg('50 22 300 256', 'A shield with a check mark representing secure processes', `
<circle class="sh-ring" cx="200" cy="150" r="118"/>
<path class="sh-shape" d="M200 40l86 30v70c0 54-36 92-86 110-50-18-86-56-86-110V70z"/>
<path class="sh-check" d="M160 150l30 30 52-60"/>
${[[70, 70], [330, 80], [316, 232], [80, 236]].map(([x, y]) => `<g class="sh-doc" transform="translate(${x - 12} ${y - 15})"><rect width="24" height="30" rx="3"/><path d="M6 10h12M6 16h12M6 22h8"/></g>`).join('')}`),

  rocket: () => svg('0 0 400 480', 'A rocket climbing a growth path through three milestones', `
<path id="rk-path" class="r-path" d="M50 440C120 440 140 340 200 320S290 300 300 220 320 110 350 50"/>
${[[200, 320], [300, 220], [350, 50]].map(([x, y], i) => `<g class="r-mile r-mile--${i + 1}"><circle cx="${x}" cy="${y}" r="14"/><path d="M${x - 5} ${y}l4 4 7-8"/></g>`).join('')}
<g class="r-rocket"><g transform="rotate(90)"><path class="r-fin" d="M-10 8l-16 14 10 2z M-10 -8l-16 -14 10 -2z"/><path class="r-body" d="M-18 0C-6 -22 20 -16 30 0 20 16 -6 22 -18 0z"/><circle class="r-win" cx="6" cy="0" r="6"/><path class="r-flame" d="M-18 0l-22 -7 7 7 -7 7z"/></g><animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1"><mpath href="#rk-path"/></animateMotion></g>`),

  radar: () => svg('30 30 340 340', 'A radar sweep finding opportunities', `
${[160, 120, 80, 40].map((r) => `<circle class="rd-ring" cx="200" cy="200" r="${r}"/>`).join('')}<path class="rd-cross" d="M40 200h320M200 40v320"/>
<g class="rd-sweep"><path d="M200 200L200 40A160 160 0 0 1 313 87Z"/><line x1="200" y1="200" x2="200" y2="40"/></g>
${[[260, 120], [130, 150], [290, 250], [170, 280], [230, 230]].map(([x, y]) => `<g class="rd-blip"><circle class="rd-pulse" cx="${x}" cy="${y}" r="6"/><circle cx="${x}" cy="${y}" r="6"/></g>`).join('')}<circle class="rd-core" cx="200" cy="200" r="8"/>`),

  network: () => svg('30 12 360 320', 'A network of founders connected to mentors and advisors', (() => {
    const pts = [[210, 170], [90, 70], [330, 70], [60, 230], [360, 230], [210, 300], [210, 40], [130, 280], [290, 280]];
    const links = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 3], [2, 4], [3, 7], [4, 8], [1, 6], [2, 6], [7, 5], [8, 5]];
    return `${links.map(([a, b]) => `<line class="n-link" x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}"/>`).join('')}
${pts.map(([x, y], i) => `<g class="n-node ${i === 0 ? 'n-node--hub' : ''}" transform="translate(${x} ${y})"><circle class="n-halo" r="${i === 0 ? 34 : 22}"/><circle class="n-c" r="${i === 0 ? 24 : 14}"/>${i === 0 ? '<image href="/assets/img/emblem-96.png" x="-19" y="-19" width="38" height="39"/>' : '<circle class="n-head" cy="-3" r="4"/><path class="n-body" d="M-7 8a7 7 0 0114 0z"/>'}</g>`).join('')}
${[[210, 170, 90, 70], [210, 170, 360, 230]].map(([a, b, c, d], i) => `<circle class="n-packet" r="4.5"><animateMotion dur="${4 + i}s" repeatCount="indefinite" path="M${a} ${b}L${c} ${d}"/></circle>`).join('')}`;
  })()),

  flow: ({ from = 'Investors', to = 'Founders' } = {}) => svg('0 14 520 290', `Capital flowing from ${from} to ${to}`, `
<g class="f-box f-box--a"><rect x="14" y="74" width="132" height="152" rx="8"/><text class="g-t g-t--b" x="80" y="214" text-anchor="middle">${from}</text>${[0, 1, 2].map((i) => `<ellipse class="f-coin" cx="80" cy="${170 - i * 18}" rx="30" ry="9"/>`).join('')}</g>
<g class="f-box f-box--b"><rect x="374" y="74" width="132" height="152" rx="8"/><text class="g-t g-t--b" x="440" y="214" text-anchor="middle">${to}</text>${[0, 1, 2, 3].map((i) => `<rect class="f-bar" x="${394 + i * 25}" y="${150 - i * 14}" width="16" height="${26 + i * 14}" rx="3"/>`).join('')}</g>
<path id="f-p1" class="f-rail" d="M146 120C220 40 300 40 374 120"/><path id="f-p2" class="f-rail" d="M146 150C230 150 290 150 374 150"/><path id="f-p3" class="f-rail" d="M146 180C220 260 300 260 374 180"/>
${[1, 2, 3].flatMap((n) => [0, 1].map((k) => `<circle class="f-p" r="6"><animateMotion dur="4.4s" begin="${(n - 1) * 0.7 + k * 2.2}s" repeatCount="indefinite"><mpath href="#f-p${n}"/></animateMotion></circle>`)).join('')}
<text class="g-t g-t--m" x="260" y="30" text-anchor="middle">Capital</text><text class="g-t g-t--m" x="260" y="288" text-anchor="middle">Growth &amp; returns</text>`),

  stairs: () => svg('20 0 370 330', 'Steps rising towards a goal flag', `
${[0, 1, 2, 3, 4].map((i) => `<rect class="st-step st-step--${i + 1}" x="${30 + i * 62}" y="${250 - i * 44}" width="62" height="${70 + i * 44}" rx="3"/>`).join('')}
<g class="st-flag"><path d="M340 38V6"/><path class="st-cloth" d="M340 6l36 10-36 10z"/></g>
<circle class="st-hero" r="10"><animateMotion dur="7s" repeatCount="indefinite" path="M52 238L114 238 114 194 176 194 176 150 238 150 238 106 300 106 300 62 340 62"/></circle>`),

  compass: ({ labels = ['Funding Expertise', 'Mentorship Programs', 'Growth Roadmaps'] } = {}) => svg('-40 0 480 400', 'A compass pointing to funding expertise, mentorship and growth roadmaps', `
<circle class="c-ring c-ring--o" cx="200" cy="200" r="170"/><circle class="c-ring" cx="200" cy="200" r="130"/>
<g class="c-ticks">${Array.from({ length: 36 }, (_, i) => `<line x1="200" y1="${30 + (i % 3 === 0 ? 0 : 8)}" x2="200" y2="48" transform="rotate(${i * 10} 200 200)"/>`).join('')}</g>
${labels.map((t, i) => { const a = [-60, 60, 180][i]; return `<g class="c-lab" transform="rotate(${a} 200 200) translate(200 30)"><g transform="rotate(${-a})"><circle r="9"/><text class="g-t g-t--b" y="${i === 2 ? 32 : -16}" text-anchor="middle">${t}</text></g></g>`; }).join('')}
<g class="c-needle"><path class="c-n1" d="M200 90l18 110h-36z"/><path class="c-n2" d="M200 310l-18-110h36z"/></g><circle class="c-hub" cx="200" cy="200" r="12"/>`),

  target: () => svg('20 20 280 270', 'An arrow hitting the centre of a target', `
${[120, 88, 56, 24].map((r, i) => `<circle class="t-ring t-ring--${i + 1}" cx="150" cy="150" r="${r}"/>`).join('')}
<circle class="t-ripple" cx="150" cy="150" r="24"/><g class="t-arrow"><path d="M150 150L262 38"/><path class="t-fletch" d="M262 38l22-4-4 22z M250 50l22-4-4 22z"/></g>`),
};

/** Framed graphic: gfx('growth', { ratio:'4x3', tone:'tint', fill:false, cap:'…' }) */
export function gfx(type, { ratio = '4x3', tone = 'tint', cls = '', params = {}, fill = false, cap } = {}) {
  const caption = cap === false ? '' : `<span class="gfx__cap">${esc(cap || CAPTIONS[type] || '')}</span>`;
  return `<div class="gfx gfx--${ratio} gfx--${tone}${tone !== 'clear' ? ` gfx--t-${type}` : ''} ${cls}" data-gfx="${type}">${caption}${G[type](params)}</div>`;
}

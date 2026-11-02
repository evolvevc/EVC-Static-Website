// Logo (vector rebuild of the Evolve wordmark) and icon set.
export const LOGO = {
  vb: '0 0 2010 540',
  paths: [
    ['l-navy', 'M30 28H283V104H116V218H248V292H116V436H297V514H30Z'],
    ['l-green', 'M347 142H422L478 300 500 368 522 300 577 142H650L503 514H495Z'],
    ['l-green', 'M704 327a154 192 0 1 0 308 0a154 192 0 1 0-308 0ZM775 327a83 136 0 1 0 166 0a83 136 0 1 0-166 0Z', 'evenodd'],
    ['l-green', 'M1117 142H1185V455H1296V513H1117Z'],
    ['l-green', 'M1343 142H1418L1474 300 1496 368 1518 300 1573 142H1646L1499 514H1491Z'],
    ['l-navy', 'M1975 20H1722V96H1889V210H1757V284H1889V428H1708V506H1975Z'],
  ],
  bar: [365, 26, 1263, 64],
};

/** Inline SVG logo. `variant` "full" | "pre" (preloader, letters animate) */
export function logoSvg({ title = 'Evolve Venture Capital', variant = 'full', cls = '' } = {}) {
  const [bx, by, bw, bh] = LOGO.bar;
  const letters = LOGO.paths.map(([c, d, rule], i) => {
    const attrs = rule ? ` fill-rule="${rule}"` : '';
    if (variant === 'pre') return `<path class="pl-letter ${c === 'l-navy' ? 'pl-l' : 'pl-g'}" d="${d}"${attrs}/>`;
    return `<path class="${c}" d="${d}"${attrs}/>`;
  }).join('');
  const bar = variant === 'pre' ? `<rect class="pl-bar pl-y" x="${bx}" y="${by}" width="${bw}" height="${bh}"/>` : `<rect class="l-yellow" x="${bx}" y="${by}" width="${bw}" height="${bh}"/>`;
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.vb}" role="img" aria-label="${title}" focusable="false">${bar}${letters}</svg>`;
}

/** Standalone SVG file strings */
export const logoFile = (navy = '#0a1026') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.vb}"><rect x="365" y="26" width="1263" height="64" fill="#fbc94b"/>${LOGO.paths.map(([c, d, r]) => `<path fill="${c === 'l-navy' ? navy : '#0abf84'}"${r ? ` fill-rule="${r}"` : ''} d="${d}"/>`).join('')}</svg>`;
export const eMarkFile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 267 486"><path fill="#ffffff" d="M0 0H253V76H86V190H218V264H86V408H267V486H0Z"/></svg>`;

const S = (inner, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${inner}</svg>`;
const F = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;
export const ICONS = {
  arrow: S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  chevron: S('<path d="M6 9l6 6 6-6"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: S('<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/>'),
  mail: S('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
  pin: S('<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  rocket: S('<path d="M5 15c-1.5 1.5-2 4-2 6 2 0 4.5-.5 6-2M14 4c3-1.5 6-1 7-1 0 1 .5 4-1 7l-6 6-5-5 5-7z"/><circle cx="15.5" cy="8.5" r="1.5"/>'),
  chart: S('<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>'),
  network: S('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M11 7.3L6 16.7M13 7.3l5 9.4M7.5 19h9"/>'),
  shield: S('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  users: S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.5 0 4 1.5 4.5 4.5"/>'),
  compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>'),
  layers: S('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>'),
  target: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>'),
  book: S('<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/>'),
  sprout: S('<path d="M12 21v-9"/><path d="M12 12C12 8 9 5 4 5c0 4 3 7 8 7zM12 14c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6z"/>'),
  scale: S('<path d="M12 3v18M5 21h14M5 7h14"/><path d="M5 7l-3 7a3.5 3.5 0 006 0L5 7zM19 7l-3 7a3.5 3.5 0 006 0l-3-7z"/>'),
  handshake: S('<path d="M3 11l4-4 4 2 4-2 6 5-3 3"/><path d="M8 15l3 3a2 2 0 003 0l5-5"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  bulb: S('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>'),
  file: S('<path d="M6 3h8l5 5v13H6V3z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'),
  download: S('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  calc: S('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>'),
  clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  upload: S('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'),
  linkedin: F('<path d="M4.5 9h3.6v11H4.5zM6.3 3.5a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2zM10 9h3.4v1.6c.6-1 1.9-1.9 3.8-1.9 3.6 0 4.3 2.3 4.3 5.4V20h-3.6v-5.1c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V20H10z"/>'),
  x: F('<path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/>'),
  instagram: S('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/>'),
  facebook: F('<path d="M14 8.5V7c0-.8.5-1 1-1h2V3h-3a4 4 0 00-4 4v1.5H7.5V12H10v9h4v-9h2.7l.5-3.5H14z"/>'),
  youtube: S('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor"/>'),
  pinterest: S('<circle cx="12" cy="12" r="9"/><path d="M10.5 19l1.8-7.4M9.5 10.5c.5-2 2-3 3.6-2.7 2 .4 2.5 2.7 1.5 4.4-.8 1.3-2.2 1.7-3 1.2"/>'),
  link: S('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1"/>'),
};
export const icon = (n) => ICONS[n] || '';

/* Evolve Venture Capital — site behaviour. Plain ES modules, no dependencies, no inline code (strict CSP). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

/* ---------- Preloader ---------- */
function initPreloader() {
  const pl = $('.preloader');
  if (!pl) return;
  if (root.classList.contains('no-preloader')) { pl.remove(); return; }
  const start = performance.now();
  const done = () => {
    const wait = Math.max(0, 1500 - (performance.now() - start));
    setTimeout(() => {
      pl.classList.add('is-done');
      try { sessionStorage.setItem('evolve-pl', '1'); } catch (e) {}
      document.dispatchEvent(new CustomEvent('evolve:ready'));
      setTimeout(() => pl.remove(), 1400);
    }, wait);
  };
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]).then(() => (document.readyState === 'complete' ? done() : addEventListener('load', done, { once: true })));
}

/* ---------- Header, mega menu, mobile menu ---------- */
function initHeader() {
  const header = $('.site-header');
  if (!header) return;
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-solid', y > 30);
    if (!document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > 360 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y; ticking = false;
    root.style.setProperty('--scroll', y);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const toggle = $('.menu-toggle');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) header.classList.remove('is-hidden');
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); $$('.mega.is-open').forEach((m) => m.classList.remove('is-open')); $$('.nav__link[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false')); } });
  $$('.mobile-menu nav > *').forEach((el, i) => el.style.setProperty('--i', i));

  // click/touch support for dropdown buttons (hover still works with CSS)
  $$('.nav__item > button.nav__link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      const open = btn.getAttribute('aria-expanded') !== 'true';
      $$('.nav__item > button.nav__link').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.nextElementSibling?.classList.remove('is-open'); });
      btn.setAttribute('aria-expanded', String(open));
      panel?.classList.toggle('is-open', open);
    });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav__item')) { $$('.mega.is-open').forEach((m) => m.classList.remove('is-open')); $$('.nav__item > button.nav__link').forEach((b) => b.setAttribute('aria-expanded', 'false')); } });
}

/* ---------- Scroll reveal, word splitting, parallax ---------- */
function initReveal() {
  const targets = $$('.reveal, [data-split], .eyebrow, .gfx');
  $$('[data-stagger]').forEach((g) => Array.from(g.children).forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', Math.min(i, 8) * 90 + 'ms'); targets.push(c); }));
  if (!('IntersectionObserver' in window) || reduceMotion) { targets.forEach((t) => t.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  const begin = () => targets.forEach((t) => io.observe(t));
  if (root.classList.contains('no-preloader') || !$('.preloader')) begin(); else document.addEventListener('evolve:ready', begin, { once: true });
}
/* ---------- Carousel ---------- */
function initCarousel() {
  $$('[data-carousel]').forEach((c) => {
    const track = $('.carousel__track', c); const box = c.closest('section') || document;
    const step = () => { const card = $('.post-card:not([hidden])', track); return card ? card.getBoundingClientRect().width + 20 : 360; };
    $('[data-carousel-prev]', box)?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    $('[data-carousel-next]', box)?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  });
}

/* ---------- Tabs, accordions, switchers, steppers ---------- */
function initTabs() {
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
    const select = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); } if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
    const hash = location.hash.slice(1); const pre = tabs.findIndex((t) => t.id === hash || t.dataset.tab === hash);
    select(pre >= 0 ? pre : 0);
  });
}
function initAccordions() {
  $$('[data-acc-single]').forEach((g) => {
    $$('details', g).forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('details', g).forEach((o) => { if (o !== d) o.open = false; }); }));
  });
}
function initSwitcher() {
  $$('[data-switcher]').forEach((box) => {
    const btns = $$('[data-filter]', box), items = $$('[data-for]', box);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.filter;
      items.forEach((it) => it.classList.toggle('is-dim', f !== 'all' && !it.dataset.for.split(' ').includes(f)));
    }));
  });
}
function initStepper() {
  $$('[data-stepper]').forEach((box) => {
    const steps = $$('[data-step]', box);
    const set = (i) => { steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-past', k < i); s.setAttribute('aria-current', k === i ? 'step' : 'false'); }); box.style.setProperty('--prog', (i / (steps.length - 1)).toFixed(3)); };
    steps.forEach((s, i) => { s.addEventListener('mouseenter', () => set(i)); s.addEventListener('focusin', () => set(i)); s.addEventListener('click', () => set(i)); });
    set(0);
    if ('IntersectionObserver' in window && !reduceMotion) {
      let k = 0; const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); const t = setInterval(() => { set(k++); if (k >= steps.length) clearInterval(t); }, 520); } }, { threshold: 0.4 }); io.observe(box);
    }
  });
}
function initTimeline() {
  $$('[data-timeline]').forEach((tl) => {
    const upd = () => { const r = tl.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height)); tl.style.setProperty('--tl', p.toFixed(3)); $$('.tl-item', tl).forEach((it) => { it.classList.toggle('is-lit', it.getBoundingClientRect().top < innerHeight * 0.65); }); };
    addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true }); upd();
  });
}
function initScrollspy() {
  $$('[data-spy]').forEach((nav) => {
    const links = $$('a[href^="#"]', nav); const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const secs = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { links.forEach((l) => l.classList.remove('is-active')); map.get(e.target.id)?.classList.add('is-active'); } }), { rootMargin: '-35% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
  });
}

/* ---------- Filtering (insights hub, FAQ search) ---------- */
function initFilters() {
  $$('[data-filter-group]').forEach((box) => {
    const items = $$('[data-cats]', box), chips = $$('[data-cat]', box), search = $('[data-search]', box), count = $('[data-count]', box), empty = $('[data-empty]', box);
    let cat = 'all', q = '';
    const apply = () => {
      let n = 0;
      items.forEach((it) => {
        const okCat = cat === 'all' || it.dataset.cats.split('|').includes(cat);
        const okQ = !q || (it.dataset.text || it.textContent).toLowerCase().includes(q);
        const show = okCat && okQ; it.hidden = !show; if (show) n++;
      });
      if (count) count.textContent = String(n);
      if (empty) empty.hidden = n !== 0;
    };
    chips.forEach((c) => c.addEventListener('click', () => { cat = c.dataset.cat; chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c))); apply(); }));
    search?.addEventListener('input', () => { q = search.value.trim().toLowerCase(); apply(); });
    const pre = new URLSearchParams(location.search).get('cat'); if (pre) { const c = chips.find((x) => x.dataset.cat === pre); c?.click(); }
  });
}

/* ---------- Modals (whitepaper requests) ---------- */
function initModals() {
  $$('[data-modal-open]').forEach((b) => b.addEventListener('click', () => {
    const d = document.getElementById(b.dataset.modalOpen); if (!d) return;
    const title = $('[data-modal-title]', d), hid = $('input[name="resource"]', d);
    if (b.dataset.title) { if (title) title.textContent = b.dataset.title; if (hid) hid.value = b.dataset.title; }
    const f = $('form', d); if (f) f.dataset.download = b.dataset.file || '';
    d.showModal?.(); $('input:not([type=hidden])', d)?.focus();
  }));
  $$('dialog.modal').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-modal-close]')) d.close(); });
  });
}

/* ---------- Post helpers: reading progress, TOC, share ---------- */
function initArticle() {
  const art = $('[data-article]');
  if (!art) return;
  const bar = $('.progress-bar');
  if (bar && !CSS.supports('animation-timeline: scroll()')) {
    const upd = () => { const r = art.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (-r.top) / Math.max(1, r.height - innerHeight * 0.6))); bar.style.setProperty('--p', p.toFixed(3)); };
    addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true }); upd();
  }
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    // Icon-only button: show the "copied" state as a label/colour change, not by replacing the icon markup.
    try { await navigator.clipboard.writeText(location.href.split('#')[0]); const t = b.getAttribute('aria-label'); b.setAttribute('aria-label', 'Link copied'); b.classList.add('is-copied'); setTimeout(() => { b.setAttribute('aria-label', t); b.classList.remove('is-copied'); }, 1800); } catch (e) { /* ignore */ }
  }));
}

/* ---------- Consent + optional analytics (loads only after opt-in) ---------- */
function initConsent() {
  const box = $('#consent'); if (!box) return;
  const GA = $('meta[name="evolve:ga4"]')?.content;
  const get = () => { try { return JSON.parse(localStorage.getItem('evolve-consent') || 'null'); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem('evolve-consent', JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const loadGA = () => {
    if (!GA || window.__gaLoaded) return; window.__gaLoaded = true;
    import('/assets/js/analytics.js').then((m) => m.start(GA)).catch(() => {});
  };
  const show = () => box.classList.add('is-visible');
  const hide = () => box.classList.remove('is-visible');
  const prefs = $('#consent-prefs'), main = $('#consent-main');
  const cur = get();
  if (cur) { if (cur.analytics) loadGA(); } else setTimeout(show, 1800);
  $('[data-consent="accept"]')?.addEventListener('click', () => { set({ analytics: true, ts: Date.now() }); hide(); loadGA(); });
  $('[data-consent="reject"]')?.addEventListener('click', () => { set({ analytics: false, ts: Date.now() }); hide(); });
  $('[data-consent="prefs"]')?.addEventListener('click', () => { main.hidden = true; prefs.hidden = false; });
  $('[data-consent="save"]')?.addEventListener('click', () => { const a = $('#consent-analytics').checked; set({ analytics: a, ts: Date.now() }); hide(); if (a) loadGA(); });
  $$('[data-consent-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); main.hidden = false; prefs.hidden = true; show(); }));
}

/* ---------- Animated graphics: pointer parallax, hover pause, reduced motion ---------- */
function initGfx() {
  $$('.gfx').forEach((g) => {
    const svgs = $$('svg', g);
    const still = !g.closest('.hero, .page-hero');
    if (still) g.classList.add('is-static');
    if (reduceMotion || still) svgs.forEach((s) => s.pauseAnimations?.());
    if (still) return;
    if (!finePointer || reduceMotion) return;
    g.addEventListener('pointermove', (e) => { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(2)); g.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(2)); });
    g.addEventListener('pointerleave', () => { g.style.setProperty('--mx', 0); g.style.setProperty('--my', 0); svgs.forEach((s) => s.unpauseAnimations?.()); });
  });
}

/* ---------- Chapter bar: numbered jump links built from [data-chapter] sections ---------- */
function initChapters() {
  const secs = $$('[data-chapter]'); const header = $('.site-header');
  if (secs.length < 3 || !header) return;
  const bar = document.createElement('nav'); bar.className = 'chapters'; bar.setAttribute('aria-label', 'On this page');
  const list = document.createElement('div'); list.className = 'chapters__list';
  const links = secs.map((s, i) => {
    if (!s.id) s.id = 'ch-' + (i + 1);
    const a = document.createElement('a'); a.href = '#' + s.id;
    const n = document.createElement('b'); n.textContent = String(i + 1).padStart(2, '0');
    a.append(n, document.createTextNode(s.dataset.chapter)); list.append(a); return a;
  });
  bar.append(list); header.after(bar);
  let ticking = false;
  const upd = () => {
    ticking = false;
    const first = secs[0].getBoundingClientRect().top, last = secs[secs.length - 1].getBoundingClientRect();
    bar.classList.toggle('is-visible', first < innerHeight * 0.55 && last.bottom > innerHeight * 0.3);
    const range = Math.max(1, last.bottom - secs[0].getBoundingClientRect().top - innerHeight * 0.4);
    bar.style.setProperty('--chap', Math.min(1, Math.max(0, (innerHeight * 0.3 - first) / range)).toFixed(3));
    let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    links.forEach((a, i) => { const on = i === cur; a.classList.toggle('is-active', on); if (on && bar.classList.contains('is-visible')) { const l = a.parentElement; const x = a.offsetLeft - l.clientWidth / 2 + a.offsetWidth / 2; if (Math.abs(l.scrollLeft - x) > 40) l.scrollTo({ left: x, behavior: reduceMotion ? 'auto' : 'smooth' }); } });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true }); addEventListener('resize', upd); upd();
}

/* ---------- Statement text that fills in word by word while scrolling ---------- */
function initFill() {
  $$('[data-fill]').forEach((box) => {
    const words = [];
    $$('p', box).forEach((p) => { const parts = p.textContent.trim().split(/\s+/); p.textContent = ''; parts.forEach((w, i) => { const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = w; p.append(sp, document.createTextNode(i < parts.length - 1 ? ' ' : '')); words.push(sp); }); });
    if (reduceMotion || !words.length) { words.forEach((w) => w.classList.add('is-on')); return; }
    let ticking = false, shown = -1;
    const upd = () => {
      ticking = false; const r = box.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.88 - r.top) / (r.height + innerHeight * 0.36)));
      const n = Math.round(p * words.length * 1.08); if (n === shown) return; shown = n;
      words.forEach((w, i) => w.classList.toggle('is-on', i < n));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  });
}

/* ---------- Back-to-top button ---------- */
function initToTop() {
  const b = $('.to-top'); if (!b) return;
  let t = false; const upd = () => { b.classList.toggle('is-visible', scrollY > 700); t = false; };
  addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  b.addEventListener('click', () => { scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); $('#top a, .skip-link')?.focus?.({ preventScroll: true }); });
}

/* ---------- Lazy feature modules ---------- */
function initLazy() {
  if ($('form[data-secure-form]')) import('/assets/js/forms.js').then((m) => m.init()).catch(() => {});
  if ($('[data-tool]')) import('/assets/js/tools.js').then((m) => m.init()).catch(() => {});
  if ($('#roti')) import('/assets/js/roti.js').then((m) => m.init()).catch(() => {});
}

/* ---------- Smooth in-page anchors with header offset (CSS handles padding) ---------- */
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href') === '#') return;
    const t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  });
}

function boot() {
  initPreloader(); initHeader(); initReveal();
  initGfx(); initChapters(); initFill(); initToTop(); initCarousel(); initTabs(); initAccordions(); initSwitcher(); initStepper(); initTimeline(); initScrollspy(); initFilters(); initModals(); initArticle(); initConsent(); initAnchors(); initLazy();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

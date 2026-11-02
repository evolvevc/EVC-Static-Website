/* Free tools: every calculation runs in the visitor's browser. Nothing is stored or sent anywhere.
   Each tool is a small function keyed by the data-tool attribute on #tool. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const SYM = { USD: 'US$', SGD: 'S$', INR: '₹' };

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export function init() {
  const root = $('[data-tool]'); if (!root) return;
  $('.tool__in', root)?.addEventListener('submit', (e) => e.preventDefault());
  const k = (n) => $(`[data-k="${n}"]`, root);
  const o = (n) => $(`[data-o="${n}"]`, root);
  const c = {
    root, k, o, h,
    out: (n, v) => { const el = o(n); if (el) el.textContent = v; },
    val: (n) => { const v = parseFloat(k(n)?.value); return Number.isFinite(v) ? v : 0; },
    cur: () => k('cur')?.value || 'USD',
    money(n) {
      const cur = c.cur(); const s = SYM[cur] || ''; const a = Math.abs(n);
      let v;
      if (cur === 'INR' && a >= 1e7) v = (a / 1e7).toFixed(2) + ' Cr';
      else if (a >= 1e9) v = (a / 1e9).toFixed(2) + 'B';
      else if (a >= 1e6) v = (a / 1e6).toFixed(2) + 'M';
      else if (a >= 1e4) v = Math.round(a).toLocaleString('en-US');
      else v = a.toLocaleString('en-US', { maximumFractionDigits: 2 });
      return (n < 0 ? '−' : '') + s + v;
    },
    price: (n) => (SYM[c.cur()] || '') + n.toLocaleString('en-US', { maximumFractionDigits: 4 }),
    pct: (n, d = 1) => (n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: d }) + '%',
    num: (n, d = 2) => n.toLocaleString('en-US', { maximumFractionDigits: d }),
    width: (el, p) => { if (el) el.style.width = Math.max(0, Math.min(100, p)) + '%'; },
    /** Replace the rows of a .bars container: items = [{label, p (0-100), text}] */
    bars(box, items) {
      if (!box) return; box.textContent = '';
      items.forEach((it) => {
        const row = h('div', 'bar-row'); const bar = h('span', 'bar'); const i = h('i'); bar.append(i);
        row.append(h('span', 'bar-row__l', it.label), bar, h('span', 'bar-row__v', it.text)); box.append(row); c.width(i, it.p);
      });
    },
    on(fn) { root.addEventListener('input', fn); root.addEventListener('change', fn); fn(); },
  };
  (TOOLS[root.dataset.tool] || (() => {}))(c);
}

const TOOLS = {
  /* ---------------------------------------------------------- dilution */
  dilution(c) {
    const rows = $$('[data-round]', c.root); const tbody = $('[data-table]', c.root); const bars = $('[data-bars]', c.root);
    c.on(() => {
      let founders = 1, pool = 0; const inv = []; const snaps = [];
      rows.forEach((r) => {
        if (!$('[data-r="on"]', r).checked) return;
        const raise = parseFloat($('[data-r="raise"]', r).value) || 0, pre = parseFloat($('[data-r="pre"]', r).value) || 0;
        const poolT = Math.max(0, parseFloat($('[data-r="pool"]', r).value) || 0) / 100;
        if (raise <= 0 || pre <= 0) return;
        const post = pre + raise, share = raise / post; const add = Math.min(poolT, Math.max(0, 1 - share - 0.01)); const f = 1 - share - add;
        founders *= f; pool *= f; inv.forEach((i) => { i.p *= f; }); pool += add; inv.push({ n: r.dataset.round, p: share });
        snaps.push({ n: r.dataset.round, post, share, founders, value: founders * post });
      });
      tbody.textContent = '';
      snaps.forEach((s) => { const tr = h('tr'); [s.n, c.money(s.post), c.pct(s.share * 100), c.pct(s.founders * 100), c.money(s.value)].forEach((t, i) => tr.append(h(i === 0 ? 'th' : 'td', '', t))); if (tbody.lastChild !== tr) tbody.append(tr); });
      if (!snaps.length) { const tr = h('tr'); const td = h('td', '', 'Turn on at least one round and enter an amount and a pre-money valuation.'); td.colSpan = 5; tr.append(td); tbody.append(tr); }
      c.out('founders', snaps.length ? c.pct(founders * 100) : '—'); c.out('rounds', String(snaps.length));
      c.out('given', snaps.length ? c.pct((1 - founders) * 100) : '—');
      const items = [{ label: 'Founders & team', p: founders * 100, text: c.pct(founders * 100) }];
      if (pool > 0) items.push({ label: 'Option pool', p: pool * 100, text: c.pct(pool * 100) });
      inv.forEach((i) => items.push({ label: i.n + ' investors', p: i.p * 100, text: c.pct(i.p * 100) }));
      c.bars(bars, snaps.length ? items : []);
    });
  },

  /* --------------------------------------------------- convertible note */
  convertible(c) {
    const note = c.k('type');
    c.on(() => {
      const isNote = note.value === 'note'; c.k('rate').disabled = !isNote; c.k('months').disabled = !isNote;
      const principal = c.val('principal'), rate = isNote ? c.val('rate') / 100 : 0, months = isNote ? c.val('months') : 0;
      const cap = c.val('cap'), disc = Math.min(99, Math.max(0, c.val('disc'))) / 100, pre = c.val('pre'), money = c.val('new'), shares = c.val('shares');
      if (principal <= 0 || pre <= 0 || shares <= 0) { ['price', 'applied', 'amount', 'noteShares', 'own', 'value', 'multiple', 'eff'].forEach((n) => c.out(n, '—')); return; }
      const round = pre / shares, capP = cap > 0 ? cap / shares : Infinity, discP = round * (1 - disc);
      const conv = Math.min(round, capP, discP);
      const applied = conv === round ? 'Round price (no discount or cap helps)' : capP <= discP ? 'Valuation cap' : 'Discount';
      const amount = principal * (1 + rate * months / 12), nShares = amount / conv, newShares = round > 0 ? money / round : 0;
      const total = shares + nShares + newShares;
      c.out('price', c.price(conv)); c.out('round', c.price(round)); c.out('applied', applied);
      c.out('amount', c.money(amount)); c.out('noteShares', c.num(nShares, 0)); c.out('own', c.pct(nShares / total * 100, 2));
      c.out('value', c.money(nShares * round)); c.out('multiple', c.num(nShares * round / amount, 2) + '×'); c.out('eff', c.money(conv * shares));
    });
  },

  /* ------------------------------------------------ readiness checklist */
  readiness(c) {
    const items = $$('[data-item]', c.root); const todo = $('[data-todo]', c.root); const groups = [...new Set(items.map((i) => i.dataset.group))];
    const bars = $('[data-bars]', c.root);
    c.on(() => {
      const done = items.filter((i) => i.checked).length, total = items.length, p = done / total * 100;
      c.out('score', Math.round(p) + '%'); c.out('count', `${done} of ${total} in place`);
      const band = p < 40 ? ['Early', 'There is real work to do before investor meetings. Spend a few weeks on the gaps below, then come back.'] : p < 75 ? ['Getting there', 'You have a solid base. Close the gaps below before you send your deck to investors.'] : ['Ready to talk', done === total ? 'You are in good shape to start conversations with investors.' : 'You are in good shape to start conversations. Keep working through the remaining items while you do.'];
      c.out('band', band[0]); c.out('verdict', band[1]);
      c.bars(bars, groups.map((g) => { const gi = items.filter((i) => i.dataset.group === g); const gd = gi.filter((i) => i.checked).length; return { label: g, p: gd / gi.length * 100, text: `${gd}/${gi.length}` }; }));
      todo.textContent = '';
      const open = items.filter((i) => !i.checked);
      if (!open.length) todo.append(h('li', '', 'Everything is in place. Nice work.'));
      open.forEach((i) => { const li = h('li'); li.append(h('strong', '', i.dataset.label), h('span', '', i.dataset.tip)); todo.append(li); });
    });
  },

  /* ------------------------------------------------------------ runway */
  runway(c) {
    const bars = $('[data-bars]', c.root);
    c.on(() => {
      const cash = c.val('cash'), exp = c.val('expenses'), rev = c.val('revenue'), g = c.val('growth') / 100, raise = c.val('raise');
      if (cash <= 0 || exp <= 0) { ['burn', 'runway', 'zero', 'start'].forEach((n) => c.out(n, '—')); c.out('note', 'Enter your cash balance and monthly expenses.'); if (bars) bars.textContent = ''; return; }
      let bal = cash, months = 0, runway = Infinity; const path = [cash];
      for (let m = 1; m <= 60; m++) {
        const net = exp - rev * Math.pow(1 + g, m - 1);
        if (net <= 0) { bal -= net; path.push(bal); months = m; continue; }
        if (bal - net <= 0) { runway = m - 1 + bal / net; path.push(0); break; }
        bal -= net; path.push(bal); months = m;
      }
      const burn = exp - rev; c.out('burn', burn > 0 ? c.money(burn) + ' / month' : 'Cash-flow positive');
      if (!Number.isFinite(runway)) { c.out('runway', '60+ months'); c.out('zero', 'Not within 5 years'); c.out('start', 'No urgency from cash alone'); c.out('note', 'At these numbers your cash lasts beyond five years. Revisit the figures if growth or hiring plans change.'); }
      else {
        const d = new Date(); d.setMonth(d.getMonth() + Math.floor(runway));
        c.out('runway', c.num(runway, 1) + ' months'); c.out('zero', d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
        const lead = runway - raise; c.out('start', lead <= 0 ? 'Start now' : 'In about ' + Math.floor(lead) + ' months');
        c.out('note', lead <= 0 ? `A raise usually takes about ${raise} months, which is as long as your runway. Start conversations now and look at cutting burn.` : `Plan to start raising when runway falls to about ${raise} months, so the round closes before cash gets tight.`);
      }
      const pts = 12, steps = Math.max(1, Math.floor((path.length - 1) / pts)); const max = Math.max(...path, 1);
      const items = []; for (let i = 0; i < path.length && items.length <= pts; i += steps) items.push({ label: i === 0 ? 'Today' : 'Month ' + i, p: path[i] / max * 100, text: c.money(path[i]) });
      c.bars(bars, items);
    });
  },

  /* ------------------------------------------------------ fund returns */
  returns(c) {
    c.on(() => {
      const paid = c.val('paid'), dist = c.val('dist'), nav = c.val('nav'), years = c.val('years');
      if (paid <= 0) { ['tvpi', 'dpi', 'rvpi', 'irr'].forEach((n) => c.out(n, '—')); return; }
      const tvpi = (dist + nav) / paid; c.out('tvpi', c.num(tvpi, 2) + '×'); c.out('dpi', c.num(dist / paid, 2) + '×'); c.out('rvpi', c.num(nav / paid, 2) + '×');
      c.out('gain', c.money(dist + nav - paid));
      c.out('irr', years > 0 && tvpi > 0 ? c.pct((Math.pow(tvpi, 1 / years) - 1) * 100) : '—');
      const ty = c.val('tyears'), tr = c.val('target') / 100; c.out('need', ty > 0 ? c.num(Math.pow(1 + tr, ty), 2) + '×' : '—');
    });
  },

  /* ------------------------------------------------------ equity split */
  split(c) {
    const rows = $$('[data-founder]', c.root); const bars = $('[data-bars]', c.root); const crit = ['commit', 'expert', 'role', 'idea', 'capital'];
    c.on(() => {
      const w = crit.map((n) => Math.max(0, c.val('w-' + n))); const wsum = w.reduce((a, b) => a + b, 0) || 1;
      const sc = rows.map((r) => { const name = $('[data-f="name"]', r).value.trim(); const s = crit.map((n, i) => (parseFloat($(`[data-f="${n}"]`, r).value) || 0) * w[i]).reduce((a, b) => a + b, 0) / wsum; return { name, s }; }).filter((r) => r.name && r.s > 0);
      const total = sc.reduce((a, b) => a + b.s, 0);
      if (!total) { c.bars(bars, []); c.out('lead', '—'); return; }
      const items = sc.map((r) => ({ label: r.name, p: r.s / total * 100, text: c.pct(r.s / total * 100) }));
      c.bars(bars, items); const top = items.reduce((a, b) => (b.p > a.p ? b : a)); c.out('lead', top.label + ' · ' + top.text);
      c.out('spread', c.num(Math.max(...items.map((i) => i.p)) - Math.min(...items.map((i) => i.p)), 1) + ' points');
    });
  },

  /* ------------------------------------------------------- pitch outline */
  pitch(c) {
    const btn = $('[data-copy-outline]', c.root); if (!btn) return;
    btn.addEventListener('click', async () => {
      const text = $$('[data-slide]', c.root).map((s, i) => `${i + 1}. ${s.dataset.slide}: ${s.dataset.purpose}`).join('\n');
      try { await navigator.clipboard.writeText(text); const t = btn.firstChild.textContent; btn.firstChild.textContent = 'Copied '; setTimeout(() => { btn.firstChild.textContent = t; }, 1800); } catch (e) { /* ignore */ }
    });
  },
};

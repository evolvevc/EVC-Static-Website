/* Return on Time Invested (ROTI) calculator.
   ROTI = gain ÷ time cost, where time cost = total hours spent × the value you put on an hour. */
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function init() {
  const box = $('#roti'); if (!box) return;
  const el = {
    cur: $('#roti-cur'), capital: $('#roti-capital'), gain: $('#roti-gain'),
    hours: $('#roti-hours'), hoursR: $('#roti-hours-r'), months: $('#roti-months'), monthsR: $('#roti-months-r'), rate: $('#roti-rate'), rateR: $('#roti-rate-r'),
    roti: $('#out-roti'), verdict: $('#out-verdict'), totalHours: $('#out-hours'), timeCost: $('#out-cost'), net: $('#out-net'), roi: $('#out-roi'), adj: $('#out-adj'), perHour: $('#out-perhour'),
    needle: $('#gauge-needle'), arc: $('#gauge-arc'),
  };
  box.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  const num = (i) => Math.max(0, parseFloat(i.value) || 0);
  const sym = { USD: 'US$', SGD: 'S$', INR: '₹' };
  const fmt = (n) => { const s = sym[el.cur.value] || ''; const a = Math.abs(n); const v = a >= 1e7 && el.cur.value === 'INR' ? (a / 1e7).toFixed(2) + ' Cr' : a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? Math.round(a).toLocaleString('en-US') : a.toLocaleString('en-US', { maximumFractionDigits: 2 }); return (n < 0 ? '−' : '') + s + v; };
  const pct = (n) => (n >= 0 ? '' : '−') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
  let shown = 0;

  const link = (a, b) => { a.addEventListener('input', () => { b.value = a.value; update(); }); b.addEventListener('input', () => { a.value = b.value; update(); }); };
  link(el.hours, el.hoursR); link(el.months, el.monthsR); link(el.rate, el.rateR);
  [el.cur, el.capital, el.gain].forEach((i) => i.addEventListener('input', update));

  function verdictFor(r, cost) {
    if (cost === 0) return ['Enter your time', 'Add the hours you spend to see what your attention is returning.'];
    if (r < 0) return ['Negative', 'The investment lost money and consumed your time. Revisit the thesis before committing more hours.'];
    if (r < 1) return ['Time-negative', 'The financial gain is smaller than the value of the time spent. Consider a more passive structure or fewer touchpoints.'];
    if (r < 3) return ['Fair', 'Your time is covered, with a modest premium. Look for ways to reduce hours without reducing returns.'];
    if (r < 6) return ['Strong', 'Each unit of time you invest returns several times its value. This is a well-leveraged use of your attention.'];
    return ['Exceptional', 'Returns far outweigh the time you put in. Protect this arrangement and look for similar opportunities.'];
  }
  function gauge(r) {
    const clamped = Math.max(0, Math.min(8, r)); const a = -90 + (clamped / 8) * 180;
    el.needle.style.transform = `rotate(${a}deg)`;
    el.arc.style.strokeDashoffset = String(251 - (clamped / 8) * 251);
  }
  function animate(to) {
    if (reduce) { el.roti.textContent = to.toFixed(2) + '×'; shown = to; return; }
    const from = shown, t0 = performance.now(); const dur = 500;
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); shown = from + (to - from) * e; el.roti.textContent = shown.toFixed(2) + '×'; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function update() {
    const capital = num(el.capital), gain = parseFloat(el.gain.value) || 0;
    const hours = num(el.hours) * num(el.months), cost = hours * num(el.rate), net = gain - cost;
    const r = cost > 0 ? gain / cost : 0;
    el.totalHours.textContent = hours.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' h';
    el.timeCost.textContent = fmt(cost); el.net.textContent = fmt(net);
    el.roi.textContent = capital ? pct((gain / capital) * 100) : '—'; el.adj.textContent = capital ? pct((net / capital) * 100) : '—';
    el.perHour.textContent = hours ? fmt(gain / hours) : '—';
    const [v, d] = verdictFor(r, cost); el.verdict.textContent = v; $('#out-verdict-text').textContent = d;
    animate(r); gauge(r);
    el.net.classList.toggle('is-neg', net < 0);
  }
  update();
}

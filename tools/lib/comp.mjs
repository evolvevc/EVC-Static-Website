// Text-composition building blocks (HTML strings) shared by page templates.
import { icon, esc, slugify } from './site.mjs';

export const head = ({ eyebrow, h2, lead, extra = '' }) => `${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="h2" data-split>${h2}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}`;

/**
 * Numbered editorial section: a hairline bar with an automatic number and label, then a head column and a body column.
 * layout: 'split' (head left, body right, default) | 'even' | 'wide' | 'stack' (head above body)
 */
export function sec({ id, label, chapter, h2, lead, headExtra = '', body = '', cls = '', layout = 'split', sticky = true }) {
  const headHtml = `${h2 ? `<h2 class="h2" data-split>${h2}</h2>` : ''}${lead ? `<p class="lead">${lead}</p>` : ''}${headExtra}`;
  const grid = layout === 'stack'
    ? `<div class="sec__stack">${headHtml ? `<div class="sec__head">${headHtml}</div>` : ''}${body}</div>`
    : `<div class="sec__grid${layout === 'even' ? ' sec__grid--even' : layout === 'wide' ? ' sec__grid--wide' : ''}"><div class="sec__head${sticky ? ' sec__head--sticky' : ''}">${headHtml}</div><div class="sec__body">${body}</div></div>`;
  return `<section class="sec${cls ? ' ' + cls : ''}"${id ? ` id="${id}"` : ''} data-chapter="${esc(chapter || label)}"><div class="container"><div class="sec__bar reveal"><span class="sec__no"></span><span class="sec__label">${label}</span></div>${grid}</div></section>`;
}

export const rail = (headHtml, bodyHtml) => `<div class="rail"><div class="rail__head">${headHtml}</div><div class="rail__body">${bodyHtml}</div></div>`;
export const rows = (items) => `<ul class="idx" data-stagger>${items.map(([, t, d]) => `<li class="idx__row"><div><h3 class="h3">${t}</h3><p>${d}</p></div></li>`).join('')}</ul>`;
export const tiles = (items) => `<div class="cols" data-stagger>${items.map(([ic, t, d]) => `<article class="col">${icon(ic)}<h3 class="h3">${t}</h3><p>${d}</p></article>`).join('')}</div>`;
export const checks = (list, two = false) => `<ul class="checks${two ? ' checks--2' : ''}" data-stagger>${list.map((t) => `<li>${t}</li>`).join('')}</ul>`;
export const chipcloud = (list) => `<ul class="chipcloud" data-stagger>${list.map((t) => `<li>${t}</li>`).join('')}</ul>`;
/** Large quiet paragraph whose words fill in as it scrolls into view */
export const statement = (paras) => `<div class="statement" data-fill>${paras.map((p) => `<p>${p}</p>`).join('')}</div>`;
export const callout = (paras) => `<div class="callout reveal">${paras.map((p) => `<p>${p}</p>`).join('')}</div>`;
export const textcols = (lead, paras, three = false) => `<div class="textcols"><p class="lead">${lead}</p><div class="textcols__cols${three ? ' textcols__cols--3' : ''}">${paras.map((p) => `<p>${p}</p>`).join('')}</div></div>`;
export const stepsV = (items) => `<ol class="steps-v" data-stagger>${items.map(([t, d]) => `<li><h3 class="h3">${t}</h3><p>${d}</p></li>`).join('')}</ol>`;

/** Master / detail explorer: items = [icon, title, short, long, ctaHtml] */
export function explorer(id, label, items) {
  return `<div class="explorer" data-tabs><div class="explorer__list" role="tablist" aria-label="${esc(label)}">${items.map(([, t, s], i) => `<button class="explorer__tab" type="button" role="tab" id="${id}-${i}" aria-controls="${id}-p-${i}" data-tab="${slugify(t)}"><span><strong>${t}</strong><span>${s}</span></span>${icon('arrow')}</button>`).join('')}</div>
<div class="explorer__panels">${items.map(([ic, t, s, long, cta], i) => `<div class="explorer__panel" role="tabpanel" id="${id}-p-${i}" aria-labelledby="${id}-${i}" hidden><span class="icon-badge">${icon(ic)}</span><h3 class="h3-display">${t}</h3><p class="short">${s}</p>${long ? `<p>${long}</p>` : ''}${cta || ''}</div>`).join('')}</div></div>`;
}

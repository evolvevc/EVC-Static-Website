# Evolve Venture Capital — website

A fast, secure, static website (66 pages) built with a zero-dependency toolchain: plain HTML, modern CSS, vanilla ES modules.
No WordPress, no PHP, no database, no plugins on the public site — which removes the most common attack surface.

## Quick start

```bash
npm install           # build tools only (cheerio, sharp, esbuild) — nothing ships to the browser
npm run build         # generates dist/  (66 pages + assets + sitemap, security headers, redirects)
npm run serve         # preview on http://localhost:4173 with production security headers (Windows: double-click start-preview.bat)
```

Upload the **contents of `dist/`** to the web root. `.htaccess` (Apache) and `_headers` / `_redirects` (Netlify, Cloudflare Pages) are generated into `dist/`.

## Structure

| Path | What |
|---|---|
| `src/css`, `src/js` | Design system and behaviour (tokens, components, page layouts, graphics, v3 shape language; main.js, forms.js, roti.js) |
| `src/assets` | Self-hosted fonts (Lexend, Atkinson Hyperlegible Next), optimised article images, whitepaper PDF |
| `tools/pages/*.mjs` | One template per page type (home, core pages, resources, contact/legal) |
| `tools/lib/*.mjs` | Layout, SEO/schema, logo (vector), icons, animated graphics (gfx.mjs), content layer |
| `content/` | Scraped content from the previous site (posts.json = 47 articles), image map |
| `tools/build.mjs` | Static site generator |
| `server/submit.php` | Optional hardened form receiver for Apache/PHP hosting (no Node) |
| `portal/` | Lead inbox, basic CRM and newsletter export — Node + React, see `portal/README.md` |
| `docs/` | SECURITY, CHANGES (what was fixed/edited), LAUNCH-CHECKLIST |

## Configuration

Copy `site.config.example.json` to `site.config.json` and set:

- `formEndpoint` — where forms are delivered (see docs/SECURITY.md). Until set, forms open the visitor's email app addressed to contact@evolvevcap.com.
- `publicKeyJwkBase64` — from `npm run keygen`; enables end-to-end encrypted form submissions.
- `ga4` — Google Analytics 4 ID (loads only after the visitor accepts cookies).

Rebuild after any change: `npm run build`.

## Features

Animated SVG graphics (orbit of covered countries, growth, pipeline, flow, venn, stack, shield, rocket, radar, network, stairs, compass, target), animated preloader, word-by-word headline reveals, scroll-scrubbed text, magnetic buttons, custom cursor,
page transitions (View Transitions API), live ROTI calculator and eight more free tools under /tools/ (src/js/tools.js, tools/pages/tools.mjs), filterable insights hub with carousel, FAQ search, gated whitepaper downloads,
encrypted forms, reading progress bar and table of contents on every article. All motion respects `prefers-reduced-motion`.

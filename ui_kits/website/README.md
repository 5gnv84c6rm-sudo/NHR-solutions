# UI kit — Marketing website

Full recreation of the NHR Solution homepage, built from the brand brief's section list.
Open `index.html`.

## Files
| File | Contents |
| --- | --- |
| `data.js` | All copy and content arrays (`window.NHR_SITE`) — nav, stats, solutions, benefits, security, steps, plans, testimonials, FAQs, footer |
| `Chrome.jsx` | `Wordmark` (real logo artwork), `DotField`, `Glow`, `Section`, `Navbar` (sticky, blurs on scroll, mobile sheet), `Footer` |
| `Hero.jsx` | Hero with dot field, ambient glows, floating SaaS stat cards and the live product window |
| `Sections.jsx` | TrustSection · Solutions · DashboardShowcase · WhyNHR · SecuritySection · HowItWorks · MobileApp |
| `Conversion.jsx` | Pricing (monthly/annual switch) · Testimonials · FAQ accordion · Contact form · Final CTA |

## Interactions
- Sticky navbar: transparent over the hero, glass-black once scrolled past 24px. Hamburger sheet under 900px.
- The hero and showcase embed the **real platform window** from `../app/` — the sidebar is clickable in both.
- Pricing switch recalculates plan prices; FAQ is a single-open accordion; contact form validates natively.

## Notes
- Copy is verbatim from the brief. Pricing, testimonials and figures are placeholders held in `data.js`.
- Logo artwork comes from `assets/logo-*.png`, extracted from the supplied brand image. Never recoloured or redrawn.

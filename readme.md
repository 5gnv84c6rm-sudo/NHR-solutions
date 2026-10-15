# NHR Solution — Design System

**Smart Tools for Smarter Businesses**

NHR Solution is a business-software company. Its platform bundles everyday operational tools — HR and workforce management, employee records, attendance, payroll and finance, tasks, documents, analytics and reporting — into a single workspace, sold to small and mid-sized businesses on a simple monthly plan (Starter / Professional / Business). The proposition is breadth without complexity: one place to run the operational side of a company.

Two surfaces are represented in this system:

1. **Marketing website** — conversion-focused single-page site. Primary goal: *Get Started*. Secondary: *Contact / Book a demo*.
2. **NHR platform (web app)** — the dark-interface SaaS product: Overview, Employees, Attendance, Payroll, Tasks, Documents, Reports, Analytics, Settings. A companion mobile app view is included in the marketing kit.

## Sources given

- A written brand + website brief for **NHR Solution** (tagline, colour system, typography, section-by-section site structure, button/card/icon/animation rules, tech-stack preference: React + TypeScript + Tailwind + Lucide React).
- Reference for *layout quality and UX only*, explicitly not for copy, code or assets: `https://nhrsolutions.net/`.
- The official **NHR Solution logo artwork**, supplied as a brand image (`assets/brand-poster.jpg`): white shield enclosing connected human figures, the "NHR Solution" wordmark, the tagline, and a turquoise halftone dot field running corner to corner. All logo and pattern assets in `assets/` were extracted from that single file — nothing was drawn or reconstructed.

## Index

| Path | What it is |
| --- | --- |
| `styles.css` | Global entry point. `@import` list only — link this one file. |
| `tokens/` | `fonts` · `colors` · `typography` · `spacing` · `radius` · `effects` · `motion` · `base` |
| `guidelines/` | Foundation specimen cards (colour, type, spacing, effects, pattern) |
| `components/core/` | `Button` `IconButton` `Badge` `Card` `SectionHeading` `IconWrapper` `Stat` |
| `components/forms/` | `Input` (`multiline` = textarea) `Select` `Checkbox` `Switch` |
| `components/marketing/` | `SolutionCard` `PricingCard` `TestimonialCard` `FaqItem` `StepCard` `BenefitCard` |
| `components/app/` | `DashboardCard` `StatTile` `BarChart` `ActivityItem` `ProgressMeter` `DataTable` |
| `ui_kits/website/` | Marketing site — `index.html` (homepage), `pricing.html` (employee-count calculator + compare table), `hr-software.html` (product page) |
| `ui_kits/app/` | NHR platform — Overview, Payroll, and the full **Employees module** (directory, add wizard, profile, import, permissions) |
| `assets/` | Logo artwork (light/dark, mark, lockups), brand dot-pattern tiles, brand poster, icon notes |
| `SKILL.md` | Agent Skills front-matter so this folder works as a Claude Code skill |

## Logo

The mark is a **shield enclosing connected human figures** — people, protected, joined by a network. It is the source of truth for the whole visual language: black and white structure, turquoise dot field, security through connection.

| Asset | Use |
| --- | --- |
| `assets/logo-light.png` | Primary lockup (shield + wordmark), white — dark backgrounds |
| `assets/logo-dark.png` | Primary lockup, near-black `#101515` — light backgrounds |
| `assets/logo-mark-light.png` / `-dark.png` | Shield mark alone — app sidebar, favicon, CTA seal, small spaces |
| `assets/logo-full-light.png` / `-dark.png` | Lockup with the "Smart Tools for Smarter Businesses" tagline — covers, one-pagers |
| `assets/wordmark-light.png` / `-dark.png` | Wordmark only, when the mark already appears nearby |
| `assets/pattern-dots-tl.png` / `-br.png` | The logo's own halftone dot field, as decorative corner tiles |
| `assets/brand-poster.jpg` | The supplied original artwork, unmodified |

**Rules.** Never redesign, distort, stretch, rotate, recolour, outline or CSS-recreate the mark. Use the white artwork on black or dark turquoise-glow fields; the near-black artwork on white and `#F7FAFA`. Clear space on all sides is at least half the shield's height. Minimum sizes: 28px shield height for the mark alone, 120px width for the primary lockup.

*Extraction note:* the PNGs were keyed out of the supplied JPEG programmatically (luminance → alpha), so they carry very slight edge softness at large sizes. For print or oversized web use, ask the brand owner for the original vector (SVG/AI/EPS) and drop it into `assets/` under the same filenames.

---

## CONTENT FUNDAMENTALS

**Voice.** Plain, declarative business English. The brand sells *relief from complexity*, so the copy is itself uncomplicated: short sentences, concrete nouns (employees, attendance, payroll, documents), no jargon, no hype adjectives stacked on each other. Confident but never boastful.

**Person.** Talk about the reader as **your business** / **you**; talk about the company in the third person as **NHR Solution** (never "we" in body copy, and never "I"). Example: "NHR Solution helps businesses simplify everyday operations…" — not "We help you…".

**Casing.**
- Headings: Title Case for marketing headlines — "Solutions Designed Around Your Business", "Built With Security At The Core", "Everything Your Business Needs. In One Place."
- Eyebrows / labels: ALL CAPS, tracked `.16em` — `SMART TOOLS FOR SMARTER BUSINESSES`, `NHR SOLUTION`, `MOST POPULAR`.
- Benefit words are single ALL-CAPS terms: SMART · SIMPLE · SECURE · SCALABLE · CONNECTED.
- Body and UI labels: sentence case. In-app nav is sentence-case single words (Overview, Employees, Payroll).

**Sentence shapes.** Marketing headlines often use a two-beat full stop rhythm — "Simple To Start. Powerful To Use.", "Smart Technology. Better Business." Supporting paragraphs are one or two sentences, 15–30 words, ending on a business outcome: productivity, efficiency, growth, better decisions.

**Numbers.** Written short and bold, always turquoise, always with a plain caption underneath: `10K+ / Businesses Supported`, `99.9% / Platform Reliability`, `24/7 / Digital Accessibility`. In-app deltas carry a sign and a period label: `+24.8% vs last month`.

**CTAs.** Verb-first, two or three words, Title Case: **Get Started** (always the primary), **Explore Solutions**, **Contact Us**, **Book A Demo**, **Learn More →** on cards. The arrow on "Learn More →" is a real chevron/arrow icon, not a typed character, and it nudges right on hover.

**Claims discipline.** Security copy stays principled, never technical: "designed with security, privacy and reliability in mind", "Role-Based Access", "Privacy Focused". No certifications, uptime guarantees, encryption specifics or compliance badges unless the business supplies evidence. Pricing (£29 / £79 / Custom) is placeholder content and lives in data arrays so it can be edited in one place.

**Emoji.** Never. Not in marketing copy, not in the product, not in decorative positions. Icons come from Lucide.

---

## VISUAL FOUNDATIONS

**The whole identity is three values: black, white, turquoise.** Black is the technology and the premium register; white is trust and clarity; turquoise (`#00E5D4`) is intelligence and energy. Turquoise is an *accent* — it appears on CTAs, icons, numbers, links, hover states, chart series and thin decorative lines, and never as a large flat field except in a button. There is no secondary hue: no blue, no purple, no gradient palette. Semantic status colours (`--nhr-success` etc.) exist for the app only and are used at small sizes.

**Section rhythm.** The site alternates two backgrounds and nothing else: pure white/`#F7FAFA` light sections and black/`#0D1111` dark sections. Dark sections carry the emotional weight — hero, dashboard showcase, security, final CTA, footer. Light sections carry the explanatory content — trust stats, solutions, benefits, how it works, pricing, testimonials, FAQ. Never more than two background values on one page.

**Typography.** Manrope for everything, four weights in practice: 400 body, 600 UI labels and buttons, 700 headings, 800 hero and stat numbers. Hero 72px desktop / 42px mobile at `-.03em` tracking and 1.06 line height — tight and structural. Section headings 52/40/32px at `-.02em`. Card titles 22px/600–700. Body 17px at 1.6, lead paragraphs 20px at 1.6, capped near 60 characters. Eyebrows 12px/700 uppercase at `.16em`. Numerals in stats and dashboards are 800 weight and turquoise. Monospace (JetBrains Mono) appears only for token values and code-like data cells.

**Layout.** 1280px max content width, 48px desktop gutters / 32px tablet / 20px mobile. Section vertical rhythm 120px desktop, 80px tablet, 56px mobile. Grids: 3-across for solutions and pricing, 2-across at tablet, 1-up on mobile with full-width buttons. The sticky navbar is the only fixed element: transparent over the hero, then black at 72% opacity with an 18px backdrop blur, a 1px white-10% bottom border and a soft shadow once scrolled past ~24px.

**Backgrounds and pattern.** No photography. The one texture is the **brand dot pattern**, taken from the logo artwork itself (`assets/pattern-dots-tl.png` / `-br.png`, screen-blended on black): a diagonal halftone of small turquoise squares whose density fades from a dense corner to nothing. `--pattern-dots` in `tokens/effects.css` is the CSS fallback (2px dots on a 22px grid, radially masked) for cases where an image can't be used. It appears in exactly four places: hero, dark feature/dashboard sections, final CTA, footer. Behind it sits an ambient turquoise glow (a large, very low-opacity radial), typically one per dark section, off-centre. Dark sections may also carry a hairline turquoise grid at 7% opacity. Never pattern a light section.

**Cards.** Radius 18px (24px for large feature panels, 12px buttons, 999px pills). Padding 28–32px.
- *Light card*: white surface, 1px `#E2EAEA` border, `--shadow-card` (a 1px hairline plus a wide, soft, cool 24px-blur shadow at 4–10% — barely visible, just enough to lift).
- *Dark card*: `#111616` surface, 1px white-10% border, a 1px inset white-6% top highlight, no drop shadow.
- *Hover* (both): `translateY(-4px)`, border becomes turquoise at 35–100%, and a soft turquoise glow appears (`--shadow-glow-card`). 220ms.

**Motion.** Fast, small, and always in the same direction: things rise and fade in. Durations 150ms (micro), 220ms (hover/state), 320ms (accordion, menu), 600ms (scroll reveal). Easing is `cubic-bezier(.22,.61,.36,1)` for exits/entrances and `cubic-bezier(.16,.84,.44,1)` for emphasis. Scroll reveals are `opacity 0→1` plus `translateY(16px→0)`, staggered 60–80ms across a grid. Stats count up once on entry. FAQ accordions animate `grid-template-rows` with the chevron rotating 180°. No bounces, no springs, no parallax, no looping ambient animation beyond the slow drift of the hero glow. Everything is wrapped by `prefers-reduced-motion: reduce`.

**States.**
- *Primary button*: turquoise `#00E5D4` on black text, 600–700 weight, radius 12px, soft turquoise glow. Hover: brighter turquoise `#3DF0E2`, lifts 2px, glow strengthens. Active: returns to baseline and scales `.985`. Disabled: turquoise at 35% opacity, no glow, `not-allowed`.
- *Secondary button*: transparent with a 1px border (white-40% on dark, `#E2EAEA` on light) and matching text. Hover: border to turquoise, text to turquoise, background lifts to white-6% / turquoise-6%.
- *Ghost / text link*: turquoise text; hover shifts to near-black on light and bright turquoise on dark; "Learn More →" translates its arrow 3px right.
- *Focus*: 2px solid turquoise ring, 2px offset — visible on every interactive element, never removed.
- *Inputs*: 1px `#E2EAEA`, radius 12px; focus adds a turquoise border plus a 3px turquoise-20% ring; error uses `--nhr-danger` for border and helper text.

**Transparency and blur.** Used sparingly and only for chrome: the sticky navbar, the mobile menu sheet, dropdowns/notification popovers in the app, and floating hero UI cards (dark surface at ~72% with an 18px blur so the glow reads through). Content areas are always opaque.

**Imagery.** None supplied and none faked. Where a product screenshot would go, the system renders **real interface** — a working dark dashboard built from `components/app/` — rather than a placeholder box or stock photo. The visual temperature is cool throughout: greys carry a slight green-cyan cast (`#0D1111`, `#F7FAFA`, `#8A9998`), never warm grey. No grain, no photographic overlay.

**Protection.** Because content sits on dark fields with glows behind it, dark sections use a top-to-bottom black gradient scrim over the pattern layer rather than capsules or scrims around individual text blocks; text is never placed on the densest part of the dot field.

---

## ICONOGRAPHY

- **Set: Lucide** (`lucide-react` in production; the UMD build from CDN in this system's cards and kits). 24px default, 1.75px stroke, `round` caps and joins, `currentColor`. Nothing else is mixed in.
- No icon font, no sprite sheet, no PNG icons, no custom-drawn SVGs. The source brief specified Lucide React and supplied no icon assets, so nothing was substituted or hand-drawn — **flagged**: if the real brand uses a different set, swap the CDN reference in the kit HTML files and this section.
- **Icon container** (`IconWrapper`): 48px rounded square, radius 14px. On light: `#D9FFFB` fill with a turquoise-deep glyph. On dark: white-6% fill, 1px white-10% border, turquoise glyph. On card hover the container border turns turquoise and picks up the glow.
- Sizes in use: 16px inline with text and in table cells, 20px in buttons and nav, 24px standard, 28px in feature containers.
- Common glyphs by concept — `users` (HR/workforce), `layout-dashboard` (business management), `wallet` / `banknote` (payroll & finance), `bar-chart-3` (analytics), `id-card` / `user-check` (employee management), `wand-sparkles` / `boxes` (digital tools), `shield-check` (security), `lock` (privacy), `key-round` (role-based access), `server` (infrastructure), `zap` (smart), `sparkles` (simple), `expand` / `trending-up` (scalable), `share-2` (connected), `arrow-right` (Learn More), `check` (feature lists), `star` (ratings), `bell`, `search`, `settings`, `menu`, `x`.
- **Never emoji.** Never unicode dingbats standing in for icons — arrows and chevrons in copy are rendered as Lucide glyphs.
- The shield mark itself (`assets/logo-mark-light.png`) doubles as the security motif: used large and glowing in the security section and small above the final CTA. It is never mixed into an icon row alongside Lucide glyphs.

---

## Intentional additions

The brief named its own component inventory (Navbar, Hero, TrustSection, Solutions, SolutionCard, DashboardShowcase, WhyNHR, SecuritySection, HowItWorks, MobileApp, Pricing, PricingCard, Testimonials, TestimonialCard, FAQ, FinalCTA, Footer + Button, Card, Badge, SectionHeading, DashboardCard, IconWrapper). Everything in `components/` maps to that list, with these additions, each needed to build the specified sections without inventing markup inside kits:

- `IconButton` — hamburger, close, and app-header icon controls the brief describes but doesn't name.
- `Stat` — the `10K+ / Businesses Supported` unit used in the trust section and app tiles.
- `forms/*` (`Input`, `Textarea`, `Select`, `Checkbox`, `Switch`) — required by the brief's "accessible forms" mandate and the Contact / Get Started flows.
- `FaqItem`, `StepCard`, `BenefitCard` — the repeating units inside FAQ, How It Works and Why NHR Solution.
- `app/*` (`StatTile`, `BarChart`, `ActivityItem`, `ProgressMeter`, `DataTable`) — the dashboard showcase must look like a genuine product, and the brief forbids placeholder boxes.

## Substitutions to confirm

1. **Logo — raster only.** Assets were keyed out of the supplied JPEG; a vector original is still wanted.
2. **Fonts.** Manrope is loaded from Google Fonts (no licensed binaries supplied). The supplied logo's wordmark is set in a geometric sans very close to Manrope/Poppins — Manrope is the working match; confirm the real logo typeface if type must align exactly. Self-host by adding woff2 files to `assets/fonts/` and rewriting `tokens/fonts.css`.
3. **Icons.** Lucide from CDN, per the brief's stated stack.
4. **Copy and data.** Marketing copy is taken verbatim from the brief. Testimonials, employee names, chart values and pricing are fictional placeholders.

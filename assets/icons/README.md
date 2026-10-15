# Icons — Lucide

The brand uses **Lucide** exclusively (`lucide-react` in production). No icon binaries
were supplied with the brief, so this system loads the official Lucide UMD build from CDN:

```html
<script src="https://unpkg.com/lucide@0.544.0/dist/umd/lucide.js"></script>
<script type="text/babel" src="../../assets/icons/icon-helper.jsx"></script>
```

`icon-helper.jsx` exposes `window.Icon` — a React wrapper matching brand defaults
(24px, 1.75 stroke, round caps, `currentColor`):

```jsx
<Icon name="ShieldCheck" size={28} />
```

Names are Lucide's PascalCase export names. Never substitute emoji or unicode glyphs.

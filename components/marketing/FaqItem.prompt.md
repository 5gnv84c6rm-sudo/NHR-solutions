One-line: FAQ accordion row — the parent owns which index is open.

```jsx
{faqs.map((f, i) => (
  <FaqItem key={f.q} id={'faq-' + i} question={f.q} answer={f.a}
    open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
))}
```

Single-open behaviour. Keep the list inside an 880px measure.

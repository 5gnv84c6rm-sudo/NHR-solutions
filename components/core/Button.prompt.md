One-line: the brand's action element — turquoise primary for every conversion point, bordered secondary beside it, ghost for in-card "Learn More →".

```jsx
<Button size="lg" iconRight={<ArrowRight size={20} />}>Get Started</Button>
<Button variant="secondary" tone="dark" size="lg">Explore Solutions</Button>
<Button variant="ghost" iconRight={<ArrowRight size={16} />}>Learn More</Button>
```

- Exactly one primary button per view region; "Get Started" is always primary.
- Set `tone="dark"` inside dark sections so secondary/ghost text reads white/turquoise.
- `fullWidth` on mobile and inside pricing cards.

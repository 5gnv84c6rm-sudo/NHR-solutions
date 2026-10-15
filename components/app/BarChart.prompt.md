One-line: the app's only chart type for period comparisons — one turquoise series, no gridlines.

```jsx
<BarChart unit="%" data={[{label:'Mon',value:96},{label:'Tue',value:98},{label:'Sat',value:12,muted:true}]} />
```

Keep to a single series; use `muted` for non-working or projected periods.

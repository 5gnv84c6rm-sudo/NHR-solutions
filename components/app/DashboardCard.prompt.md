One-line: the product's panel wrapper — every chart, table and list in the app sits in one.

```jsx
<DashboardCard title="Attendance This Week" action={<Badge tone="dark">Live</Badge>}>
  <BarChart data={[…]} />
</DashboardCard>
```

Defaults to the dark product theme; `tone="light"` only if the app ships a light mode.

One-line: employee, payroll and report tables in the product.

```jsx
<DataTable
  columns={[{key:'name',label:'Employee'},{key:'id',label:'ID',mono:true},{key:'status',label:'Status'}]}
  rows={[{name:'Amara Osei',id:'EMP-0148',status:<Badge tone="success">Present</Badge>}]} />
```

Abbreviate to 5–8 rows in mocks. Right-align amounts and set `mono`.

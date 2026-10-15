/* Screens for the NHR Solution platform. Figures are illustrative placeholders. */
const { DashboardCard, StatTile, BarChart, ProgressMeter, ActivityItem, DataTable, Badge, Button, Card } = window.NHRSolutionDesignSystem_0db691;

const ATTENDANCE = [
  { label: 'Mon', value: 96 }, { label: 'Tue', value: 98 }, { label: 'Wed', value: 94 },
  { label: 'Thu', value: 97 }, { label: 'Fri', value: 91 }, { label: 'Sat', value: 18, muted: true }, { label: 'Sun', value: 6, muted: true }
];

const EMPLOYEES = [
  { name: 'Amara Osei', id: 'EMP-0148', dept: 'Operations', role: 'Director', status: 'Present', pay: '£4,280.00' },
  { name: 'Daniel Whitfield', id: 'EMP-0151', dept: 'Finance', role: 'Controller', status: 'Leave', pay: '£3,940.00' },
  { name: 'Priya Raman', id: 'EMP-0163', dept: 'People', role: 'Head of People', status: 'Present', pay: '£3,610.00' },
  { name: 'Marcus Bell', id: 'EMP-0172', dept: 'Operations', role: 'Coordinator', status: 'Present', pay: '£2,880.00' },
  { name: 'Leah Mensah', id: 'EMP-0181', dept: 'Support', role: 'Team Lead', status: 'Remote', pay: '£3,120.00' },
  { name: 'Tomas Nowak', id: 'EMP-0190', dept: 'Finance', role: 'Analyst', status: 'Present', pay: '£2,640.00' }
];

const statusTone = { Present: 'success', Leave: 'warning', Remote: 'dark', Overdue: 'danger' };

function OverviewScreen({ compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 12 : 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(' + (compact ? 150 : 190) + 'px,1fr))', gap: compact ? 12 : 16 }}>
        <StatTile label="Business Revenue" value="£182.4k" delta="+24.8%" caption="vs last month" icon={<Icon name="BarChart3" size={18} />} />
        <StatTile label="Active Employees" value="120" delta="+6" caption="this quarter" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Team Productivity" value="98.6%" delta="+3.2%" caption="this week" icon={<Icon name="TrendingUp" size={18} />} />
        <StatTile label="Tasks Completed" value="1,248" delta="+18%" caption="last 30 days" icon={<Icon name="ListChecks" size={18} />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1.4fr 1fr' : '1.5fr 1fr', gap: compact ? 12 : 16 }}>
        <DashboardCard title="Attendance This Week" padding={compact ? 16 : 20}
          action={<Badge tone="dark">96% average</Badge>}>
          <BarChart unit="%" height={compact ? 120 : 170} data={ATTENDANCE} />
        </DashboardCard>
        <DashboardCard title="Payroll — September" padding={compact ? 16 : 20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: compact ? 24 : 30, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>£412,880</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted-dark)' }}>gross</span>
            </div>
            <ProgressMeter label="Approvals" value={78} valueLabel="94 / 120" />
            <ProgressMeter label="Payslips issued" value={54} valueLabel="65 / 120" />
            <Button variant="secondary" tone="dark" size="sm" fullWidth>Review Payroll</Button>
          </div>
        </DashboardCard>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1.4fr 1fr 1fr', gap: compact ? 12 : 16 }}>
        <DashboardCard title="Recent Activity" padding={compact ? 16 : 20} action={<a href="employees.html" style={{ fontSize: 12.5, fontWeight: 700 }}>View all</a>}>
          <div>
            <ActivityItem icon={<Icon name="UserPlus" size={16} />} title="Leah Mensah added to Support" meta="Employees" time="12m" />
            <ActivityItem icon={<Icon name="FileCheck2" size={16} />} title="August payslips issued" meta="Payroll" time="2h" />
            <ActivityItem icon={<Icon name="CalendarCheck" size={16} />} title="Leave request approved — T. Nowak" meta="Attendance" time="5h" />
            <ActivityItem icon={<Icon name="ClipboardList" size={16} />} title="Q3 workforce report generated" meta="Reports" time="1d" divider={false} />
          </div>
        </DashboardCard>
        <window.EmployeesWidget
          onViewAll={() => window.dispatchEvent(new CustomEvent('nhr-goto-screen', { detail: 'Employees' }))}
          onAdd={() => window.dispatchEvent(new CustomEvent('nhr-add-employee'))} />
        <DashboardCard title="Open Tasks" padding={compact ? 16 : 20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Approve 26 timesheets', 'Today'], ['Upload contract — M. Bell', 'Tomorrow'], ['Close September payroll', '30 Sep']].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, color: 'var(--text-body-dark)' }}>{t}</span>
                <Badge tone={d === 'Today' ? 'turquoise' : 'dark'}>{d}</Badge>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

function EmployeesScreen({ compact }) {
  const [q, setQ] = React.useState('');
  const rows = EMPLOYEES.filter(e => e.name.toLowerCase().includes(q.toLowerCase())).map(e => ({
    id: e.id, name: (<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,229,212,.12)', color: 'var(--nhr-turquoise)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700 }}>
        {e.name.split(' ').map(w => w[0]).join('')}
      </span>
      <span style={{ color: '#fff', fontWeight: 600 }}>{e.name}</span>
    </span>),
    empid: e.id, dept: e.dept, role: e.role,
    status: <Badge tone={statusTone[e.status]}>{e.status}</Badge>,
    pay: e.pay
  }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Total Employees" value="120" delta="+6" caption="this quarter" icon={<Icon name="Users" size={18} />} />
        <StatTile label="Present Today" value="112" delta="+4" caption="vs yesterday" icon={<Icon name="UserCheck" size={18} />} />
        <StatTile label="On Leave" value="6" caption="approved" icon={<Icon name="CalendarCheck" size={18} />} />
        <StatTile label="Open Roles" value="3" caption="recruiting" icon={<Icon name="UserPlus" size={18} />} />
      </div>
      <DashboardCard title="Employee Directory" padding={compact ? 16 : 20}
        action={<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" style={{
            fontFamily: 'var(--font-core)', fontSize: 13, padding: '9px 12px', width: 170,
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-btn)', color: '#fff', outline: 'none'
          }} />
          <Button size="sm" iconLeft={<Icon name="Plus" size={16} />}>Add Employee</Button>
        </div>}>
        <DataTable
          columns={[{ key: 'name', label: 'Employee' }, { key: 'empid', label: 'ID', mono: true }, { key: 'dept', label: 'Department' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'pay', label: 'Monthly', align: 'right', mono: true }]}
          rows={rows} />
      </DashboardCard>
    </div>
  );
}

function PayrollScreen({ compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 16 }}>
        <StatTile label="Gross Payroll" value="£412,880" delta="+2.4%" caption="September" icon={<Icon name="Wallet" size={18} />} />
        <StatTile label="Deductions" value="£78,110" caption="tax and pension" icon={<Icon name="Percent" size={18} />} />
        <StatTile label="Net Pay" value="£334,770" delta="+2.1%" caption="September" icon={<Icon name="Banknote" size={18} />} />
        <StatTile label="Pending Approvals" value="26" direction="down" delta="-9" caption="vs last run" icon={<Icon name="ClipboardCheck" size={18} />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.4fr 1fr', gap: 16 }}>
        <DashboardCard title="Payroll Runs" padding={compact ? 16 : 20} action={<Button size="sm">Run Payroll</Button>}>
          <DataTable
            columns={[{ key: 'period', label: 'Period' }, { key: 'ref', label: 'Reference', mono: true }, { key: 'people', label: 'Employees', align: 'right' }, { key: 'status', label: 'Status' }, { key: 'total', label: 'Gross', align: 'right', mono: true }]}
            rows={[
              { period: 'September 2026', ref: 'RUN-2609', people: '120', status: <Badge tone="warning">In review</Badge>, total: '£412,880' },
              { period: 'August 2026', ref: 'RUN-2608', people: '118', status: <Badge tone="success">Paid</Badge>, total: '£403,120' },
              { period: 'July 2026', ref: 'RUN-2607', people: '117', status: <Badge tone="success">Paid</Badge>, total: '£398,440' },
              { period: 'June 2026', ref: 'RUN-2606', people: '114', status: <Badge tone="success">Paid</Badge>, total: '£388,900' }
            ]} />
        </DashboardCard>
        <DashboardCard title="Cost By Department" padding={compact ? 16 : 20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProgressMeter label="Operations" value={42} valueLabel="£173.4k" />
            <ProgressMeter label="Finance" value={24} valueLabel="£99.1k" />
            <ProgressMeter label="People" value={18} valueLabel="£74.3k" />
            <ProgressMeter label="Support" value={16} valueLabel="£66.1k" />
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

function PlaceholderScreen({ name }) {
  return (
    <Card tone="dark" padding="var(--card-padding-lg)" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
      <Icon name="Construction" size={22} style={{ color: 'var(--nhr-turquoise)' }} />
      <h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>{name}</h3>
      <p style={{ margin: 0, fontSize: 14.5, maxWidth: 520, lineHeight: 1.6 }}>
        No source design was supplied for this screen, so it is intentionally left blank rather than invented.
        Overview, Employees and Payroll show the platform's real layout system.
      </p>
    </Card>
  );
}

/* Employees is served by the dedicated module in EmployeeList.jsx. */
window.APP_SCREENS = {
  /* The dashboard lives in Dashboard.jsx — it reads live figures from every
     module store, so the resolution is deferred to render time. */
  Overview: (props) => React.createElement(window.OverviewScreen, props),
  Employees: (props) => React.createElement(window.EmployeesModule, props),
  Payroll: (props) => React.createElement(window.PayrollScreenFull, props),
  Attendance: (props) => React.createElement(window.AttendanceScreen, props),
  Leave: (props) => React.createElement(window.LeaveScreen, props),
  Absence: (props) => React.createElement(window.AbsenceScreen, props),
  Rotas: (props) => React.createElement(window.RotaScreen, props),
  Documents: (props) => React.createElement(window.DocumentsScreen, props),
  Performance: (props) => React.createElement(window.PerformanceScreen, props),
  Expenses: (props) => React.createElement(window.ExpensesScreen, props),
  Recruitment: (props) => React.createElement(window.RecruitmentScreen, props),
  Training: (props) => React.createElement(window.TrainingScreen, props),
  'Health & Safety': (props) => React.createElement(window.SafetyScreen, props),
  eLearning: (props) => React.createElement(window.ELearningScreen, props),
  Wellbeing: (props) => React.createElement(window.WellbeingScreen, props),
  Reports: (props) => React.createElement(window.ReportsScreen, props),
  'NHR Intelligence': (props) => React.createElement(window.IntelligenceScreen, props),
  Integrations: (props) => React.createElement(window.IntegrationsScreen, props),
  Resources: (props) => React.createElement(window.ResourcesScreen, props),
  Calculators: (props) => React.createElement(window.CalculatorsScreen, props),
  'Plan & Billing': (props) => React.createElement(window.BillingScreen, props),
  'Customer Stories': (props) => React.createElement(window.StoriesScreen, props),
  Support: (props) => React.createElement(window.SupportScreen, props),
  Analytics: (props) => React.createElement(window.ReportsScreen, props),
  __fallback: PlaceholderScreen
};
Object.assign(window, { OverviewScreen, EmployeesScreen, PayrollScreen, EMPLOYEES, ATTENDANCE, statusTone });

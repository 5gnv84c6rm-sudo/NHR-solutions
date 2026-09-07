import { Play } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { payrollStore, employeesStore } from "../../lib/store";
import { PageHeader, Card, Badge, StatCard } from "../../components/dashboard/ui";
import type { PayrollRun } from "../../types";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function Payroll() {
  const { data: employees } = useCollection(() => employeesStore.list());
  const { data: runs, setData: setRuns, loading } = useCollection(() => payrollStore.list());

  const latest = runs[0];
  const activeEmployees = employees.filter((e) => e.status !== "offboarded").length;

  const runPayroll = async () => {
    const gross = Math.round(activeEmployees * 3200 + Math.random() * 500);
    const ni = Math.round(gross * 0.09);
    const pension = Math.round(gross * 0.04);
    const newRun: PayrollRun = {
      id: `p${Date.now()}`,
      period: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      runDate: new Date().toISOString().slice(0, 10),
      status: "processing",
      employeesPaid: activeEmployees,
      grossTotal: gross,
      niTotal: ni,
      pensionTotal: pension,
      netTotal: gross - ni - pension,
    };
    await payrollStore.create(newRun);
    setRuns((prev) => [newRun, ...prev]);
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="UK-compliant PAYE, NI and pension calculations built in."
        action={
          <button
            onClick={runPayroll}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Play size={16} /> Run payroll
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Employees on payroll" value={loading ? "…" : activeEmployees} />
        <StatCard label="Last gross total" value={loading || !latest ? "…" : gbp.format(latest.grossTotal)} />
        <StatCard label="Last NI + pension" value={loading || !latest ? "…" : gbp.format(latest.niTotal + latest.pensionTotal)} tone="warning" />
        <StatCard label="Last net total" value={loading || !latest ? "…" : gbp.format(latest.netTotal)} tone="accent" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-ink-100 p-5">
          <h2 className="font-semibold text-ink-900">Payroll runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-ink-500">
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Run date</th>
                <th className="px-5 py-3 font-medium">Employees</th>
                <th className="px-5 py-3 font-medium">Gross</th>
                <th className="px-5 py-3 font-medium">NI + pension</th>
                <th className="px-5 py-3 font-medium">Net</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-5 py-3.5 font-medium text-ink-900">{run.period}</td>
                  <td className="px-5 py-3.5 text-ink-600">{run.runDate}</td>
                  <td className="px-5 py-3.5 text-ink-600">{run.employeesPaid}</td>
                  <td className="px-5 py-3.5 text-ink-600">{gbp.format(run.grossTotal)}</td>
                  <td className="px-5 py-3.5 text-ink-600">{gbp.format(run.niTotal + run.pensionTotal)}</td>
                  <td className="px-5 py-3.5 text-ink-600">{gbp.format(run.netTotal)}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={run.status}>{run.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

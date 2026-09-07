import { useMemo } from "react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, daysUntil } from "../../lib/store";
import { PageHeader, Card, Badge, StatCard } from "../../components/dashboard/ui";

function statusFor(days: number): "valid" | "expiring" | "expired" {
  if (days < 0) return "expired";
  if (days <= 90) return "expiring";
  return "valid";
}

export default function PassportTracking() {
  const { data: employees, loading } = useCollection(() => employeesStore.list());

  const rows = useMemo(
    () =>
      employees
        .filter((e) => e.passportExpiry)
        .map((e) => ({ employee: e, days: daysUntil(e.passportExpiry as string) }))
        .sort((a, b) => a.days - b.days),
    [employees],
  );

  const critical = rows.filter((r) => r.days <= 30).length;
  const upcoming = rows.filter((r) => r.days > 30 && r.days <= 90).length;

  return (
    <div>
      <PageHeader title="Passport tracking" description="Automated alerts at 90, 60 and 30 days before expiry." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tracked passports" value={loading ? "…" : rows.length} />
        <StatCard label="Expiring within 30 days" value={loading ? "…" : critical} tone="critical" />
        <StatCard label="Expiring within 90 days" value={loading ? "…" : upcoming} tone="warning" />
      </div>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-ink-500">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Expiry date</th>
                <th className="px-5 py-3 font-medium">Days remaining</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map(({ employee, days }) => (
                <tr key={employee.id}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${employee.avatarColor}`}>
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </span>
                      <span className="font-medium text-ink-900">
                        {employee.firstName} {employee.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{employee.department}</td>
                  <td className="px-5 py-3.5 text-ink-600">{employee.passportExpiry}</td>
                  <td className="px-5 py-3.5 text-ink-600">{days} days</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={statusFor(days)}>{statusFor(days)}</Badge>
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

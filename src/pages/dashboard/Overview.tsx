import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, CalendarClock, FileWarning, PlaneTakeoff } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, attendanceStore, computeComplianceAlerts } from "../../lib/store";
import { PageHeader, StatCard, Card, Badge } from "../../components/dashboard/ui";
import type { Employee } from "../../types";

export default function Overview() {
  const { data: employees, loading: loadingEmployees } = useCollection(() => employeesStore.list());
  const { data: attendance, loading: loadingAttendance } = useCollection(() => attendanceStore.list());

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const active = employees.filter((e) => e.status !== "offboarded");
  const onLeave = employees.filter((e) => e.status === "on_leave").length;
  const presentToday = attendance.filter((a) => a.status === "present").length;
  const alerts = useMemo(() => computeComplianceAlerts(employees), [employees]);
  const loading = loadingEmployees || loadingAttendance;

  return (
    <div>
      <PageHeader title="Overview" description="A snapshot of your workforce today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total employees" value={loading ? "…" : active.length} icon={<Users size={18} className="text-ink-400" />} />
        <StatCard label="Present today" value={loading ? "…" : presentToday} tone="accent" icon={<CalendarClock size={18} className="text-accent-500" />} />
        <StatCard label="On leave" value={loading ? "…" : onLeave} tone="warning" icon={<CalendarClock size={18} className="text-amber-500" />} />
        <StatCard label="Expiring documents" value={loading ? "…" : alerts.length} tone="critical" icon={<FileWarning size={18} className="text-rose-500" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink-100 p-5">
            <h2 className="font-semibold text-ink-900">Compliance alerts</h2>
            <Link to="/dashboard/visas" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-ink-100">
            {alerts.length === 0 && !loading && (
              <p className="p-5 text-sm text-ink-500">No documents expiring in the next 90 days.</p>
            )}
            {alerts.slice(0, 6).map((alert) => {
              const emp = employeeById.get(alert.employeeId);
              return (
                <div key={alert.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-white ${emp?.avatarColor ?? "bg-ink-400"}`}>
                      <PlaneTakeoff size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown employee"}
                      </p>
                      <p className="text-xs text-ink-500">{alert.description}</p>
                    </div>
                  </div>
                  <Badge tone={alert.severity}>{alert.severity}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-ink-100 p-5">
            <h2 className="font-semibold text-ink-900">Quick links</h2>
          </div>
          <div className="grid gap-3 p-5">
            {[
              { to: "/dashboard/employees", label: "Add a new employee" },
              { to: "/dashboard/shifts", label: "Build this week's rota" },
              { to: "/dashboard/payroll", label: "Review payroll runs" },
              { to: "/dashboard/attendance", label: "Approve leave requests" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg border border-ink-100 px-4 py-3 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

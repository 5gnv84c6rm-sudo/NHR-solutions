import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, attendanceStore, leaveStore } from "../../lib/store";
import { PageHeader, Card, Badge, StatCard } from "../../components/dashboard/ui";
import type { Employee, LeaveRequest } from "../../types";

export default function AttendanceLeave() {
  const { data: employees } = useCollection(() => employeesStore.list());
  const { data: attendance, loading: loadingAttendance } = useCollection(() => attendanceStore.list());
  const { data: leave, setData: setLeave, loading: loadingLeave } = useCollection(() => leaveStore.list());

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const present = attendance.filter((a) => a.status === "present").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const pendingLeave = leave.filter((l) => l.status === "pending");

  const updateLeave = async (item: LeaveRequest, status: LeaveRequest["status"]) => {
    await leaveStore.update(item.id, { status });
    setLeave((prev) => prev.map((l) => (l.id === item.id ? { ...l, status } : l)));
  };

  return (
    <div>
      <PageHeader title="Attendance & leave" description="Real-time tracking with a self-service portal." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Present today" value={loadingAttendance ? "…" : present} tone="accent" />
        <StatCard label="Late arrivals" value={loadingAttendance ? "…" : late} tone="warning" />
        <StatCard label="Absent" value={loadingAttendance ? "…" : absent} tone="critical" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="border-b border-ink-100 p-5">
            <h2 className="font-semibold text-ink-900">Today's attendance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-ink-500">
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Clock in</th>
                  <th className="px-5 py-3 font-medium">Clock out</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {attendance.map((rec) => {
                  const emp = employeeById.get(rec.employeeId);
                  return (
                    <tr key={rec.id}>
                      <td className="px-5 py-3 text-ink-800">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</td>
                      <td className="px-5 py-3 text-ink-600">{rec.clockIn ?? "—"}</td>
                      <td className="px-5 py-3 text-ink-600">{rec.clockOut ?? "—"}</td>
                      <td className="px-5 py-3 text-ink-600">{rec.method}</td>
                      <td className="px-5 py-3">
                        <Badge tone={rec.status}>{rec.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-ink-100 p-5">
            <h2 className="font-semibold text-ink-900">Leave requests</h2>
            {!loadingLeave && <span className="text-xs font-medium text-ink-400">{pendingLeave.length} pending</span>}
          </div>
          <div className="divide-y divide-ink-100">
            {leave.map((item) => {
              const emp = employeeById.get(item.employeeId);
              return (
                <div key={item.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</p>
                      <p className="text-xs text-ink-500">
                        {item.type} · {item.startDate} → {item.endDate} · {item.daysRequested} day{item.daysRequested === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge tone={item.status}>{item.status}</Badge>
                  </div>
                  {item.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateLeave(item, "approved")}
                        className="flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-100"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => updateLeave(item, "declined")}
                        className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import { Check, X, Plus } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, attendanceStore, leaveStore } from "../../lib/store";
import { PageHeader, Card, Badge, StatCard } from "../../components/dashboard/ui";
import { Modal } from "../../components/Modal";
import type { Employee, LeaveRequest, AttendanceRecord } from "../../types";

export default function AttendanceLeave() {
  const { data: employees } = useCollection(() => employeesStore.list());
  const {
    data: attendance,
    setData: setAttendance,
    loading: loadingAttendance,
  } = useCollection(() => attendanceStore.list());
  const { data: leave, setData: setLeave, loading: loadingLeave } = useCollection(() => leaveStore.list());
  const [addOpen, setAddOpen] = useState(false);

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

  const handleAddAttendance = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const str = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    };

    const newRecord: AttendanceRecord = {
      id: `a${Date.now()}`,
      employeeId: String(form.get("employeeId")),
      date: str("date") ?? new Date().toISOString().slice(0, 10),
      clockIn: str("clockIn"),
      clockOut: str("clockOut"),
      method: (str("method") as AttendanceRecord["method"]) ?? "Manual",
      status: (str("status") as AttendanceRecord["status"]) ?? "present",
    };
    await attendanceStore.create(newRecord);
    setAttendance((prev) => [...prev, newRecord]);
    setAddOpen(false);
    e.currentTarget.reset();
  };

  return (
    <div>
      <PageHeader
        title="Attendance & leave"
        description="Real-time tracking with a self-service portal."
        action={
          employees.length > 0 ? (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={16} /> Add record
            </button>
          ) : undefined
        }
      />

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
                {!loadingAttendance && attendance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink-400">
                      {employees.length === 0
                        ? "Add an employee first, then you can record attendance."
                        : 'No attendance recorded yet — click "Add record" to log a clock in/out.'}
                    </td>
                  </tr>
                )}
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
            {!loadingLeave && leave.length === 0 && (
              <p className="p-5 text-sm text-ink-400">No leave requests yet.</p>
            )}
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

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add attendance record" subtitle="Log a clock in/out for an employee.">
        <form className="space-y-4" onSubmit={handleAddAttendance}>
          <label htmlFor="employeeId" className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Employee</span>
            <select
              id="employeeId"
              name="employeeId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="" disabled>
                Select an employee…
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="date" className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Date</span>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="clockIn" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Clock in</span>
              <input
                id="clockIn"
                name="clockIn"
                type="time"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label htmlFor="clockOut" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Clock out</span>
              <input
                id="clockOut"
                name="clockOut"
                type="time"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="method" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Method</span>
              <select
                id="method"
                name="method"
                defaultValue="Manual"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option>Manual</option>
                <option>Web</option>
                <option>GPS mobile</option>
              </select>
            </label>
            <label htmlFor="status" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Status</span>
              <select
                id="status"
                name="status"
                defaultValue="present"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </label>
          </div>

          <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700">
            Add record
          </button>
        </form>
      </Modal>
    </div>
  );
}

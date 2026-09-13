import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, shiftsStore } from "../../lib/store";
import { PageHeader, Card, Badge } from "../../components/dashboard/ui";
import { Modal } from "../../components/Modal";
import type { Employee, Shift } from "../../types";

export default function Shifts() {
  const { data: employees } = useCollection(() => employeesStore.list());
  const { data: shifts, setData: setShifts, loading } = useCollection(() => shiftsStore.list());
  const [addOpen, setAddOpen] = useState(false);

  const employeeById = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const grouped = useMemo(() => {
    const byDate = new Map<string, Shift[]>();
    for (const s of shifts) {
      const list = byDate.get(s.date) ?? [];
      list.push(s);
      byDate.set(s.date, list);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  const togglePublish = async (shift: Shift) => {
    const published = !shift.published;
    await shiftsStore.update(shift.id, { published });
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, published } : s)));
  };

  const handleAddShift = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const employeeId = String(form.get("employeeId"));
    const emp = employeeById.get(employeeId);

    const newShift: Shift = {
      id: `s${Date.now()}`,
      employeeId,
      date: String(form.get("date")),
      startTime: String(form.get("startTime")),
      endTime: String(form.get("endTime")),
      role: String(form.get("role")),
      location: (form.get("location") as string) || emp?.location || "",
      published: form.get("published") === "on",
    };
    await shiftsStore.create(newShift);
    setShifts((prev) => [...prev, newShift]);
    setAddOpen(false);
    e.currentTarget.reset();
  };

  return (
    <div>
      <PageHeader
        title="Shifts & scheduling"
        description="Visual rota builder with drag-and-drop functionality."
        action={
          employees.length > 0 ? (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={16} /> Add shift
            </button>
          ) : undefined
        }
      />

      {!loading && grouped.length === 0 && (
        <Card className="p-8 text-center text-ink-400">
          {employees.length === 0
            ? "Add an employee first, then you can schedule shifts."
            : 'No shifts scheduled yet — click "Add shift" to build the rota.'}
        </Card>
      )}

      <div className="space-y-6">
        {grouped.map(([date, dayShifts]) => (
          <Card key={date}>
            <div className="border-b border-ink-100 p-5">
              <h2 className="font-semibold text-ink-900">
                {new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
            </div>
            <div className="divide-y divide-ink-100">
              {dayShifts.map((shift) => {
                const emp = employeeById.get(shift.employeeId);
                return (
                  <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${emp?.avatarColor ?? "bg-ink-400"}`}>
                        {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : "—"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{emp ? `${emp.firstName} ${emp.lastName}` : "Unassigned"}</p>
                        <p className="text-xs text-ink-500">
                          {shift.role} · {shift.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-ink-600">
                        {shift.startTime} – {shift.endTime}
                      </span>
                      <Badge tone={shift.published ? "published" : "unpublished"}>
                        {shift.published ? "published" : "draft"}
                      </Badge>
                      <button
                        onClick={() => togglePublish(shift)}
                        className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                      >
                        {shift.published ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add shift" subtitle="Schedule a shift for an employee.">
        <form className="space-y-4" onSubmit={handleAddShift}>
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

          <label htmlFor="shift-date" className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Date</span>
            <input
              id="shift-date"
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="startTime" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Start time</span>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                defaultValue="09:00"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label htmlFor="endTime" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">End time</span>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                defaultValue="17:00"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="role" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Role</span>
              <input
                id="role"
                name="role"
                required
                placeholder="e.g. Floor, Till, Kitchen"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label htmlFor="location" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Location</span>
              <input
                id="location"
                name="location"
                placeholder="Defaults to employee's location"
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label htmlFor="published" className="flex items-center gap-2 text-sm text-ink-700">
            <input id="published" name="published" type="checkbox" className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            Publish immediately (visible to the employee)
          </label>

          <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700">
            Add shift
          </button>
        </form>
      </Modal>
    </div>
  );
}

import { useMemo } from "react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, shiftsStore } from "../../lib/store";
import { PageHeader, Card, Badge } from "../../components/dashboard/ui";
import type { Employee, Shift } from "../../types";

export default function Shifts() {
  const { data: employees } = useCollection(() => employeesStore.list());
  const { data: shifts, setData: setShifts, loading } = useCollection(() => shiftsStore.list());

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

  return (
    <div>
      <PageHeader title="Shifts & scheduling" description="Visual rota builder with drag-and-drop functionality." />

      {!loading && grouped.length === 0 && (
        <Card className="p-8 text-center text-ink-400">No shifts scheduled yet.</Card>
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
    </div>
  );
}

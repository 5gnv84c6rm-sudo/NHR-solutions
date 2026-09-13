import { useMemo, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore, daysUntil } from "../../lib/store";
import { PageHeader, Card, Badge, StatCard } from "../../components/dashboard/ui";
import { Modal } from "../../components/Modal";
import { FormField } from "../../components/FormField";
import type { Employee } from "../../types";

function statusFor(days: number): "valid" | "expiring" | "expired" {
  if (days < 0) return "expired";
  if (days <= 90) return "expiring";
  return "valid";
}

export default function VisaTracking() {
  const { data: employees, setData: setEmployees, loading } = useCollection(() => employeesStore.list());
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const tracked = employees
      .filter((e) => e.visaExpiry)
      .map((e) => ({ employee: e, days: daysUntil(e.visaExpiry as string) }))
      .sort((a, b) => a.days - b.days);
    const untracked = employees.filter((e) => !e.visaExpiry).map((e) => ({ employee: e, days: null as number | null }));
    return [...tracked, ...untracked];
  }, [employees]);

  const critical = rows.filter((r) => r.days !== null && r.days <= 30).length;
  const rtwExpiring = employees.filter((e) => e.rightToWorkStatus === "expiring").length;

  const editingEmployee = employees.find((e) => e.id === editingId) ?? null;

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEmployee) return;
    const form = new FormData(e.currentTarget);
    const str = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    };

    const patch: Partial<Employee> = {
      visaType: str("visaType"),
      visaExpiry: str("visaExpiry"),
      rightToWorkStatus: str("rightToWorkStatus") as Employee["rightToWorkStatus"],
    };

    await employeesStore.update(editingEmployee.id, patch);
    setEmployees((prev) => prev.map((emp) => (emp.id === editingEmployee.id ? { ...emp, ...patch } : emp)));
    setEditingId(null);
  };

  return (
    <div>
      <PageHeader title="Visa tracking" description="Skilled Worker, Global Talent and all visa types covered." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sponsored employees" value={loading ? "…" : rows.filter((r) => r.days !== null).length} />
        <StatCard label="Visas expiring within 30 days" value={loading ? "…" : critical} tone="critical" />
        <StatCard label="Right to work needs review" value={loading ? "…" : rtwExpiring} tone="warning" />
      </div>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-ink-500">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Visa type</th>
                <th className="px-5 py-3 font-medium">Expiry date</th>
                <th className="px-5 py-3 font-medium">Days remaining</th>
                <th className="px-5 py-3 font-medium">Right to work</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-400">
                    Add an employee first, then track their visa here.
                  </td>
                </tr>
              )}
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
                  <td className="px-5 py-3.5 text-ink-600">{employee.visaType ?? "—"}</td>
                  <td className="px-5 py-3.5 text-ink-600">{employee.visaExpiry ?? "Not set"}</td>
                  <td className="px-5 py-3.5 text-ink-600">{days !== null ? `${days} days` : "—"}</td>
                  <td className="px-5 py-3.5">
                    {employee.rightToWorkStatus ? (
                      <Badge tone={employee.rightToWorkStatus}>{employee.rightToWorkStatus}</Badge>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {days !== null ? <Badge tone={statusFor(days)}>{statusFor(days)}</Badge> : <span className="text-ink-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setEditingId(employee.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700"
                    >
                      <Pencil size={13} /> {employee.visaExpiry ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={editingEmployee !== null}
        onClose={() => setEditingId(null)}
        title={editingEmployee ? `${editingEmployee.firstName} ${editingEmployee.lastName}` : ""}
        subtitle="Update visa and right to work details."
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <FormField
            id="visaType"
            name="visaType"
            label="Visa type"
            placeholder="e.g. Skilled Worker"
            defaultValue={editingEmployee?.visaType ?? ""}
          />
          <FormField
            id="visaExpiry"
            name="visaExpiry"
            label="Visa expiry date"
            type="date"
            defaultValue={editingEmployee?.visaExpiry ?? ""}
          />
          <label htmlFor="rightToWorkStatus" className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-700">Right to work status</span>
            <select
              id="rightToWorkStatus"
              name="rightToWorkStatus"
              defaultValue={editingEmployee?.rightToWorkStatus ?? ""}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Not set</option>
              <option value="valid">Verified / valid</option>
              <option value="expiring">Needs re-check soon</option>
              <option value="expired">Expired / needs urgent check</option>
            </select>
          </label>
          <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
}

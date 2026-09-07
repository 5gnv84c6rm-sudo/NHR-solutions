import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search, ChevronRight, Phone, Plane, ShieldCheck } from "lucide-react";
import { useCollection } from "../../lib/hooks";
import { employeesStore } from "../../lib/store";
import { PageHeader, Card, Badge } from "../../components/dashboard/ui";
import { Modal } from "../../components/Modal";
import { FormField } from "../../components/FormField";
import type { Employee } from "../../types";

const avatarColors = ["bg-brand-500", "bg-accent-500", "bg-orange-400", "bg-rose-400", "bg-sky-500", "bg-violet-500"];

function fieldOrDash(value?: string) {
  return value && value.trim() !== "" ? value : "—";
}

export default function EmployeeRecords() {
  const { data: employees, setData, loading } = useCollection(() => employeesStore.list());
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const departments = useMemo(
    () => ["All", ...Array.from(new Set(employees.map((e) => e.department)))],
    [employees],
  );

  const filtered = employees.filter((e) => {
    const matchesQuery = `${e.firstName} ${e.lastName} ${e.jobTitle}`.toLowerCase().includes(query.toLowerCase());
    const matchesDept = department === "All" || e.department === department;
    return matchesQuery && matchesDept;
  });

  const viewingEmployee = employees.find((e) => e.id === viewingId) ?? null;

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const str = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    };

    const newEmployee: Employee = {
      id: `e${Date.now()}`,
      firstName: String(form.get("firstName")),
      lastName: String(form.get("lastName")),
      email: String(form.get("email")),
      jobTitle: String(form.get("jobTitle")),
      department: String(form.get("department")),
      location: String(form.get("location")),
      employmentType: (str("employmentType") as Employee["employmentType"]) ?? "Full-time",
      startDate: str("startDate") ?? new Date().toISOString().slice(0, 10),
      status: "active",
      avatarColor: avatarColors[employees.length % avatarColors.length],
      passportExpiry: str("passportExpiry"),
      visaType: str("visaType"),
      visaExpiry: str("visaExpiry"),
      rightToWorkStatus: str("rightToWorkStatus") as Employee["rightToWorkStatus"],
      emergencyContactName: str("emergencyContactName"),
      emergencyContactRelationship: str("emergencyContactRelationship"),
      emergencyContactPhone: str("emergencyContactPhone"),
    };
    await employeesStore.create(newEmployee);
    setData((prev) => [...prev, newEmployee]);
    setAddOpen(false);
    e.currentTarget.reset();
  };

  return (
    <div>
      <PageHeader
        title="Employee records"
        description="Cloud storage for contracts and documents, always audit-ready."
        action={
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus size={16} /> Add employee
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or role…"
            className="w-full rounded-lg border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-ink-500">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Started</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-ink-400">
                    {employees.length === 0
                      ? "No employees yet — click “Add employee” to create your first record."
                      : "No employees match your search."}
                  </td>
                </tr>
              )}
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => setViewingId(emp.id)}
                  className="cursor-pointer hover:bg-ink-50/60"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${emp.avatarColor}`}>
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </span>
                      <div>
                        <p className="font-medium text-ink-900">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-ink-500">{emp.jobTitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{emp.department}</td>
                  <td className="px-5 py-3.5 text-ink-600">{emp.location}</td>
                  <td className="px-5 py-3.5 text-ink-600">{emp.employmentType}</td>
                  <td className="px-5 py-3.5 text-ink-600">{emp.startDate}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={emp.status}>{emp.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right text-ink-300">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add employee"
        subtitle="Add a new record to your workspace. Passport, visa and emergency contact details are optional."
      >
        <form className="space-y-5" onSubmit={handleAdd}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="firstName" name="firstName" label="First name" required />
              <FormField id="lastName" name="lastName" label="Last name" required />
            </div>
            <FormField id="email" name="email" label="Email" type="email" required />
            <FormField id="jobTitle" name="jobTitle" label="Job title" required />
            <div className="grid grid-cols-2 gap-3">
              <FormField id="department" name="department" label="Department" required />
              <FormField id="location" name="location" label="Location" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="employmentType" className="block text-sm">
                <span className="mb-1.5 block font-medium text-ink-700">Employment type</span>
                <select
                  id="employmentType"
                  name="employmentType"
                  defaultValue="Full-time"
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                </select>
              </label>
              <FormField id="startDate" name="startDate" label="Start date" type="date" />
            </div>
          </div>

          <div className="space-y-4 border-t border-ink-100 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Plane size={15} className="text-brand-600" /> Passport &amp; visa tracking
            </div>
            <FormField id="passportExpiry" name="passportExpiry" label="Passport expiry date" type="date" />
            <div className="grid grid-cols-2 gap-3">
              <FormField id="visaType" name="visaType" label="Visa type (if applicable)" placeholder="e.g. Skilled Worker" />
              <FormField id="visaExpiry" name="visaExpiry" label="Visa expiry date" type="date" />
            </div>
            <label htmlFor="rightToWorkStatus" className="block text-sm">
              <span className="mb-1.5 block font-medium text-ink-700">Right to work status</span>
              <select
                id="rightToWorkStatus"
                name="rightToWorkStatus"
                defaultValue=""
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Not set</option>
                <option value="valid">Verified / valid</option>
                <option value="expiring">Needs re-check soon</option>
                <option value="expired">Expired / needs urgent check</option>
              </select>
            </label>
          </div>

          <div className="space-y-4 border-t border-ink-100 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Phone size={15} className="text-brand-600" /> Emergency contact
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="emergencyContactName" name="emergencyContactName" label="Contact name" />
              <FormField id="emergencyContactRelationship" name="emergencyContactRelationship" label="Relationship" placeholder="e.g. Spouse" />
            </div>
            <FormField id="emergencyContactPhone" name="emergencyContactPhone" label="Phone number" type="tel" />
          </div>

          <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition hover:bg-brand-700">
            Add employee
          </button>
        </form>
      </Modal>

      <Modal
        open={viewingEmployee !== null}
        onClose={() => setViewingId(null)}
        title={viewingEmployee ? `${viewingEmployee.firstName} ${viewingEmployee.lastName}` : ""}
        subtitle={viewingEmployee?.jobTitle}
      >
        {viewingEmployee && (
          <div className="space-y-5 text-sm">
            <div>
              <p className="mb-2 font-semibold text-ink-800">Details</p>
              <dl className="grid grid-cols-2 gap-y-2 text-ink-600">
                <dt className="text-ink-400">Email</dt>
                <dd>{viewingEmployee.email}</dd>
                <dt className="text-ink-400">Department</dt>
                <dd>{viewingEmployee.department}</dd>
                <dt className="text-ink-400">Location</dt>
                <dd>{viewingEmployee.location}</dd>
                <dt className="text-ink-400">Employment type</dt>
                <dd>{viewingEmployee.employmentType}</dd>
                <dt className="text-ink-400">Start date</dt>
                <dd>{viewingEmployee.startDate}</dd>
                <dt className="text-ink-400">Status</dt>
                <dd>
                  <Badge tone={viewingEmployee.status}>{viewingEmployee.status}</Badge>
                </dd>
              </dl>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 flex items-center gap-2 font-semibold text-ink-800">
                <Plane size={15} className="text-brand-600" /> Passport &amp; visa
              </p>
              <dl className="grid grid-cols-2 gap-y-2 text-ink-600">
                <dt className="text-ink-400">Passport expiry</dt>
                <dd>{fieldOrDash(viewingEmployee.passportExpiry)}</dd>
                <dt className="text-ink-400">Visa type</dt>
                <dd>{fieldOrDash(viewingEmployee.visaType)}</dd>
                <dt className="text-ink-400">Visa expiry</dt>
                <dd>{fieldOrDash(viewingEmployee.visaExpiry)}</dd>
                <dt className="text-ink-400">Right to work</dt>
                <dd>
                  {viewingEmployee.rightToWorkStatus ? (
                    <Badge tone={viewingEmployee.rightToWorkStatus}>{viewingEmployee.rightToWorkStatus}</Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </dl>
            </div>

            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 flex items-center gap-2 font-semibold text-ink-800">
                <Phone size={15} className="text-brand-600" /> Emergency contact
              </p>
              <dl className="grid grid-cols-2 gap-y-2 text-ink-600">
                <dt className="text-ink-400">Name</dt>
                <dd>{fieldOrDash(viewingEmployee.emergencyContactName)}</dd>
                <dt className="text-ink-400">Relationship</dt>
                <dd>{fieldOrDash(viewingEmployee.emergencyContactRelationship)}</dd>
                <dt className="text-ink-400">Phone</dt>
                <dd>{fieldOrDash(viewingEmployee.emergencyContactPhone)}</dd>
              </dl>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <ShieldCheck size={13} /> Click outside this window or press Esc to close.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

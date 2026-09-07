import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookUser,
  CalendarClock,
  Banknote,
  CalendarRange,
  Plane,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../lib/auth";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/employees", label: "Employee records", icon: BookUser },
  { to: "/dashboard/attendance", label: "Attendance & leave", icon: CalendarClock },
  { to: "/dashboard/payroll", label: "Payroll", icon: Banknote },
  { to: "/dashboard/shifts", label: "Shifts & scheduling", icon: CalendarRange },
  { to: "/dashboard/passports", label: "Passport tracking", icon: Plane },
  { to: "/dashboard/visas", label: "Visa tracking", icon: Users },
];

export function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-400">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-ink-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-6 font-extrabold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <ShieldCheck size={18} />
          </span>
          NHR <span className="text-brand-600">Solution</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-4">
          <p className="truncate text-sm font-medium text-ink-800">{user.companyName || user.fullName}</p>
          <p className="truncate text-xs text-ink-400">{user.email}</p>
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 lg:px-8">
          <p className="text-sm font-medium text-ink-500">Welcome back, {user.fullName?.split(" ")[0] || "there"}</p>
          <button onClick={handleSignOut} className="text-sm font-medium text-ink-500 hover:text-ink-800 lg:hidden">
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

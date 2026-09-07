import { supabase, isSupabaseConfigured } from "./supabase";
import {
  seedEmployees,
  seedLeaveRequests,
  seedAttendance,
  seedPayrollRuns,
  seedShifts,
} from "./seed";
import type {
  Employee,
  LeaveRequest,
  AttendanceRecord,
  PayrollRun,
  Shift,
  ComplianceAlert,
} from "../types";

/**
 * Data layer for NHR Solution.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set, every collection
 * reads and writes through Supabase tables of the same name (employees,
 * leave_requests, attendance, payroll_runs, shifts) with matching columns.
 * When they are not set, the app is fully usable on its own: each collection
 * is persisted to localStorage, seeded with realistic demo data on first run.
 */

const STORAGE_PREFIX = "nhr_";

function readLocal<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (!raw) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function writeLocal<T>(key: string, value: T[]) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

function makeCollection<T extends { id: string }>(
  key: string,
  table: string,
  seed: T[],
) {
  return {
    async list(): Promise<T[]> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) throw error;
        return (data ?? []) as T[];
      }
      return readLocal<T>(key, seed);
    },
    async create(item: T): Promise<T> {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from(table)
          .insert(item)
          .select()
          .single();
        if (error) throw error;
        return data as T;
      }
      const items = readLocal<T>(key, seed);
      items.push(item);
      writeLocal(key, items);
      return item;
    },
    async update(id: string, patch: Partial<T>): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from(table)
          .update(patch as Record<string, unknown>)
          .eq("id", id);
        if (error) throw error;
        return;
      }
      const items = readLocal<T>(key, seed);
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) items[idx] = { ...items[idx], ...patch };
      writeLocal(key, items);
    },
    async remove(id: string): Promise<void> {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const items = readLocal<T>(key, seed).filter((i) => i.id !== id);
      writeLocal(key, items);
    },
  };
}

export const employeesStore = makeCollection<Employee>(
  "employees",
  "employees",
  seedEmployees,
);
export const leaveStore = makeCollection<LeaveRequest>(
  "leave_requests",
  "leave_requests",
  seedLeaveRequests,
);
export const attendanceStore = makeCollection<AttendanceRecord>(
  "attendance",
  "attendance",
  seedAttendance,
);
export const payrollStore = makeCollection<PayrollRun>(
  "payroll_runs",
  "payroll_runs",
  seedPayrollRuns,
);
export const shiftsStore = makeCollection<Shift>("shifts", "shifts", seedShifts);

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

export function computeComplianceAlerts(employees: Employee[]): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  for (const emp of employees) {
    if (emp.passportExpiry) {
      const days = daysUntil(emp.passportExpiry);
      if (days <= 90) {
        alerts.push({
          id: `passport-${emp.id}`,
          employeeId: emp.id,
          type: "passport",
          description: `Passport expires in ${days} day${days === 1 ? "" : "s"}`,
          dueDate: emp.passportExpiry,
          severity: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
        });
      }
    }
    if (emp.visaExpiry) {
      const days = daysUntil(emp.visaExpiry);
      if (days <= 90) {
        alerts.push({
          id: `visa-${emp.id}`,
          employeeId: emp.id,
          type: "visa",
          description: `${emp.visaType ?? "Visa"} expires in ${days} day${days === 1 ? "" : "s"}`,
          dueDate: emp.visaExpiry,
          severity: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
        });
      }
    }
  }
  return alerts.sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
}

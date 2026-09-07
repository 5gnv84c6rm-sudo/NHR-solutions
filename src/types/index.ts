export type DocumentStatus = "valid" | "expiring" | "expired";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  startDate: string;
  status: "active" | "on_leave" | "offboarded";
  avatarColor: string;
  passportExpiry?: string;
  visaType?: string;
  visaExpiry?: string;
  rightToWorkStatus?: DocumentStatus;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "Annual leave" | "Sick leave" | "Unpaid leave" | "Parental leave";
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "declined";
  daysRequested: number;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  method: "GPS mobile" | "Web" | "Manual";
  status: "present" | "absent" | "late";
}

export interface PayrollRun {
  id: string;
  period: string;
  runDate: string;
  status: "draft" | "processing" | "completed";
  employeesPaid: number;
  grossTotal: number;
  niTotal: number;
  pensionTotal: number;
  netTotal: number;
}

export interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  location: string;
  published: boolean;
}

export interface ComplianceAlert {
  id: string;
  employeeId: string;
  type: "passport" | "visa" | "right_to_work";
  description: string;
  dueDate: string;
  severity: "info" | "warning" | "critical";
}

export interface AppUser {
  email: string;
  companyName: string;
  fullName: string;
}

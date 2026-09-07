import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { Landing } from "./pages/Landing";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import EmployeeRecords from "./pages/dashboard/EmployeeRecords";
import AttendanceLeave from "./pages/dashboard/AttendanceLeave";
import Payroll from "./pages/dashboard/Payroll";
import Shifts from "./pages/dashboard/Shifts";
import PassportTracking from "./pages/dashboard/PassportTracking";
import VisaTracking from "./pages/dashboard/VisaTracking";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="employees" element={<EmployeeRecords />} />
            <Route path="attendance" element={<AttendanceLeave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="passports" element={<PassportTracking />} />
            <Route path="visas" element={<VisaTracking />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

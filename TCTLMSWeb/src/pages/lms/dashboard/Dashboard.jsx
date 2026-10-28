import React from "react";
import AdminDashboard from "./AdminDashboard";
import TutorDashboard from "./TutorDashboard";
import StudentDashboard from "./StudentDashboard";
import CoordinatorDashboard from "./CoordinatorDashboard";
import CoordinatorAdminDashboard from "./CoordinatorAdminDashboard";
import OperationsDashboard from "./OperationsDashboard";
import OperationsAdminDashboard from "./OperationsAdminDashboard";
import AccountsDashboard from "./AccountPayrollDashboard";
import AccountsAdminDashboard from "./AccountsAdminDashboard";
import PayrollAdminDashboard from "./PayrollAdminDashboard";
import HRDashboard from "./HRDashboard";


const Dashboard = () => {
  const userRole = localStorage.getItem("userRole");

  const renderDashboard = () => {
    switch (userRole) {
      case "SuperAdmin":
      case "Admin":
      case "SalesAdmin":
        return <AdminDashboard />;
      case "Tutor":
        return <TutorDashboard />;
      case "Student":
        return <StudentDashboard />;
      case "Coordinator":
        return <CoordinatorDashboard />;
      case "CoordinatorAdmin":
        return <CoordinatorAdminDashboard />;
      case "Operations":
        return <OperationsDashboard />;
      case "OperationsAdmin":
        return <OperationsAdminDashboard />;
      case "AccountsAdmin":
        return <AccountsAdminDashboard />;
      case "PayrollAdmin":
        return <PayrollAdminDashboard />;
      case "Payroll":
      case "Accounts":
        return <AccountsDashboard />;

      case "HRAdmin":
      case "HR":
        return <HRDashboard />;

      default:
        return <div>No dashboard available for this role</div>;
    }
  };

  return renderDashboard();
};

export default Dashboard;

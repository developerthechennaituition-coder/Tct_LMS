import React, { Suspense, useLayoutEffect } from "react";
import { Switch, Route } from "react-router-dom";

import { UserContextProvider } from "../pages/pre-built/user-manage/UserContext";
import { RedirectAs404 } from "../utils/Utils";
import Homepage from "../pages/Homepage";
import UserProfileLayout from "../pages/pre-built/user-manage/UserProfileLayout";
import StudentList from "../pages/lms/students/StudentList";
import AccountsStudentList from "../pages/lms/accounts/AccountsStudentList.jsx";
import AccountsTutorList from "../pages/lms/accounts/AccountsTutorList.jsx";
import { StudentContextProvider } from "../pages/lms/students/StudentContext";
import LMSIndex from "../pages/lms/Index";
import EnrollStudent from "../pages/lms/enrollment/EnrollStudent.jsx";
import Enroll from "../pages/lms/enrollment/Enroll.jsx";
import StudentProfilePage from "../pages/lms/students/StudentProfile";
import StudentProfileLayout from "../pages/lms/students/StudentProfileLayout.jsx";
import StudentProfileLayoutNew from "../pages/lms/students/StudentProfileLayoutNew.jsx";
import MastersData from "../pages/lms/masterdata/MastersData.jsx";
import RolePermission from "../pages/lms/users/RolePermission.jsx";
import TypeCode from "../pages/lms/masterdata/TypeCode.jsx";
import ThresholdConfig from "../pages/lms/masterdata/ThresholdConfiguration.jsx";
import PaymentPercentageConfiguration from "../pages/lms/masterdata/PaymentPercentageConfiguration.jsx";
import TCTUser from "../pages/lms/users/TCTUser.jsx";
import TCTUserList from "../pages/lms/users/TCTUserList.jsx";
import TCTUseActivityList from "../pages/lms/users/TCTUserActivity.jsx";
import TCTUserProfileLayout from "../pages/lms/users/TCTUserProfileLayout.jsx";
import TCTStudentProfileLayout from "../pages/lms/users/TCTStudentProfileLayout.jsx";
import EnrollmentHistory from "../pages/lms/enrollment/EnrollmentHistory.jsx";
import CoordinatorNotification from "../pages/lms/users/TCTUserNotificationList.jsx";
import UserNotifications from "../pages/lms/users/TCTUserNotificationList.jsx";
import CoAdminNotification from "../pages/lms/users/TCTCoordniateAdminNotificationList.jsx";
import TCTTutor from "../pages/lms/tutors/TCTTotur.jsx";
import TCTTutorList from "../pages/lms/tutors/TCTTutorList.jsx";
import TCTTutorBulkUpload from "../pages/lms/tutors/TCTTutorBulkUpload.jsx";
import TCTSalesBulkUpload from "../pages/lms/students/TCTSalesBulkUpload.jsx";
import EditTCTTutorAttendance from "../pages/lms/tutors/EditTCTTutorAttendance.jsx";
import TCTTutorOprList from "../pages/lms/tutors/TCTTutorOprList.jsx";
import TCTTutorPayroll from "../pages/lms/tutors/TCTTutorPayroll.jsx";
import TCTDueTimings from "../pages/lms/accounts/TCTDueTimings.jsx";
import TCTScheduleCalendar from "../pages/lms/schedule/TCTScheduleCalendar.jsx";
import TCTTutorInvoiceList from "../pages/lms/tutors/TCTTutorInvoiceList.jsx";
import TCTStudentInvoiceList from "../pages/lms/students/TCTStudentInvoiceList.jsx";
import TCTToturProfileLayout from "../pages/lms/tutors/TCTTutorProfileLayout.jsx";
import TCTTutorCalender from "../pages/lms/tutors/TCTTutorCalender.jsx";
import ScheduleDemoAndClass from "../pages/lms/coordinator/ScheduleDemoAndClass.jsx";
import ViewScheduledClass from "../pages/lms/coordinator/ViewScheduledClass.jsx";
import TutorInvoiceDetails from "../pages/lms/tutors/InvoiceDetails.js";
import StudentInvoiceDetails from "../pages/lms/students/InvoiceDetails.js";
import TCTStudentCalender from "../pages/lms/students/TCTStudentCalender.jsx";
import Index from "../pages/lms/Index.jsx";
import CoordinatorDashboard from "../pages/lms/dashboard/CoordinatorDashboard.jsx";
import CoordinatorAdminDashboard from "../pages/lms/dashboard/CoordinatorAdminDashboard.jsx";
import AccountPayrollDashboard from "../pages/lms/dashboard/AccountPayrollDashboard.jsx";
import AccountsAdminDashboard from "../pages/lms/dashboard/AccountsAdminDashboard.jsx";
import PayrollAdminDashboard from "../pages/lms/dashboard/PayrollAdminDashboard.jsx";
import OperationsDashboard from "../pages/lms/dashboard/OperationsDashboard.jsx";
import OperationsAdminDashboard from "../pages/lms/dashboard/OperationsAdminDashboard.jsx";
import StudentDashboard from "../pages/lms/dashboard/StudentDashboard.jsx";
import TutorDashboard from "../pages/lms/dashboard/TutorDashboard.jsx";
import Login from "../pages/auth/Login.js";
import PasswordReset from "../pages/auth/ForgotPassword.js";
import Success from "../pages/auth/Success.js";
import PermissionTreeGrid from "../pages/lms/users/PermissionGrid";
import TCTBankDetails from "../pages/lms/users/TCTBankDetails.jsx";
import TCTUserDetailsPage from "../pages/lms/users/TCTUserDetailsRegular.js";
import StudentSchedule from "../pages/lms/students/StudentSchedule.jsx";
import DemoPending from "../pages/lms/schedule/DemoPending.jsx";
import NeedToSchedule from "../pages/lms/schedule/NeedToSchedule.jsx";
import ScheduleStatusList from "../pages/lms/schedule/ScheduleStatusList.jsx";
import TCTTutorListGrid from "../pages/lms/tutors/TCTTutorListGrid.jsx";
import ClassAttendance from "../pages/lms/schedule/ApproveClassAttendanceList.jsx";
import Chat from "../pages/app/chat/ChatContainer";
import Chat1 from "../pages/app/chat1/ChatContainer";
import ChatApp from "../pages/lms/chat/ChatApp.jsx";
import TCTOperationCalendar from "../pages/lms/operation/TCTOperationCalendar.jsx";
import TCTOperationsViewCalendar from "../pages/lms/operation/TCTOperationsViewCalendar.jsx";
import OperationsHelpPlaceholder from "../pages/lms/operation/OperationsHelpPlaceholder.jsx";
import SupportHelp from "../pages/lms/operation/SupportHelp.jsx";
import ChangeRequestPage from "../pages/lms/changerequests/ChangeRequestPage.jsx";
import OperationsChangeRequests from "../pages/lms/changerequests/OperationsChangeRequests.jsx";
import MyCalendar from "../pages/lms/mycalendar/MyCalendar.jsx";
import OperationsReports from "../pages/lms/operation/reports/OperationsReports.jsx";
import OperationsReportView from "../pages/lms/operation/reports/OperationsReportView.jsx";
import AccountsReports from "../pages/lms/accounts/reports/AccountsReports.jsx";
import AccountsReportView from "../pages/lms/accounts/reports/AccountsReportView.jsx";
import QuestionPaperUpload from "../pages/lms/assessment/QuestionPaperUpload.jsx";
import MockExams from "../pages/lms/assessment/MockExams.jsx";
import StudentTestPapers from "../pages/lms/assessment/StudentTestPapers.jsx";
import AnswerSheetEvaluation from "../pages/lms/assessment/AnswerSheetEvaluation.jsx";
import DashboardOverview from "../pages/lms/dashboard/DashboardOverview.jsx";
import InvestmentDashboard from "../pages/lms/dashboard/InvestmentDashboard.jsx";
import CryptoDashboard from "../pages/lms/dashboard/CryptoDashboard.jsx";
import LMSDashboard from "../pages/lms/dashboard/LMSDashboard.jsx";
import LeadLists from "../pages/lms/customer-management/LeadLists.jsx";
import Sales from "../pages/lms/customer-management/Sales.jsx";
import Products from "../pages/lms/customer-management/product_management/Products.jsx";
import Warehouses from "../pages/lms/customer-management/product_management/Warehouses.jsx";
import ProductTransfer from "../pages/lms/customer-management/product_management/ProductTransfer.jsx";
import Reports from "../pages/lms/customer-management/Reports.jsx";
import Payroll from "../pages/lms/customer-management/Payroll.jsx";
import CourseCategory from "../pages/lms/learning-management/course/CourseCategory";
import CourseList from "../pages/lms/learning-management/course/CourseList";
import StudentLists from "../pages/lms/learning-management/student/StudentLists";
import StudentDetails from "../pages/lms/learning-management/student/StudentDetails";
import EnrollStudents from "../pages/lms/learning-management/student/EnrollStudents.jsx";
import InstructorOverview from "../pages/lms/learning-management/Instructors/InstructorOverview";
import InstructorList from "../pages/lms/learning-management/Instructors/InstructorList";
import InstructorDetails from "../pages/lms/learning-management/Instructors/InstructorDetails";
import InstructorPayment from "../pages/lms/learning-management/Instructors/InstructorPayment";
const Pages = () => {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  });

  return (
    <Suspense fallback={<div />}>
      <Switch>
        {/*Learning Management System*/}
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/studentlist`}
          render={() => (
            <StudentContextProvider>
              <StudentList />
            </StudentContextProvider>
          )}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/accounts-studentlist`}
          render={() => (
            <StudentContextProvider>
              <AccountsStudentList />
            </StudentContextProvider>
          )}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/accounts-tutorlist`}
          render={() => <AccountsTutorList />}
        ></Route>
        <Route //Context Api added
          exact
          path={`${process.env.PUBLIC_URL}/student-details/`}
          render={(props) => (
            <UserContextProvider>
              <StudentProfilePage {...props} />
            </UserContextProvider>
          )}
        ></Route>
        <Route //Context Api added
          exact
          path={`${process.env.PUBLIC_URL}/lms/user-details`}
          render={(props) => (
            <UserContextProvider>
              <TCTUserDetailsPage {...props}></TCTUserDetailsPage>
            </UserContextProvider>
          )}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/chat-app/`} component={ChatApp}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/password-reset`} component={PasswordReset}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/auth-login`} component={Login}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/auth-success`} component={Success}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/sales-dashboard`} component={Index}></Route>
        <Route exact path="/dashboard/overview" component={DashboardOverview}/>
        <Route exact path="/dashboard/investment" component={InvestmentDashboard}/>
        <Route exact path={`${process.env.PUBLIC_URL}/dashboard/crypto`} component={CryptoDashboard}/>
        <Route exact path={`${process.env.PUBLIC_URL}/dashboard/lms`} component={LMSDashboard}/>             
        <Route exact path={`${process.env.PUBLIC_URL}/lms/Dashboard/coordinator-dashboard`} component={CoordinatorDashboard}></Route>
        <Route exact path="/customer-management/lead" component={LeadLists}/>
        <Route exact path="/customer-management/sales" component={Sales}/>
        <Route exact path="/product-management/products" component={Products}/>
        <Route exact path="/product-management/warehouse" component={Warehouses}/>
        <Route exact path="/product-management/product-transfer" component={ProductTransfer}/>
        <Route exact path="/product-management/product-transfer" component={ProductTransfer}/>
        <Route exact path="/customer-management/reports" component={Reports}/>
        <Route exact path="/customer-management/payroll" component={Payroll}/>  
        <Route
          exact
          path="/learning-management/course/categories"
          component={CourseCategory}
        />
        <Route
          exact
          path="/learning-management/course/course-list"
          component={CourseList}
        />
        <Route exact path="/learning-management/student/list" component={StudentLists}/>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/student-details/:id`}
          component={StudentDetails}
        />
        <Route
  exact
  path="/learning-management/student/enroll"
  component={EnrollStudents}
/>
<Route
  exact
  path="/learning-management/instructor/overview"
  component={InstructorOverview}
/>
<Route
  exact
  path="/learning-management/instructor/list"
  component={InstructorList}
/>
<Route
    exact
    path="/learning-management/instructor/details/:id"
    component={InstructorDetails}
/>
<Route
    exact
    path="/learning-management/instructor/payment"
    component={InstructorPayment}
/>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/coordinatoradmin-dashboard`}
          component={CoordinatorAdminDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/accounts-dashboard`}
          component={AccountPayrollDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/accountsadmin-dashboard`}
          component={AccountsAdminDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/payrolladmin-dashboard`}
          component={PayrollAdminDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/operations-dashboard`}
          component={OperationsDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/operationsadmin-dashboard`}
          component={OperationsAdminDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/student-dashboard`}
          component={StudentDashboard}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/Dashboard/tutor-dashboard`}
          component={TutorDashboard}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tctuser-profile/`} component={TCTUserProfileLayout}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/tctuser-notifications/`}
          component={TCTUserProfileLayout}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-profile-regular/`}
          component={StudentProfileLayout}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-profile-regular-new/`}
          component={StudentProfileLayoutNew}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-enrolled-courses/`}
          component={StudentProfileLayout}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-user/`} component={TCTUser}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-user-list/`} component={TCTUserList}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/useractivity-list/`} component={TCTUserProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor/`} component={TCTTutor}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-list/`} component={TCTTutorList}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-bulk-upload/`} component={TCTTutorBulkUpload}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-bank-list/`} component={TCTBankDetails}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutorlist-grid/`} component={TCTTutorListGrid}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-bulk-upload/`} component={TCTTutorBulkUpload}></Route>
       <Route
  exact
  path={`${process.env.PUBLIC_URL}/tct-sales-bulk-upload`}
  component={TCTSalesBulkUpload}
/>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/completed-class-details/`}
          component={ClassAttendance}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/user-availability-list/`}
          component={TCTUserProfileLayout}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tctuser-skillset/`} component={TCTUserProfileLayout}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/tutors/tct-edittutor-attendance/`}
          component={EditTCTTutorAttendance}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-opr-list/`} component={TCTTutorOprList}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-payroll-list/`} component={TCTTutorPayroll}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-due-timings`} component={TCTDueTimings}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-schedule-calendar`} component={TCTScheduleCalendar}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-invoice-list/`} component={TCTTutorInvoiceList}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/tct-student-invoice-list/`}
          component={TCTStudentInvoiceList}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-tutor-calender/`} component={TCTTutorCalender}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tct-student-calendar/`} component={TCTStudentCalender}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/tutor-bank-details/`} component={TCTUserProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/chat-app/`} component={ChatApp}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/tutorprofile/`} component={TCTToturProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/tutorskillset/`} component={TCTToturProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/tutor-timeslot/`} component={TCTToturProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/student-schedule/`} component={StudentSchedule}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/demo-pending/`} component={DemoPending}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/need-to-schedule/`} component={NeedToSchedule}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/schedule-status/:slug/`} component={ScheduleStatusList}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/calendar/`} component={TCTOperationCalendar}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/mock-exams`} component={MockExams}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/view-calendar/`} component={TCTOperationsViewCalendar}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/my-calendar`}
          component={MyCalendar}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/operation/help`}
          component={SupportHelp}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/operation/ptm`}
          render={() => <OperationsHelpPlaceholder title="PTM" />}
        ></Route>
        {/* Tutor Change / Student Change requests; each page checks its menu permission (Role Permission). */}
        <Route exact path={`${process.env.PUBLIC_URL}/lms/change-request/tutor-change`} render={() => <ChangeRequestPage pageKey="tutorChange" />}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/change-request/student-change`} render={() => <ChangeRequestPage pageKey="studentChange" />}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/change-requests/students`} render={() => <OperationsChangeRequests key="students" pageKey="students" />}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/change-requests/tutors`} render={() => <OperationsChangeRequests key="tutors" pageKey="tutors" />}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/reports`} component={OperationsReports}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/operation/reports/:report`} component={OperationsReportView}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/accounts/reports`} component={AccountsReports}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/accounts/reports/:report`} component={AccountsReportView}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/assessment/question-paper-upload`}
          component={QuestionPaperUpload}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/assessment/my-tests`}
          component={StudentTestPapers}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/assessment/answer-sheet-evaluation`}
          component={AnswerSheetEvaluation}
        ></Route>

        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/tutors/tutor-invoice-details`}
          component={TutorInvoiceDetails}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/students/student-invoice-details`}
          component={StudentInvoiceDetails}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/user-profile-notification/`}
          component={UserProfileLayout}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/user-profile-activity/`} component={UserProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/user-password-change/`} component={TCTUserProfileLayout}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/`} component={LMSIndex}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/sales/enroll-a-student`} component={EnrollStudent}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/sales/enroll`} component={Enroll}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/app-chat`} component={Chat}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/app-chat1`} component={Chat1}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/sales/enrollment-history/`}
          component={EnrollmentHistory}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/users/coordinator-notification`}
          component={CoordinatorNotification}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/users/user-notification`}
          component={UserNotifications}
        ></Route>
        TCTUserNotificationList
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/users/coadmin-notification`}
          component={CoAdminNotification}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/student-profile/`} component={TCTStudentProfileLayout}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-activity-list/`}
          component={TCTStudentProfileLayout}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-availability-list/`}
          component={TCTStudentProfileLayout}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/student-profile-regular/`}
          component={StudentProfileLayout}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/master-data`} component={MastersData}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/masterdetails`} component={TypeCode}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/role-permission`} component={RolePermission}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/lms/update-permission`} component={PermissionTreeGrid}></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/threshold-config`} component={ThresholdConfig}></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/payment-percentage-config`}
          component={PaymentPercentageConfiguration}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/schedule/schedule-class`}
          component={ScheduleDemoAndClass}
        ></Route>
        <Route
          exact
          path={`${process.env.PUBLIC_URL}/lms/schedule/view-student-class`}
          component={ViewScheduledClass}
        ></Route>
        <Route exact path={`${process.env.PUBLIC_URL}/homepage`} component={Homepage}></Route>
        <Route component={RedirectAs404}></Route>
      </Switch>
    </Suspense>
  );
};
export default Pages;

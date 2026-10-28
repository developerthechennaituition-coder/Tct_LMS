import React from "react";
import { Switch, Route, withRouter } from "react-router-dom";
import { RedirectAs404 } from "./utils/Utils";
import PrivateRoute from "./route/PrivateRoute";

import Layout from "./layout/Index";

import Error404Classic from "./pages/error/404-classic";
import Error404Modern from "./pages/error/404-modern";
import Error504Modern from "./pages/error/504-modern";
import Error504Classic from "./pages/error/504-classic";

import Faq from "./pages/others/Faq";
import Terms from "./pages/others/Terms";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import PasswordReset from "./pages/auth/PasswordReset";
import Success from "./pages/auth/Success";
import EmailVerification from "./pages/auth/EmailVerification.js";
import InvoicePrint from "./pages/pre-built/invoice/InvoicePrint";
import TCTInvoicePrint from "./pages/lms/tutors/TCTInvoicePrint";
import TCTStudentInvoicePrint from "./pages/lms/students/TCTInvoicePrint";
import EnrollNewStudent from "./pages/lms/enrollment/EnrollStudentWithDetails.jsx";
import StudentRegsitration from "./pages/lms/enrollment/StudentRegistration.jsx";
import SelectStudent from "./pages/auth/SelectStudent";
import SessionExpiryMonitor from "./components/session/SessionExpiryMonitor";

const App = (props) => {
  return (
    <>
    <SessionExpiryMonitor />
    <Switch>
      {/* Auth Pages */}
      <Route exact path={`${process.env.PUBLIC_URL}/auth-success`} component={Success}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/auth-email-verification`} component={EmailVerification}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/auth-reset`} component={ForgotPassword}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/password-reset`} component={PasswordReset}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/auth-register`} component={Register}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/auth-login`} component={Login}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/select-student`} component={SelectStudent}></Route>
      
      {/* Print Pages */}
      <Route exact path={`${process.env.PUBLIC_URL}/lms/tutors/invoice-print`} component={TCTInvoicePrint}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/lms/students/invoice-print`} component={TCTStudentInvoicePrint}></Route>

      {/* Helper pages */}
      <Route exact path={`${process.env.PUBLIC_URL}/auths/terms`} component={Terms}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/auths/faq`} component={Faq}></Route>

      <Route exact path={`${process.env.PUBLIC_URL}/invoice-print`} component={InvoicePrint}></Route>

      {/*Error Pages*/}
      <Route exact path={`${process.env.PUBLIC_URL}/errors/404-classic`} component={Error404Classic}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/errors/504-modern`} component={Error504Modern}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/errors/404-modern`} component={Error404Modern}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/errors/504-classic`} component={Error504Classic}></Route>

      <Route exact path={`${process.env.PUBLIC_URL}/lms/sales/new-enroll`} component={EnrollNewStudent}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/student-registration`} component={StudentRegsitration}></Route>
      <Route exact path={`${process.env.PUBLIC_URL}/lms/student-registration`} component={StudentRegsitration}></Route>

      {/*Main Routes*/}
      <PrivateRoute exact path="" component={Layout}></PrivateRoute>
      <Route component={RedirectAs404}></Route>
    </Switch>
    </>
  );
};
export default withRouter(App);

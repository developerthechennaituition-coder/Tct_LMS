import React, { useState } from "react";
import {
  Block,
  Button,
  Icon,
  PreviewCard,
} from "../../components/Component";
import Logo from "../../images/TCTLoginPageLogo.png";
import LogoDark from "../../images/TCTLoginPageLogo.png";
import { Form, FormGroup, Spinner, Alert } from "reactstrap";
import PageContainer from "../../layout/page-container/PageContainer";
import Head from "../../layout/head/Head";
import AuthFooter from "./AuthFooter";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { AuthenticateLogin, GetMenuByUser } from "../../apiservices/AuthenticateService";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [passState, setPassState] = useState(false);
  const [errorVal, setError] = useState("");

  const { errors, register, handleSubmit } = useForm();

  const onFormSubmit = (formData) => {
  const inputData = formData;
  setLoading(true);
  setError("");

  AuthenticateLogin(inputData)
    .then((responseResult) => {
      const requiresStudentSelection =
        responseResult?.requiresStudentSelection ?? responseResult?.RequiresStudentSelection;

      const students =
        responseResult?.students ?? responseResult?.Students;

      const loginEmail =
        responseResult?.loginEmail ?? responseResult?.LoginEmail;

      // Case 1: Multiple students found for same email
      if (
        responseResult &&
        requiresStudentSelection === true &&
        students &&
        students.length > 1
      ) {
        localStorage.setItem(
          "pendingStudentSelection",
          JSON.stringify(students)
        );

        localStorage.setItem(
          "pendingLoginEmail",
          loginEmail || inputData.userName
        );

        localStorage.setItem(
          "studentList",
          JSON.stringify(responseResult.students)
        );
        setLoading(false);
        window.location.href = `${process.env.PUBLIC_URL}/select-student`;
        return;
      }

      // Case 2: Normal login success
      if (
        responseResult &&
        responseResult.userName != null &&
        responseResult.userName !== "" &&
        responseResult.email != null &&
        responseResult.email !== "" &&
        responseResult.token != null &&
        responseResult.token !== ""
      ) {
        localStorage.setItem("accessToken", responseResult.token);
        localStorage.setItem("refreshTokenExpiresAt", responseResult.refreshTokenExpiresAt || "");
        localStorage.setItem("userId", responseResult.userId);
        localStorage.setItem("userName", responseResult.userName);
        localStorage.setItem("email", responseResult.email);
        localStorage.setItem("userRole", responseResult.role);
        localStorage.setItem("roleId", responseResult.roleId);
        localStorage.setItem("nationality", responseResult.nationality);

        GetMenuByUser(responseResult.roleId).then((response) => {
          localStorage.setItem("MenuPermissions", JSON.stringify(response));
          let url = `${process.env.PUBLIC_URL}/`;
          window.location.href = url;
        });

        return;
      }

      setLoading(false);
      setError(responseResult?.message || responseResult?.Message || "Login failed. Please try again.");
    })
    .catch((error) => {
      setLoading(false);
      console.log(error);
      setError("Something went wrong. Please try again.");
    });
};

  return (
    <React.Fragment>
      <Head title="Login" />
      <PageContainer>
        {/* Login look only (scoped to .tct-login); form logic below is unchanged. */}
        <style>{`
          .tct-login {
            position: relative;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            overflow: hidden;
            background: linear-gradient(135deg, #f4efff 0%, #eef3ff 55%, #e8f8fb 100%);
          }
          .tct-login::before,
          .tct-login::after {
            content: "";
            position: absolute;
            border-radius: 50%;
            filter: blur(70px);
            pointer-events: none;
          }
          .tct-login::before { width: 420px; height: 420px; top: -120px; left: -100px; background: rgba(133, 79, 255, 0.22); }
          .tct-login::after { width: 380px; height: 380px; bottom: -120px; right: -80px; background: rgba(9, 194, 222, 0.18); }
          .tct-login > * { position: relative; z-index: 1; }

          .tct-login .nk-auth-body { padding-top: 48px; padding-bottom: 32px; }
          .tct-login .brand-logo { padding-bottom: 20px !important; }
          .tct-login .logo-img-lg { max-height: 72px; filter: drop-shadow(0 6px 12px rgba(44, 34, 87, 0.15)); }

          .tct-login .card {
            border: 1px solid rgba(133, 79, 255, 0.12) !important;
            border-radius: 16px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 14px 40px rgba(76, 31, 208, 0.10), 0 2px 6px rgba(31, 43, 58, 0.04);
          }
          .tct-login .card::before {
            content: "";
            display: block;
            height: 4px;
            background: linear-gradient(90deg, #854fff 0%, #6576ff 55%, #09c2de 100%);
          }
          .tct-login .card-inner-lg { padding: 32px 36px 28px; }
          .tct-login-heading { text-align: center; margin-bottom: 24px; }
          .tct-login-heading h4 { font-size: 22px; font-weight: 700; color: #2c2257; margin-bottom: 4px; }
          .tct-login-heading p { font-size: 13px; color: #8094ae; margin: 0; }

          .tct-login .form-label { font-size: 13px; font-weight: 600; color: #364a63; }
          .tct-login .form-control-wrap { position: relative; }
          .tct-login-field-icon {
            position: absolute; left: 14px; top: 0; height: 44px;
            display: flex; align-items: center;
            color: #8094ae; font-size: 17px; pointer-events: none; z-index: 2;
          }
          .tct-login .form-control-lg {
            height: 44px;
            padding-left: 42px;
            font-size: 14px;
            color: #364a63;
            background: #fafbff;
            border: 1px solid #dbdfea;
            border-radius: 10px;
            transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
          }
          .tct-login .form-control-lg::placeholder { color: #a3adc2; }
          .tct-login .form-control-lg:focus {
            background: #fff;
            border-color: #854fff;
            box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12);
          }
          .tct-login .form-control-wrap:focus-within .tct-login-field-icon { color: #854fff; }
          .tct-login .passcode-switch { height: 44px; display: flex; align-items: center; }
          .tct-login .link-primary { font-weight: 600; }

          .tct-login .btn-primary.btn-lg {
            height: 46px;
            border: 0;
            border-radius: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
            background: linear-gradient(90deg, #854fff 0%, #6a5cff 100%);
            box-shadow: 0 8px 20px rgba(133, 79, 255, 0.28);
            transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
          }
          .tct-login .btn-primary.btn-lg:hover:not(:disabled) {
            transform: translateY(-1px);
            filter: brightness(1.05);
            box-shadow: 0 10px 24px rgba(133, 79, 255, 0.34);
          }
          .tct-login .alert { border-radius: 10px; }
          .tct-login .nk-footer { background: transparent; border-top: 1px solid rgba(133, 79, 255, 0.1); box-shadow: none; }
        `}</style>
        <div className="tct-login">
        <Block className="nk-block-middle nk-auth-body wide-xs">
          <div className="brand-logo pb-4 text-center">
            <Link to={process.env.PUBLIC_URL + "/"} className="logo-link">
              <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
              <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
            </Link>
          </div>

          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
            <div className="tct-login-heading">
              <h4>Welcome back</h4>
              <p>Sign in to continue to The Chennai Tuition LMS</p>
            </div>
            {errorVal && (
              <div className="mb-3">
                <Alert color="danger" className="alert-icon">
                  <Icon name="alert-circle" /> {errorVal}
                </Alert>
              </div>
            )}

            <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
              <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    Email
                  </label>
                </div>
                <div className="form-control-wrap">
                  <span className="tct-login-field-icon"><Icon name="mail" /></span>
                  <input
                    type="text"
                    id="default-01"
                    name="userName"
                    ref={register({ required: "This field is required" })}
                    defaultValue=""
                    placeholder="Enter your email address"
                    className="form-control-lg form-control"
                    tabIndex="1"
                  />
                  {errors.userName && (
                    <span className="invalid">{errors.userName.message}</span>
                  )}
                </div>
              </FormGroup>

              <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <Link className="link link-primary link-sm" to={`${process.env.PUBLIC_URL}/auth-reset`}>
                    Forgot Password?
                  </Link>
                </div>

                <div className="form-control-wrap">
                  <span className="tct-login-field-icon"><Icon name="lock-alt" /></span>
                  <a
                    href="#password"
                    onClick={(ev) => {
                      ev.preventDefault();
                      setPassState(!passState);
                    }}
                    className={`form-icon lg form-icon-right passcode-switch ${
                      passState ? "is-hidden" : "is-shown"
                    }`}
                  >
                    <Icon name="eye" className="passcode-icon icon-show"></Icon>
                    <Icon name="eye-off" className="passcode-icon icon-hide"></Icon>
                  </a>

                  <input
                    type={passState ? "text" : "password"}
                    id="password"
                    name="password"
                    defaultValue=""
                    ref={register({ required: "This field is required" })}
                    placeholder="Enter your password"
                    className="form-control-lg form-control"
                    tabIndex="2"
                  />
                  {errors.password && (
                    <span className="invalid">{errors.password.message}</span>
                  )}
                </div>
              </FormGroup>

              <FormGroup>
                <Button
                  size="lg"
                  className="btn-block"
                  type="submit"
                  tabIndex="3"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" color="light" /> : "Sign in"}
                </Button>
              </FormGroup>
            </Form>
          </PreviewCard>
        </Block>
        <AuthFooter />
        </div>
      </PageContainer>
    </React.Fragment>
  );
};

export default Login;

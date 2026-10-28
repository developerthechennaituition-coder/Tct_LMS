import React, { useState } from "react";
import {
  Block,
  Icon,
  Button,
  PreviewCard,
} from "../../components/Component";
import Logo from "../../images/TCTLoginPageLogo.png";
import LogoDark from "../../images/TCTLoginPageLogo.png";
import { Form, FormGroup, Spinner, Alert } from "reactstrap";
import PageContainer from "../../layout/page-container/PageContainer";
import Head from "../../layout/head/Head";
import AuthFooter from "./AuthFooter";
import { useForm } from "react-hook-form";
import { useLocation, Link, useHistory } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";

import { ResetUserPassword } from "../../apiservices/AuthenticateService"

const PasswordReset = () => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userEmail = searchParams.get('email');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({    
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    userId: "00000000-0000-0000-0000-000000000000",
    email: userEmail,
});
const onFormSubmit = async () => {
  if (formData.newPassword.length < 6) {
    toast.error("Password length should be greater than or equal to 6.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });
    return;
  }

  if (formData.newPassword !== formData.confirmPassword) {
    toast.error("Password mismatch.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
      closeButton: <CloseButton />,
    });
    return;
  }

  try {
    setLoading(true);
    const response = await ResetUserPassword(formData);
    if (response?.succeeded) {
      toast.success("Password has been changed successfully.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      resetForm();
      window.setTimeout(() => history.replace("/auth-login"), 1200);
    } else {
      toast.error(response?.message || "Unable to reset the password.", {
        position: "top-right",
        autoClose: true,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
    }
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.message || "Unable to reset the password.");
  } finally {
    setLoading(false);
  }
};

const CloseButton = () => {
  return (
    <span className="btn-trigger toast-close-button" role="button">
      <Icon name="cross"></Icon>
    </span>
  );
};

const onFormCancel = () => {
  resetForm();
};

const resetForm = () => {
  setFormData({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    userId: "00000000-0000-0000-0000-000000000000",
    email: userEmail,
  });
};


  const { errors, register, handleSubmit } = useForm();

  return (
    <React.Fragment>
      <Head title="Reset Password" />
      <PageContainer>
        <Block className="nk-block-middle nk-auth-body  wide-xs">
          <div className="brand-logo pb-4 text-center">
            <Link to={process.env.PUBLIC_URL + "/"} className="logo-link">
              <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
              <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
            </Link>
          </div>

          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">  
            <Form className="is-alter" onSubmit={handleSubmit(onFormSubmit)}>
            <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    New Password
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    className="form-control"
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="Enter New Password"
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, newPassword: e.target.value });
                  }}
                    ref={register({ required: "New password is required" })}
                  />
                  <a href="#toggle-new-password" className="form-icon form-icon-right passcode-switch" onClick={(e) => { e.preventDefault(); setShowNewPassword((value) => !value); }}>
                    <Icon name={showNewPassword ? "eye-off" : "eye"} />
                  </a>
                  {errors.newPassword && <span className="invalid">{errors.newPassword.message}</span>}
                  </div>
                </FormGroup>
                <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    Confirm Password
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    className="form-control"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Enter Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                  }}
                    ref={register({ required: "Confirm password is required" })}
                  />
                  <a href="#toggle-confirm-password" className="form-icon form-icon-right passcode-switch" onClick={(e) => { e.preventDefault(); setShowConfirmPassword((value) => !value); }}>
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} />
                  </a>
                  {errors.confirmPassword && <span className="invalid">{errors.confirmPassword.message}</span>}
                </div>
                </FormGroup>
              <FormGroup>
              <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button color="primary" size="md" type="submit" disabled={loading}>
                      {loading ? <Spinner size="sm" color="light" /> : "Reset Password"}
                    </Button>  </li>
                  <li><a
                    href="#cancel"
                    onClick={(ev) => {
                      ev.preventDefault();
                      onFormCancel();
                    }}
                    className="link link-light"
                  >
                    Cancel
                  </a>                  
                  </li>
                </ul>
              </FormGroup>
            </Form>
            <div className="form-note-s2 text-center pt-4">
              <Link to={`${process.env.PUBLIC_URL}/auth-login`}>
                <strong>Return to login</strong>
              </Link>
            </div>
          </PreviewCard>
          <ToastContainer />
        </Block>
        <AuthFooter />
      </PageContainer>
    </React.Fragment>
  );
};
export default PasswordReset;

import React, { useState } from "react";
import {
  FormGroup,
  Form,
} from "reactstrap";
import {
  BlockTitle,
  Row,
  PreviewCard,
  Col,
  Icon,
  Button,
} from "../../../components/Component";
import { useForm } from "react-hook-form";
import { ChangeUserPassword } from "../../../apiservices/AuthenticateService";
import { logoutUser } from "../../../apiservices/UserService";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { stopChatConnection } from "../../../library/signalRRegistry";

const UserProfileSettingPage = () => {
  const [loading, setLoading] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [formData, setFormData] = useState({    
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    userId: localStorage.getItem("userId"),
    email: localStorage.getItem("email"),
});
const togglePasswordVisibility = (field) => {
  setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }));
};
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

  setLoading(true);
  try {
    const result = await ChangeUserPassword(formData);
    if (result?.succeeded) {
      resetForm();
      toast.success("Password changed successfully. Logging you out...", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: false,
        closeButton: <CloseButton />,
      });
      setTimeout(async () => {
        logoutUser(localStorage.getItem("userId"));
        await stopChatConnection();
        localStorage.removeItem("accessToken");
        window.location.href = `${process.env.PUBLIC_URL}/`;
      }, 2000);
    } else {
      toast.error(result?.message || "Password change failed.", {
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
    userId: localStorage.getItem("userId"),
    email: localStorage.getItem("email"),
  });
};


  const { errors, register, handleSubmit } = useForm();

  return (
    <div className="change-password">
      <BlockTitle tag="h4">Change Password</BlockTitle>
      <div>
        <PreviewCard>
        <Form className="is-alter" noValidate onSubmit={handleSubmit(onFormSubmit)}>
            <Row className="col-md-12">
              <Col md="6">
                <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    Current Password
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    name="currentPassword"
                    id="currentPassword"
                    className="form-control"
                    placeholder="Enter Current Password"
                    type={passwordVisibility.currentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    autoComplete="current-password"
                    onChange={(e) => {
                      setFormData({ ...formData, currentPassword: e.target.value });
                  }}
                    ref={register({ required: "This field is required" })}
                  />
                  <button
                    type="button"
                    className={`form-icon form-icon-right passcode-switch ${passwordVisibility.currentPassword ? "is-hidden" : "is-shown"}`}
                    onClick={() => togglePasswordVisibility("currentPassword")}
                    aria-label={`${passwordVisibility.currentPassword ? "Hide" : "Show"} current password`}
                    aria-pressed={passwordVisibility.currentPassword}
                  >
                    <Icon name="eye" className="passcode-icon icon-show" />
                    <Icon name="eye-off" className="passcode-icon icon-hide" />
                  </button>
                  {errors.currentPassword && <span className="invalid">{errors.currentPassword.message}</span>}
                </div>
                </FormGroup>
              </Col>
            </Row>

            <Row className="col-md-12">
              <Col md="6">
                <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    New Password
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    className="form-control"
                    type={passwordVisibility.newPassword ? "text" : "password"}
                    name="newPassword"
                    placeholder="Enter New Password"
                    value={formData.newPassword}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setFormData({ ...formData, newPassword: e.target.value });
                  }}
                    ref={register({ required: "This field is required" })}
                  />
                  <button
                    type="button"
                    className={`form-icon form-icon-right passcode-switch ${passwordVisibility.newPassword ? "is-hidden" : "is-shown"}`}
                    onClick={() => togglePasswordVisibility("newPassword")}
                    aria-label={`${passwordVisibility.newPassword ? "Hide" : "Show"} new password`}
                    aria-pressed={passwordVisibility.newPassword}
                  >
                    <Icon name="eye" className="passcode-icon icon-show" />
                    <Icon name="eye-off" className="passcode-icon icon-hide" />
                  </button>
                  {errors.newPassword && <span className="invalid">{errors.newPassword.message}</span>}
                  </div>
                </FormGroup>
              </Col>
            </Row>

            <Row className="col-md-12">
              <Col md="6">
                <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="default-01">
                    Confirm Password
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    className="form-control"
                    type={passwordVisibility.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Enter Confirm Password"
                    value={formData.confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                  }}
                    ref={register({ required: "This field is required" })}
                  />
                  <button
                    type="button"
                    className={`form-icon form-icon-right passcode-switch ${passwordVisibility.confirmPassword ? "is-hidden" : "is-shown"}`}
                    onClick={() => togglePasswordVisibility("confirmPassword")}
                    aria-label={`${passwordVisibility.confirmPassword ? "Hide" : "Show"} confirm password`}
                    aria-pressed={passwordVisibility.confirmPassword}
                  >
                    <Icon name="eye" className="passcode-icon icon-show" />
                    <Icon name="eye-off" className="passcode-icon icon-hide" />
                  </button>
                  {errors.confirmPassword && <span className="invalid">{errors.confirmPassword.message}</span>}
                </div>
                </FormGroup>
              </Col>
            </Row>
             <br></br>    
            <Row className="col-md-12">
              <Col md="6">   
                <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                  <li>
                    <Button color="primary" size="md" type="submit" disabled={loading}>
                      {loading ? "Changing Password..." : "Change Password"}
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
                  </a>   </li>
                </ul>      
              </Col>
            </Row>

        </Form>
        </PreviewCard>
        <ToastContainer />
      </div>
    </div>
  );
};

export default UserProfileSettingPage;

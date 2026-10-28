import React, { useState } from "react";
import { Block, BlockContent, BlockDes, BlockHead, BlockTitle, Button, PreviewCard, Icon } from "../../components/Component";
import Logo from "../../images/TCTLoginPageLogo.png";
import LogoDark from "../../images/TCTLoginPageLogo.png";
import { FormGroup, Form } from "reactstrap";
import PageContainer from "../../layout/page-container/PageContainer";
import Head from "../../layout/head/Head";
import AuthFooter from "./AuthFooter";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { ForgotPasswordAPI } from "../../apiservices/AuthenticateService"

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, errors, reset } = useForm();

  const onFormSubmit = (data) => {
    setLoading(true);
    ForgotPasswordAPI(data.email)
      .then((response) => {
        reset(); 
        if (response?.succeeded) {
          setLoading(false);
          toast.success("Check your mail to reset your password.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
          });
        } else {
          setLoading(false);
          toast.error(response?.message || "Unable to send the reset link.", {
            position: "top-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
          });
        }
      })
      .catch((error) => {
        setLoading(false);
        toast.error("An error occurred. Please try again.", {
          position: "top-right",
          autoClose: true,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: false,
        });
      });
  };

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };
  
  return (
    <React.Fragment>
      <Head title="Forgot-Password" />
      <PageContainer>
        <Block className="nk-block-middle nk-auth-body wide-xs">
          <div className="brand-logo pb-4 text-center">
            <Link to={process.env.PUBLIC_URL + "/"} className="logo-link">
              <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
              <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
            </Link>
          </div>
          <PreviewCard className="card-bordered" bodyClass="card-inner-lg">
            <BlockHead>
              <BlockContent>
                <BlockTitle tag="h5">Reset password</BlockTitle>
                <BlockDes>
                  <p>If you forgot your password, we’ll email you instructions to reset it.</p>
                </BlockDes>
              </BlockContent>
            </BlockHead>
            <Form className="is-alter" noValidate onSubmit={handleSubmit(onFormSubmit)}>
              <FormGroup>
                <div className="form-label-group">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                </div>
                <div className="form-control-wrap">
                  <input
                    name="email"
                    id="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    placeholder="Enter your email address"
                    ref={register({
                      required: "This field is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address",
                      },
                    })}
                  />
                  {errors.email && <span className="invalid">{errors.email.message}</span>}
                </div>
              </FormGroup>
              <FormGroup>
                <Button color="primary" size="lg" className="btn-block" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
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

export default ForgotPassword;

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Mail, ShieldCheck, ArrowRight, Loader } from "lucide-react";
import { Block, BlockContent, BlockDes, BlockHead, BlockTitle, Icon, PreviewCard } from "../../components/Component";
import { Card, Row, Col, Button, UncontrolledDropdown, DropdownMenu, DropdownItem, DropdownToggle } from "reactstrap";
import Logo from "../../images/TCTLoginPageLogo.png";
import LogoDark from "../../images/TCTLoginPageLogo.png";
import { Form, FormGroup, Spinner, Alert } from "reactstrap";
import PageContainer from "../../layout/page-container/PageContainer";
import Head from "../../layout/head/Head";
import AuthFooter from "./AuthFooter";
import { ConfirmEmail } from "../../apiservices/AuthenticateService";
import { Link } from "react-router-dom";
import axios from "axios";
import { useLocation } from "react-router-dom";

const EmailVerification = () => {
  const location = useLocation();
  const [countdown, setCountdown] = useState(15);
  const searchParams = new URLSearchParams(location.search);
  const [verificationStatus, setVerificationStatus] = useState("loading"); // loading, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const [startTimer, setStartTimer] = useState(false);

  useEffect(() => {
    const email = searchParams.get("email");
    if (!email) {
      setErrorMessage("This verification link is invalid or missing required information.");
      setVerificationStatus("error");
      return;
    }
    ConfirmEmail(email)
      .then((response) => {
        if (response.succeeded) {
          setVerificationStatus("success");
          setStartTimer(true); // Start timer only after successful verification
        } else {
          setErrorMessage(response.message || "Email confirmation failed. The link may be invalid or expired.");
          setVerificationStatus("error");
        }
      })
      .catch(() => {
        setErrorMessage("Email confirmation failed. The link may be invalid or expired.");
        setVerificationStatus("error");
      });
  }, []);

  useEffect(() => {
    let timer;
    let redirect;

    if (startTimer) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      redirect = setTimeout(() => {
        window.location.href = "/auth-login";
      }, 10000);
    }

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [startTimer]);

  //   useEffect(() => {
  //     // Start countdown
  //     const timer = setInterval(() => {
  //       setCountdown((prev) => {
  //         if (prev <= 1) {
  //           clearInterval(timer);
  //           // Redirect to login page
  //           window.location.href = "/auth-login";
  //           return 0;
  //         }
  //         return prev - 1;
  //       });
  //     }, 1000);

  //     // Cleanup timer on component unmount
  //     return () => clearInterval(timer);
  //   }, []);

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      fontFamily: "Arial, sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: "400px",
      padding: "32px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
      textAlign: "center",
    },
    iconContainer: {
      backgroundColor: "#dcfce7",
      borderRadius: "50%",
      padding: "12px",
      width: "fit-content",
      margin: "0 auto 24px auto",
    },
    heading: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#111827",
      marginBottom: "16px",
    },
    message: {
      color: "#4b5563",
      marginBottom: "24px",
      lineHeight: "1.5",
    },
    timer: {
      color: "#6b7280",
      fontSize: "14px",
      marginBottom: "24px",
    },
    button: {
      backgroundColor: "#2563eb",
      color: "white",
      padding: "8px 16px",
      borderRadius: "6px",
      border: "none",
      width: "100%",
      fontSize: "16px",
      fontWeight: "500",
      cursor: "pointer",
      marginBottom: "12px",
      transition: "background-color 0.2s",
    },
    secondaryButton: {
      backgroundColor: "white",
      color: "#4b5563",
      padding: "8px 16px",
      borderRadius: "6px",
      border: "1px solid #d1d5db",
      width: "100%",
      fontSize: "16px",
      fontWeight: "500",
      cursor: "pointer",
      marginBottom: "24px",
      transition: "background-color 0.2s",
    },
    support: {
      fontSize: "14px",
      color: "#6b7280",
    },
    link: {
      color: "#2563eb",
      textDecoration: "none",
      fontWeight: "500",
    },
    spinningLoader: {
      animation: "spin 1s linear infinite",
    },
  };
  return (
    <React.Fragment>
      <Head title="Login" />
      <PageContainer>
        <Block className="nk-block-middle nk-auth-body  wide-xs">
          <div className="brand-logo pb-4 text-center">
            <Link to={process.env.PUBLIC_URL + "/"} className="logo-link">
              <img className="logo-light logo-img logo-img-lg" src={Logo} alt="logo" />
              <img className="logo-dark logo-img logo-img-lg" src={LogoDark} alt="logo-dark" />
            </Link>
          </div>
          <PreviewCard>
            <Form className="is-alter">
              <div className="text-center">
                <div className="pricing-title  mx-auto">
                  {verificationStatus === "loading" && (
                    <>
                      <Loader className="spinningLoader" size={30} />
                      <BlockDes className="text-warning">
                        <p>Email verification inprogress...</p>
                      </BlockDes>
                    </>
                  )}
                  {verificationStatus === "success" && (
                    <>
                      <CheckCircle style={{ width: "48px", height: "48px", color: "#16a34a" }} />
                      <BlockDes className="text-success">
                        <p>Email Verified Successfully!</p>
                      </BlockDes>
                      <p style={styles.timer}>Redirecting to login page in {countdown} seconds...</p>
                    </>
                  )}
                  {verificationStatus === "error" && (
                    <>
                      <XCircle style={{ width: "48px", height: "48px", color: "#dc2626" }} />
                      <BlockDes className="text-danger">
                        <p>{errorMessage}</p>
                      </BlockDes>
                    </>
                  )}
                </div>
              </div>
              <FormGroup>
                <Button
                  size="lg"
                  className="btn-block"
                  onClick={() => (window.location.href = "/auth-login")}
                  color="primary"
                >
                  Login
                </Button>
              </FormGroup>
            </Form>
          </PreviewCard>
        </Block>
        <AuthFooter />
      </PageContainer>
    </React.Fragment>
  );
};

export default EmailVerification;

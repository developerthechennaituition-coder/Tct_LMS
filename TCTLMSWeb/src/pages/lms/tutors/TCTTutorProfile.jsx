import React, { useEffect, useState } from "react";
import Head from "../../../layout/head/Head";
import { ToastContainer } from "react-toastify";
import {
  Block,
  BlockBetween, 
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon, 
} from "../../../components/Component";
import classNames from "classnames";
import { getTCTUserById } from "../../../apiservices/UserService";
import { useLocation, Link } from "react-router-dom";
import EditTCTTutor from "./EditTCTTutor";
import { getTutorById } from "../../../apiservices/TutorService";

const TCTTutorProfile = ({ sm, updateSm, setProfileName }) => {
  const isStudentView = localStorage.getItem("roleId") === "14";
  const defaultGuid = "00000000-0000-0000-0000-000000000000";
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    fullName: "",
    lastName: "",
    userCode: "",
    email: "",
    phone: "",
    alternatePhone: "",
    dob: "",
    gender: "",
    designationId: "",
    userType: defaultGuid,
    isSystemUser: true,
    isAdminUser: false,
    createdBy: defaultGuid,
    createdDate: new Date(),
    isActive: true,
    addresses: {
      createdBy: defaultGuid,
      createdDate: new Date(),
      isActive: true,
      id: defaultGuid,
      userId: defaultGuid,
      addressLine1: "",
      addressLine2: "",
      addressLine3: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      isPrimary: true,
    },
  });
  useEffect(() => {    

    getTutorById(searchParams.get("id")).then(async (response) => {
      setFormData(response.data);
    }); 
  }, []);

  const submitCallback = () => {
    getTCTUserById(searchParams.get("id")).then(async (response) => {
      setFormData(response.data);
    });
  };

  const editTutorHandler = () => {
    setModal(true);
  };

  const editModalStateChange = (input) => {
    setModal(false);
  };

  const formClass = classNames({
    "form-validate": true,
    "is-alter": "alter",
  });

  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };

  return (
    <React.Fragment>
      <Head title="TCT - tutor info"></Head>
      <BlockHead size="lg">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h4">Tutor Informations</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent>
            <div className="toggle-wrap nk-block-tools-toggle">
              <div className="toggle-expand-content" style={{ display: "block" }}>
                <ul className="nk-block-tools g-3">
                  <Link
                    className="btn btn-outline-light bg-white d-none d-sm-inline-flex"
                    to={`${process.env.PUBLIC_URL}/tct-tutor-list`}
                  >
                    <em class="icon ni ni-arrow-left"></em>
                    <span> Back</span>
                  </Link>
                </ul>
              </div>
            </div>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>

      <Block>
        <div className="nk-data data-list">
          <div className="data-head">
            <h6 className="overline-title">Basics</h6>
          </div>
          <div
            className="data-item"
            onClick={() => {
              editTutorHandler();
            }}
          >
            <div className="data-col">
              <span className="data-label">Name</span>
              <span className="data-value">{formData.fullName}</span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div>
          </div>
          <div
            className="data-item"
            onClick={() => {
              editTutorHandler();
            }}
          >
            <div className="data-col">
              <span className="data-label">Designation</span>
              <span className="data-value">{formData.designationName}</span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div>
          </div>
          {!isStudentView && <div className="data-item">
            <div className="data-col">
              <span className="data-label">Email</span>
              <span className="data-value">{formData.email}</span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more disable">
                <Icon name="lock-alt"></Icon>
              </span>
            </div>
          </div>}
          {!isStudentView && <div
            className="data-item"
            onClick={() => {
              editTutorHandler();
            }}
          >
            <div className="data-col">
              <span className="data-label">Phone Number</span>
              <span className="data-value text-soft">{formData.phone}</span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div>
          </div>}
          <div
            className="data-item"
            onClick={() => {
              editTutorHandler();
            }}
          >
            <div className="data-col">
              <span className="data-label">Date of Birth</span>
              <span className="data-value">{new Date(formData.dob).toLocaleDateString()}</span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div>
          </div>
          <div
            className="data-item"
            onClick={() => {
              editTutorHandler();
            }}
          >
            <div className="data-col">
              <span className="data-label">Address</span>
              <span className="data-value">
                {formData?.address?.addressLine1}, {formData?.address?.addressLine2},
                <br />
                {formData?.address?.addressLine3}, {formData?.address?.city} - {formData?.address?.zipCode}
                <br />
                {formData?.address?.state}, {formData?.address?.country}
              </span>
            </div>
            <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div>
          </div>
        </div>
      </Block>
      {modal && (
        <EditTCTTutor
          tutorId={searchParams.get("id")}
          modalStateChange={editModalStateChange}
          modalOpen={modal}
          submitCallback={submitCallback}
          formData={formData}
        ></EditTCTTutor>
      )}
      <ToastContainer />
    </React.Fragment>
  );
};
export default TCTTutorProfile;

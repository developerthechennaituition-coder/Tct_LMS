import React, { useEffect, useState } from "react";
import Head from "../../../layout/head/Head";
import DatePicker from "react-datepicker";
import moment from "moment";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import {
  Modal, ModalBody, FormGroup, Form,
} from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Row,
  Col,
  Button,
  RSelect,
} from "../../../components/Component";
import classNames from "classnames";
import { getTCTUserById } from '../../../apiservices/UserService';
import { useLocation, Link } from 'react-router-dom';
import EditTCTUser from "./EditTCTUser";
import TimeZoneModal, { formatUtcOffset } from "./TimeZoneModal";
import { usePermissions } from "../../../hooks/usePermissions";

const TCTUserProfile = ({ sm, updateSm, setProfileName }) => {
  const { can } = usePermissions();
  const defaultGuid = '00000000-0000-0000-0000-000000000000';
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get('id'));
  const [modal, setModal] = useState(false);
  const openEditModal = () => {
    const isOwnProfile = id && id.toLowerCase() === localStorage.getItem("userId")?.toLowerCase();
    if (isOwnProfile || can("User List", "edit")) {
      setModal(true);
    }
  };
  const [formData, setFormData] = useState({
    id: defaultGuid,
    firstName: "",
    fullName: '',
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
    addresses:
    {
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
      isPrimary: true
    }
  });
  // Time zone: the user may set their own; staff may set a student's or tutor's (the server enforces the same rule).
  const [timeZoneModal, setTimeZoneModal] = useState(false);
  const isOwnTimeZone = !!id && id.toLowerCase() === localStorage.getItem("userId")?.toLowerCase();
  const isStudentOrTutor = formData.role === "Student" || formData.role === "Tutor";
  // Same role rule as the server (UserTimeZoneController): Super Admin (1) / Coordinator Admin (5) → students and tutors,
  // Coordinator (6) → students only; Super Admin also → Coordinator, Coordinator Admin, Operations and Operations Admin.
  // Menu permissions are not used (Tutors hold "Student List" edit).
  const viewerRoleId = localStorage.getItem("roleId");
  const canSetTimeZone = isOwnTimeZone
    || ((viewerRoleId === "1" || viewerRoleId === "5") && isStudentOrTutor)
    || (viewerRoleId === "6" && formData.role === "Student")
    || (viewerRoleId === "1" && ["Coordinator", "CoordinatorAdmin", "Operations", "OperationsAdmin"].includes(formData.role));
  const showTimeZonePrompt = isOwnTimeZone && isStudentOrTutor && formData.id !== defaultGuid && !formData.timeZoneId;
  const onTimeZoneSaved = (timeZoneId) => {
    setTimeZoneModal(false);
    setFormData((prev) => ({ ...prev, timeZoneId }));
    toast.success(timeZoneId ? "Time zone saved." : "Time zone cleared.", {
      position: "top-right",
      autoClose: true,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: false,
    });
  };
  const callerRoleId = localStorage.getItem("roleId");
  const hideContactDetails =
    (callerRoleId === "13" && formData.role === "Student") ||
    (callerRoleId === "14" && formData.role === "Tutor");
  useEffect(() => {
    getTCTUserById(searchParams.get('id')).then(async (response) => {
      if (response?.data) setFormData(response.data);
    });
  }, []);

  const submitCallback = () => {
    getTCTUserById(searchParams.get('id')).then(async (response) => {
      if (response?.data) setFormData(response.data);
    });
  }
  const formClass = classNames({
    "form-validate": true,
    "is-alter": 'alter',
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
      <Head title="User List - Profile"></Head>
      <BlockHead size="lg">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle tag="h5">

            </BlockTitle>
          </BlockHeadContent>
          {/* <BlockHeadContent>
            <div className="toggle-wrap nk-block-tools-toggle">
              <div className="toggle-expand-content" style={{ display: "block" }}>
                <ul className="nk-block-tools g-3">
                  <Link className="btn btn-outline-light bg-white d-none d-sm-inline-flex" to={`${process.env.PUBLIC_URL}/tct-user-list`}><em class="icon ni ni-arrow-left"></em><span> Back</span></Link>
                </ul>
              </div>
            </div>
          </BlockHeadContent> */}
        </BlockBetween>
        <BlockBetween>

          <BlockHeadContent>
            <BlockTitle tag="h4">{formData.role === "Student" ? "Student Information" : "My Informations"}</BlockTitle>
          </BlockHeadContent>

        </BlockBetween>
      </BlockHead>

      <Block>
        {showTimeZonePrompt && (
          <div className="alert alert-info d-flex flex-wrap align-items-center justify-content-between" role="status">
            <span className="mr-2">Set your preferred time zone for your profile.</span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setTimeZoneModal(true)}>
              Set time zone
            </button>
          </div>
        )}
        <div className="nk-data data-list">
          <div className="data-head">
            <h6 className="overline-title">Basics</h6>
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Name</span>
              <span className="data-value">{formData.fullName}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>
          {localStorage.getItem("roleId") != 14 && formData.role !== "Student" && <>
            <div className="data-item" onClick={openEditModal}>
              <div className="data-col">
                <span className="data-label">Designation</span>
                <span className="data-value">{formData.designationName}</span>
              </div>
              {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
            </div>
          </>}
          {!hideContactDetails && <div className="data-item">
            <div className="data-col">
              <span className="data-label">Email</span>
              <span className="data-value">{formData.email}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more disable">
                <Icon name="lock-alt"></Icon>
              </span>
            </div> */}
          </div>}
          {!hideContactDetails && <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Phone Number</span>
              <span className="data-value text-soft">{formData.phone}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>}
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Date of Birth</span>
              <span className="data-value">{new Date(formData.dob).toLocaleDateString()}</span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="icon ni ni-edit"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item" onClick={openEditModal}>
            <div className="data-col">
              <span className="data-label">Address</span>
              <span className="data-value">
                {(() => {
                  // Display only: join the address parts that have a value (no stray commas or dashes).
                  const a = formData?.address || {};
                  const part = (v) => (v == null ? "" : String(v).trim());
                  const join = (...values) => values.map(part).filter(Boolean).join(", ");
                  const cityLine = join(a.addressLine3, a.city);
                  const lines = [
                    join(a.addressLine1, a.addressLine2),
                    part(a.zipCode) ? (cityLine ? `${cityLine} - ${part(a.zipCode)}` : part(a.zipCode)) : cityLine,
                    join(a.state, a.country),
                  ].filter(Boolean);
                  return lines.length > 0
                    ? lines.map((line, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && <br />}
                          {line}
                        </React.Fragment>
                      ))
                    : <span className="text-soft">Not provided</span>;
                })()}
              </span>
            </div>
            {/* <div className="data-col data-col-end">
              <span className="data-more">
                <Icon name="forward-ios"></Icon>
              </span>
            </div> */}
          </div>
          <div className="data-item" onClick={canSetTimeZone ? () => setTimeZoneModal(true) : undefined}>
            <div className="data-col">
              <span className="data-label">Time zone</span>
              <span className="data-value">
                {formData.timeZoneId
                  ? `${formData.timeZoneId}${formatUtcOffset(formData.timeZoneId) ? ` (${formatUtcOffset(formData.timeZoneId)} now)` : ""}`
                  : <span className="text-soft">Not set</span>}
              </span>
            </div>
          </div>
        </div>
      </Block>
      {timeZoneModal &&
        <TimeZoneModal
          isOpen={timeZoneModal}
          userId={id}
          currentTimeZoneId={formData.timeZoneId || null}
          onClose={() => setTimeZoneModal(false)}
          onSaved={onTimeZoneSaved}
        />
      }
      {modal &&
        <EditTCTUser modalOpen={modal} onModalCloseCallback={() => {
          setModal(false);
        }} submitCallback={submitCallback} formData={formData}></EditTCTUser>
      }
      <ToastContainer />
    </React.Fragment>
  );
};
export default TCTUserProfile;

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
        </div>
      </Block>
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

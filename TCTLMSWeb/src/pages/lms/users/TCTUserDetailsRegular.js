import React, { useContext, useEffect, useState } from "react";
import { Card, Modal, ModalBody, Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import {
  Button,
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Col,
  Row,
  OverlineTitle,
  Sidebar,
  UserAvatar,
} from "../../../components/Component";
import { useHistory } from "react-router";
import Content from "../../../layout/content/Content";
import Head from "../../../layout/head/Head";
import { findUpper } from "../../../utils/Utils";
import { useLocation } from "react-router-dom";
import classnames from "classnames";
import { getTCTUserById } from "../../../apiservices/UserService";
import { getTutorById } from "../../../apiservices/TutorService";
import TutorSkillset from "../tutors/TutorSkillset";
import UserAvailability from "./UserAvailability";
import countryList from "react-select-country-list";
import "./TCTUserDetailsRegular.css";

// Display helpers (formatting only).
const formatDate = (value, withTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date) || date.getFullYear() < 1900) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};
const countryName = (code) => (code ? countryList().getLabel(code) || code : "");

const InfoItem = ({ label, value, wide }) => (
  <div className={`tct-ud-item${wide ? " is-wide" : ""}`}>
    <span className="tct-ud-label">{label}</span>
    <span className={`tct-ud-value${value ? "" : " is-empty"}`}>{value || "Not provided"}</span>
  </div>
);

const TCTUserDetailsPage = ({ match }) => {
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState("");
  const [designation, setDesignation] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [sideBar, setSidebar] = useState(false);
  const [addNoteModal, setAddNoteModal] = useState(false);
  const [addNoteText, setAddNoteText] = useState("");
  const history = useHistory();
  const [activeTab, setActiveTab] = useState("1");
  const [loadError, setLoadError] = useState("");

  // grabs the id of the url and loads the corresponding data
  useEffect(() => {
    getUserData();

    getTutorById(searchParams.get("id"))
      .then((response) => {
        const tutor = response?.data?.data ?? response?.data;
        if (!tutor) {
          setLoadError("Tutor details could not be found.");
          return;
        }
        setFormData(tutor);
      })
      .catch(() => setLoadError("Tutor details could not be loaded. Please try again."));
  }, []);

  const sidebarToggle = (tab) => {
    setSidebar(!sideBar);
  };
  // function to toggle sidebar
  const toggle = (tab) => {
    if (activeTab !== tab) setActiveTab(tab);
  };
  const getUserData = () => {
    getTCTUserById(searchParams.get("userId"))
      .then((response) => {
        const user = response?.data?.data ?? response?.data;
        if (!user) return;
        setProfileName(user.fullName ?? "");
        if (user.fileData) {
          setImageUrl(`data:image/jpeg;base64, ${user.fileData}`);
        }
        setPhone(user.phone ?? "");
        setEmailAddress(user.email ?? "");
        setDesignation(user.designationName ?? "");
      })
      .catch(() => setLoadError("User details could not be loaded. Please try again."));
  };

  return (
    <React.Fragment>
      <Head title="User Details - Regular"></Head>
      {loadError && (
        <Content>
          <div className="alert alert-danger mt-4">{loadError}</div>
        </Content>
      )}
      {!loadError && formData && (
        <Content>
          <div className="tct-ud">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle tag="h3" page>
                  <strong className="text-primary small">{profileName}</strong>
                </BlockTitle>
                <BlockDes className="tct-ud-crumb">
                  <span>Tutor Profile</span>
                  {formData?.userCode && <span className="tct-ud-chip is-code">{formData.userCode}</span>}
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <Button
                  color="light"
                  outline
                  className="bg-white d-none d-sm-inline-flex"
                  onClick={() => history.goBack()}
                >
                  <Icon name="arrow-left"></Icon>
                  <span>Back</span>
                </Button>
                <a
                  href="#back"
                  onClick={(ev) => {
                    ev.preventDefault();
                    history.goBack();
                  }}
                  className="btn btn-icon btn-outline-light bg-white d-inline-flex d-sm-none"
                >
                  <Icon name="arrow-left"></Icon>
                </a>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            <Card className="card-bordered">
              <div className="card-aside-wrap" id="user-detail-block">
                <div className="card-content">
                  <Nav tabs className="nav-tabs-mb-icon nav-tabs-card">
                    <NavItem>
                      <NavLink
                        tag="a"
                        href="#tab"
                        className={classnames({ active: activeTab === "1" })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggle("1");
                        }}
                      >
                        <Icon name="user-circle"></Icon>
                        <span>Personal</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        tag="a"
                        // disabled={id == defaultGuid}
                        href="#tab"
                        className={classnames({ active: activeTab === "2" })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggle("2");
                        }}
                      >
                        <Icon name="book-read"></Icon>
                        <span>Skill sets</span>
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        tag="a"
                        // disabled={id == defaultGuid}
                        href="#tab"
                        className={classnames({ active: activeTab === "3" })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggle("3");
                        }}
                      >
                        <Icon name="calendar"></Icon>
                        <span>Availability</span>
                      </NavLink>
                    </NavItem>
                    {/* <NavItem>
                      <NavLink
                        tag="a"
                        // disabled={id == defaultGuid}
                        href="#tab"
                        className={classnames({ active: activeTab === "4" })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggle("4");
                        }}
                      >
                        <Icon name="bell"></Icon>
                        Notifications
                      </NavLink>
                    </NavItem> */}
                    <NavItem>
                      {" "}
                      <NavLink
                        tag="a"
                        // disabled={id == defaultGuid}
                        href="#tab"
                        className={classnames({ active: activeTab === "5" })}
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggle("5");
                        }}
                      >
                        <Icon name="activity"></Icon>
                        <span>Activities</span>
                      </NavLink>
                    </NavItem>
                    <li className="nav-item nav-item-trigger d-xxl-none">
                      <Button className={`toggle btn-icon btn-trigger ${sideBar && "active"}`} onClick={sidebarToggle}>
                        <Icon name="user-list-fill"></Icon>
                      </Button>
                    </li>
                  </Nav>
                  <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                      <div className="card-inner tct-ud-info">
                        <section className="tct-ud-section">
                          <div className="tct-ud-section-head">
                            <span className="tct-ud-section-icon"><Icon name="user-circle"></Icon></span>
                            <div>
                              <h6>Personal Details</h6>
                              <p>Basic information and contact details</p>
                            </div>
                          </div>
                          <div className="tct-ud-grid">
                            <InfoItem label="Title" value="Mr." />
                            <InfoItem label="Full Name" value={formData?.fullName} />
                            <InfoItem label="Gender" value={formData?.gender} />
                            <InfoItem label="First Name" value={formData?.firstName} />
                            <InfoItem label="Last Name" value={formData?.lastName} />
                            <InfoItem label="Surname" value={formData?.name?.split(" ")[1] || formData?.lastName} />
                            <InfoItem label="Date of Birth" value={formatDate(formData?.dob)} />
                            <InfoItem label="Mobile Number" value={formData?.phone} />
                            <InfoItem label="Alternate Number" value={formData?.alternatePhone} />
                            <InfoItem label="Email Address" value={formData?.email} wide />
                          </div>
                        </section>
                        <section className="tct-ud-section">
                          <div className="tct-ud-section-head">
                            <span className="tct-ud-section-icon"><Icon name="info"></Icon></span>
                            <div>
                              <h6>Additional Information</h6>
                              <p>Joining and nationality details</p>
                            </div>
                          </div>
                          <div className="tct-ud-grid">
                            <InfoItem label="Joining Date" value={formatDate(formData?.joiningDate)} />
                            <InfoItem label="Country" value={countryName(formData?.country)} />
                            <InfoItem label="Nationality" value={countryName(formData?.country)} />
                          </div>
                        </section>
                        <section className="tct-ud-section">
                          <div className="tct-ud-section-head">
                            <span className="tct-ud-section-icon"><Icon name="map-pin"></Icon></span>
                            <div>
                              <h6>Address</h6>
                              <p>Residential address on record</p>
                            </div>
                          </div>
                          <div className="tct-ud-grid">
                            <InfoItem label="Address Line 1" value={formData?.address?.addressLine1} />
                            <InfoItem label="Address Line 2" value={formData?.address?.addressLine2} />
                            <InfoItem label="Address Line 3" value={formData?.address?.addressLine3} />
                            <InfoItem label="City" value={formData?.address?.city} />
                            <InfoItem label="State" value={formData?.address?.state} />
                            <InfoItem label="Country" value={countryName(formData?.address?.country)} />
                            <InfoItem label="Zip Code" value={formData?.address?.zipCode} />
                          </div>
                        </section>
                      </div>
                    </TabPane>
                    <TabPane tabId="2">
                      <div className="card-inner tct-ud-skills-wrap">
                        <div className="tct-ud-section-head tct-ud-skills-head">
                          <span className="tct-ud-section-icon"><Icon name="book-read"></Icon></span>
                          <div>
                            <h6>Skill Sets</h6>
                            <p>Boards, grades and subjects this tutor can teach</p>
                          </div>
                        </div>
                        {activeTab === "2" && (
                          <div className="tct-ud-skills">
                            <TutorSkillset tutorId={searchParams.get("userId")}></TutorSkillset>
                          </div>
                        )}
                      </div>
                    </TabPane>
                    <TabPane tabId={"3"}>
                      <div className="card-inner tct-ud-skills-wrap">
                        <div className="tct-ud-section-head tct-ud-skills-head">
                          <span className="tct-ud-section-icon"><Icon name="calendar"></Icon></span>
                          <div>
                            <h6>Availability</h6>
                            <p>Weekly time slots when this tutor is available</p>
                          </div>
                        </div>
                        {activeTab == "3" && (
                          <div className="tct-ud-avail">
                            <UserAvailability navigationType="page"></UserAvailability>
                          </div>
                        )}
                      </div>
                    </TabPane>
                  </TabContent>
                </div>

                <Modal
                  isOpen={addNoteModal}
                  toggle={() => setAddNoteModal(false)}
                  className="modal-dialog-centered"
                  size="lg"
                >
                  <ModalBody>
                    <a
                      href="#cancel"
                      onClick={(ev) => {
                        ev.preventDefault();
                        setAddNoteModal(false);
                        setAddNoteText("");
                      }}
                      className="close"
                    >
                      <Icon name="cross-sm"></Icon>
                    </a>
                    <div className="p-2">
                      <h5 className="title">Add Admin Note</h5>
                      <div className="mt-4 mb-4">
                        <textarea
                          defaultValue={addNoteText}
                          className="form-control no-resize"
                          onChange={(e) => setAddNoteText(e.target.value)}
                        />
                      </div>
                      <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
                        <li>
                          <Button color="primary" size="md" type="submit">
                            Add Note
                          </Button>
                        </li>
                        <li>
                          <Button onClick={() => setAddNoteModal(false)} className="link link-light">
                            Cancel
                          </Button>
                        </li>
                      </ul>
                    </div>
                  </ModalBody>
                </Modal>

                <Sidebar toggleState={sideBar}>
                  <div className="tct-ud-side">
                    <div className="tct-ud-profile">
                      <UserAvatar className="lg" theme="primary" text={findUpper(formData?.fullName)} />
                      <h5>{formData?.fullName}</h5>
                      <div className="tct-ud-chips">
                        {formData?.role && <span className="tct-ud-chip">{formData.role}</span>}
                        {formData?.userCode && <span className="tct-ud-chip is-code">{formData.userCode}</span>}
                      </div>
                      <span className="tct-ud-profile-email">{formData?.email}</span>
                    </div>
                    <div className="tct-ud-side-section tct-ud-tools">
                      <ul className="btn-toolbar justify-center gx-1">
                        <li>
                          <Button
                            href="#tool"
                            onClick={(ev) => {
                              ev.preventDefault();
                            }}
                            className="btn-trigger btn-icon"
                          >
                            <Icon name="shield-off"></Icon>
                          </Button>
                        </li>
                        <li>
                          <Button
                            href="#mail"
                            onClick={(ev) => {
                              ev.preventDefault();
                            }}
                            className="btn-trigger btn-icon"
                          >
                            <Icon name="mail"></Icon>
                          </Button>
                        </li>
                        <li>
                          <Button
                            href="#download"
                            onClick={(ev) => {
                              ev.preventDefault();
                            }}
                            className="btn-trigger btn-icon"
                          >
                            <Icon name="download-cloud"></Icon>
                          </Button>
                        </li>
                        <li>
                          <Button
                            href="#bookmark"
                            onClick={(ev) => {
                              ev.preventDefault();
                            }}
                            className="btn-trigger btn-icon"
                          >
                            <Icon name="bookmark"></Icon>
                          </Button>
                        </li>
                        <li>
                          <Button
                            href="#cancel"
                            onClick={(ev) => {
                              ev.preventDefault();
                            }}
                            className="btn-trigger btn-icon text-danger"
                          >
                            <Icon name="na"></Icon>
                          </Button>
                        </li>
                      </ul>
                    </div>
                    <div className="tct-ud-side-section">
                      <h6>In Account</h6>
                      <div className="tct-ud-balance">
                        <div>
                          <div className="tct-ud-balance-amount">
                            2,500.00 <small>USD</small>
                          </div>
                          <div className="tct-ud-balance-label">Invested Amount</div>
                        </div>
                        <span className="tct-ud-balance-plus"><Icon name="plus"></Icon></span>
                        <div>
                          <div className="tct-ud-balance-amount">1,643.76</div>
                          <div className="tct-ud-balance-label">Profit Earned</div>
                        </div>
                      </div>
                    </div>
                    <div className="tct-ud-side-section">
                      <div className="tct-ud-stats">
                        <div>
                          <span className="tct-ud-stat-value">{formData?.tasks ?? "—"}</span>
                          <span className="tct-ud-stat-label">Total Order</span>
                        </div>
                        <div>
                          <span className="tct-ud-stat-value">{formData?.projects ?? "—"}</span>
                          <span className="tct-ud-stat-label">Complete</span>
                        </div>
                        <div>
                          <span className="tct-ud-stat-value">{formData?.performed ?? "—"}</span>
                          <span className="tct-ud-stat-label">Progress</span>
                        </div>
                      </div>
                    </div>
                    <div className="tct-ud-side-section">
                      <h6>Contact</h6>
                      <div className="tct-ud-contact">
                        <span className="tct-ud-contact-icon"><Icon name="mail"></Icon></span>
                        <span className={formData?.email ? "" : "is-empty"}>{formData?.email || "Not provided"}</span>
                      </div>
                      <div className="tct-ud-contact">
                        <span className="tct-ud-contact-icon"><Icon name="call"></Icon></span>
                        <span className={formData?.phone ? "" : "is-empty"}>{formData?.phone || "Not provided"}</span>
                      </div>
                    </div>
                    <div className="tct-ud-side-section">
                      <h6>Account</h6>
                      <dl className="tct-ud-facts">
                        <div>
                          <dt>Tutor Code</dt>
                          <dd>{formData?.userCode || <span className="is-empty">Not provided</span>}</dd>
                        </div>
                        <div>
                          <dt>Designation</dt>
                          <dd>{formData?.designationName || <span className="is-empty">Not provided</span>}</dd>
                        </div>
                        <div>
                          <dt>User ID</dt>
                          <dd>UD003054</dd>
                        </div>
                        <div>
                          <dt>Last Login</dt>
                          <dd>{formatDate(formData?.lastLogin, true) || <span className="is-empty">Not available</span>}</dd>
                        </div>
                        <div>
                          <dt>KYC Status</dt>
                          <dd>
                            {formData?.kycStatus ? (
                              <span
                                className={`lead-text text-${
                                  formData?.kycStatus === "success"
                                    ? "success"
                                    : formData?.kycStatus === "pending"
                                    ? "info"
                                    : formData.kycStatus === "warning"
                                    ? "warning"
                                    : "secondary"
                                }`}
                              >
                                {formData?.kycStatus?.toUpperCase()}
                              </span>
                            ) : (
                              <span className="is-empty">Not available</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Register At</dt>
                          <dd>Nov 24, 2019</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="tct-ud-side-section">
                      <h6>Groups</h6>
                      <ul className="tct-ud-tags">
                        {["investor", "support", "another tag"].map((tag) => (
                          <li key={tag} className="btn-group">
                            <Button
                              color="light"
                              size="xs"
                              className="btn-dim"
                              onClick={(ev) => {
                                ev.preventDefault();
                              }}
                            >
                              {tag}
                            </Button>
                            <Button
                              color="light"
                              size="xs"
                              className="btn-icon btn-dim"
                              onClick={(ev) => {
                                ev.preventDefault();
                              }}
                            >
                              <Icon className="ni-cross"></Icon>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Sidebar>
                {sideBar && <div className="toggle-overlay" onClick={() => sidebarToggle()}></div>}
              </div>
            </Card>
          </Block>
          </div>
        </Content>
      )}
    </React.Fragment>
  );
};
export default TCTUserDetailsPage;

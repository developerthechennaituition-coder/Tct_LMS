import React, { useState, useEffect } from "react";

import Content from "../../../layout/content/Content";
import StudentProfileRegularPage from "./StudentProfile";
import StudentProfileSettingPage from "./StudentProfileSetting";
import UserProfileNotificationPage from "./StudentProfileNotification";
import UserProfileActivityPage from "./StudentProfileActivity";
import { Route, Switch, Link } from "react-router-dom";
import { Icon, UserAvatar } from "../../../components/Component";
import UserAvatar1 from "../../../components/user/UserAvatar1"
import { findUpper1 } from "../../../utils/Utils";
import { Card, DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";
import { useParams } from 'react-router-dom';
import StudentEnrolledCourses from "./StudentEnrolledCourses";
import { getStudent } from "../../../apiservices/StudentEnrollmentService";
import ProfilePhoto from "../../components/ProfilePhoto";

import { useLocation } from 'react-router-dom';

const StudentProfileLayout = () => {
  const [imageUrl, setImageUrl] = useState('')
  const [modalOpen, setModalOpen] = useState(false);
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get('id'));
  // function to change the design view under 990 px
  const viewChange = () => {
    if (window.innerWidth < 990) {
      setMobileView(true);
    } else {
      setMobileView(false);
      updateSm(false);
    }
  };

  useEffect(() => {
    getStudentData();
    viewChange();
    const name = searchParams.get('id');
    setId(name);
    window.addEventListener("load", viewChange);
    window.addEventListener("resize", viewChange);
    document.getElementsByClassName("nk-header")[0].addEventListener("click", function () {
      updateSm(false);
    });
    return () => {
      window.removeEventListener("resize", viewChange);
      window.removeEventListener("load", viewChange);
    };
  }, []);

  const getStudentData = () => {
    getStudent(id).then(async (response) => {      
      if (response.data.fileData != null && response.data.fileData != "") {
        setImageUrl(`data:image/jpeg;base64, ${response.data.fileData}`);
      }
      setProfileName(response?.data?.firstName);
      setEmailAddress(response?.data?.emailAddress);
    });
  };
  const profileUpdateCallback = () => {
    getStudentData();
    setModalOpen(false);
  };

  return (
    <React.Fragment>
      <Content>
        <Card className="card-bordered">
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${sm ? "content-active" : ""
                }`}
            >
              <div className="card-inner-group">
                <div className="card-inner">
                  <div className="user-card">
                    <UserAvatar1 image={imageUrl} text={findUpper1(profileName)} theme="primary" />
                    {/* <UserAvatar1 text={findUpper1(profileName)} theme="primary" /> */}
                    <div className="user-info">
                      <span className="lead-text">{profileName}</span>
                      <span className="sub-text">{emailAddress}</span>
                    </div>

                    {modalOpen &&
                      <ProfilePhoto modalOpen={modalOpen} fullName={profileName} id={id} modalCloseCallback={() => {
                        setModalOpen(false);
                      }} profileUpdateCallback={profileUpdateCallback}></ProfilePhoto>
                    }

                    <div className="user-action">
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-icon btn-trigger mr-n2">
                          <Icon name="more-v"></Icon>
                        </DropdownToggle>
                        <DropdownMenu right>
                          <ul className="link-list-opt no-bdr">
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setModalOpen(true);
                                }}
                              >
                                <Icon name="camera-fill"></Icon>
                                <span>Change Photo</span>
                              </DropdownItem>
                            </li>
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <Icon name="edit-fill"></Icon>
                                <span>Update Profile</span>
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </div>
                  </div>
                </div>

                <div className="card-inner p-0">
                  <ul className="link-list-menu">
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/student-profile-regular?id=${id}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/student-profile-regular` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>Personal Information</span>
                      </Link>
                    </li>
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/student-enrolled-courses?id=${id}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/student-enrolled-courses`
                            ? "active"
                            : ""
                        }
                      >
                        <Icon name="icon ni ni-book-fill"></Icon>
                        <span>Courses</span>
                      </Link>
                    </li>

                    {/* <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/user-profile-activity`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/user-profile-activity` ? "active" : ""
                        }
                      >
                        <Icon name="activity-round-fill"></Icon>
                        <span>Account Activity</span>
                      </Link>
                    </li>
                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/user-profile-setting`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/user-profile-setting` ? "active" : ""
                        }
                      >
                        <Icon name="lock-alt-fill"></Icon>
                        <span>Security Setting</span>
                      </Link>
                    </li> */}
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-inner">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <Switch>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/student-profile-regular`}
                  render={() => <StudentProfileRegularPage updateSm={updateSm} studentId={searchParams.get('id')} sm={sm} setProfileName={setProfileName} />}
                ></Route>
                <Route exact path={`${process.env.PUBLIC_URL}/student-enrolled-courses`}
                  render={() => <StudentEnrolledCourses studentId={searchParams.get('id')} updateSm={updateSm} sm={sm} />}
                ></Route>
              </Switch>
            </div>
          </div>
        </Card>
      </Content>
    </React.Fragment>
  );
};

export default StudentProfileLayout;

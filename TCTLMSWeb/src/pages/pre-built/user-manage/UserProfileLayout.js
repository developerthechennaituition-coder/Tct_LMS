import React, { useState, useEffect } from "react";
import Content from "../../../layout/content/Content";
import UserProfileRegularPage from "./UserProfileRegular";
import UserProfileSettingPage from "./UserProfileSetting";
import UserProfileNotificationPage from "./UserProfileNotification";
import UserProfileActivityPage from "./UserProfileActivity";
import { Route, Switch, Link } from "react-router-dom";
import { Block, Icon, UserAvatar } from "../../../components/Component";
import { findUpper } from "../../../utils/Utils";
import { getTCTUserById } from "../../../apiservices/UserService";
import { useLocation } from "react-router-dom";
import { Card, DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from "reactstrap";

const UserProfileLayout = () => {
  const [sm, updateSm] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [designation, setDesignation] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
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
    const name = searchParams.get("id");
    setId(name);

    getTCTUserById(searchParams.get("id")).then(async (response) => {
      //setFormData(response.data);
      setProfileName(response.data.fullName);
      setEmailAddress(response.data.email);
      setDesignation(response.data.designationName);
    });
    viewChange();
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

  return (
    <React.Fragment>
      <Content>
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
                      Personal
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
                      Skill sets
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
                      Availability
                    </NavLink>
                  </NavItem>
                  <NavItem>
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
                  </NavItem>
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
              </div>
            </div>
          </Card>
        </Block>
        <Card className="card-bordered">
          <div className="card-aside-wrap">
            <div
              className={`card-aside card-aside-left user-aside toggle-slide toggle-slide-left toggle-break-lg ${
                sm ? "content-active" : ""
              }`}
            >
              <div className="card-inner-group">
                <div className="card-inner">
                  <div className="user-card">
                    <UserAvatar text={findUpper(localStorage.getItem("userName"))} theme="primary" />
                    <div className="user-info">
                      <span className="lead-text">{localStorage.getItem("userName")}</span>
                      <span className="sub-text">{localStorage.getItem("email")}</span>
                    </div>
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
                        to={`${process.env.PUBLIC_URL}/tctuser-profile?id=${id}`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/tctuser-profile` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>Personal Information</span>
                      </Link>
                    </li>

                    <li onClick={() => updateSm(false)}>
                      <Link
                        to={`${process.env.PUBLIC_URL}/useractivity-list`}
                        className={
                          window.location.pathname === `${process.env.PUBLIC_URL}/useractivity-list` ? "active" : ""
                        }
                      >
                        <Icon name="user-fill-c"></Icon>
                        <span>User Activity</span>
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
                        <span>Change Password</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-inner card-inner-lg">
              {sm && mobileView && <div className="toggle-overlay" onClick={() => updateSm(!sm)}></div>}
              <Switch>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/user-profile-regular`}
                  render={() => <UserProfileRegularPage updateSm={updateSm} sm={sm} setProfileName={setProfileName} />}
                ></Route>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/user-profile-notification`}
                  render={() => <UserProfileNotificationPage updateSm={updateSm} sm={sm} />}
                ></Route>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/user-profile-activity`}
                  render={() => <UserProfileActivityPage updateSm={updateSm} sm={sm} />}
                ></Route>
                <Route
                  exact
                  path={`${process.env.PUBLIC_URL}/user-profile-setting`}
                  render={() => <UserProfileSettingPage updateSm={updateSm} sm={sm} />}
                ></Route>
              </Switch>
            </div>
          </div>
        </Card>
      </Content>
    </React.Fragment>
  );
};

export default UserProfileLayout;

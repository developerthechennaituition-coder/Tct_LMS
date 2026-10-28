import React, { useState, useEffect } from "react";
import { DropdownToggle, DropdownMenu, Dropdown } from "reactstrap";
import { Icon } from "../../../../components/Component";
import { LinkList, LinkItem } from "../../../../components/links/Links";
import UserAvatar1 from "../../../../components/user/UserAvatar1";
import { findUpper } from "../../../../utils/Utils";
import { getTCTUserById, logoutUser } from "../../../../apiservices/UserService";
import { useLocation } from "react-router-dom";
import { logoutSession } from "../../../../library/axios";

const User = () => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prevState) => !prevState);
  const [imageUrl, setImageUrl] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const studentList = JSON.parse(localStorage.getItem("studentList") || "[]");
  const handleSignout = () => {
    logoutUser(localStorage.getItem("userId"));
    logoutSession();
  };
  const handleSwitchStudent = (e) => {
    e.preventDefault();

    if (studentList && studentList.length > 1) {
      localStorage.setItem("pendingStudentSelection", JSON.stringify(studentList));
      window.location.href = `${process.env.PUBLIC_URL}/select-student`;
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  const getUserData = () => {
    getTCTUserById(localStorage.userId).then((response) => {
      if (response?.data?.fileData) {
        setImageUrl(`data:image/jpeg;base64, ${response.data.fileData}`);
      }
    });
  };

  return (
    <Dropdown isOpen={open} className="user-dropdown" toggle={toggle}>
      <DropdownToggle
        tag="a"
        href="#toggle"
        className="dropdown-toggle"
        onClick={(ev) => {
          ev.preventDefault();
        }}
      >
        <div className="user-toggle">
          <div className="user-avatar">
            <UserAvatar1 image={imageUrl} text={findUpper(localStorage.getItem("userName"))} theme="primary" />
          </div>
          <div className="user-info d-none d-md-block">
            <div className="user-status">{localStorage.getItem("userRole")}</div>
            <div className="user-name dropdown-indicator">{localStorage.getItem("userName")}</div>
          </div>
        </div>
      </DropdownToggle>
      <DropdownMenu right className="dropdown-menu-md dropdown-menu-s1">
        <div className="dropdown-inner user-card-wrap bg-lighter d-none d-md-block">
          <div className="user-card sm">
            <div className="user-avatar">
              <span>
                <UserAvatar1 image={imageUrl} text={findUpper(localStorage.getItem("userName"))} theme="primary" />
              </span>
            </div>
            <div className="user-info">
              <span className="lead-text">{localStorage.getItem("userName")}</span>
              <span className="sub-text">{localStorage.getItem("email")}</span>
            </div>
          </div>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            {/* link={`${process.env.PUBLIC_URL}/lms/user-details?id=${localStorage.getItem("userId")}&userId=${localStorage.getItem("userId")}`} */}
            {studentList.length > 1 && localStorage.getItem("userRole") === "Student" && (
              <a href="#switch-student" onClick={handleSwitchStudent}>
                <Icon name="users"></Icon>
                <span>Switch Student</span>
              </a>
            )}
            <LinkItem
              link={`${process.env.PUBLIC_URL}/tctuser-profile?id=${localStorage.getItem("userId")}`}
              icon="user-alt"
              onClick={toggle}
            >
              View Profile
            </LinkItem>
            {/* <LinkItem link="/user-profile-setting" icon="setting-alt" onClick={toggle}>
              Account Setting
            </LinkItem>
            <LinkItem link="/user-profile-activity" icon="activity-alt" onClick={toggle}>
              Login Activity
            </LinkItem> */}
          </LinkList>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            <a href="#signout" onClick={(event) => { event.preventDefault(); handleSignout(); }}>
              <Icon name="signout"></Icon>
              <span>Sign Out</span>
            </a>
          </LinkList>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
};

export default User;

import React, { useEffect, useState, useContext } from "react";
import SlideA from "../../../images/slides/slide-a.jpg";
import SlideB from "../../../images/slides/slide-b.jpg";
import SlideC from "../../../images/slides/slide-c.jpg";
import { UserAvatar, Icon, LinkList, LinkItem } from "../../../components/Component";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import SimpleBar from "simplebar-react";
import { findUpper } from "../../../utils/Utils";
import { ChatContext } from "./ChatContext";
import AddGroup from "./AddGroup";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor, getImageUrl } from "../../../utils/Utils";

// Group Info: member avatar colour + role label from the member's RoleId returned by the API
// (Roles table ids). One mapping for the whole panel.
const MEMBER_ROLE_STYLES = {
  14: { label: "Student", color: "#3B82F6" },
  13: { label: "Tutor", color: "#8B5CF6" },
  4: { label: "Operations", color: "#0D9488" },
  6: { label: "Coordinator", color: "#F59E0B" },
};
// Admin and other administrative/staff roles: SuperAdmin, SalesAdmin, OperationsAdmin, CoordinatorAdmin,
// AccountsAdmin, Accounts, PayrollAdmin, Payroll, HRAdmin, HR, Admin.
const ADMIN_ROLE_IDS = [1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 15];
const ADMIN_ROLE_COLOR = "#64748B";
const UNKNOWN_ROLE_COLOR = "#94A3B8"; // role not available: neutral, no label
// Canonical role names (Roles table) -> role id, used only if a response has the role name but no id.
const ROLE_ID_BY_NAME = {
  superadmin: 1, salesadmin: 2, operationsadmin: 3, operations: 4, coordinatoradmin: 5, coordinator: 6,
  accountsadmin: 7, accounts: 8, payrolladmin: 9, payroll: 10, hradmin: 11, hr: 12, tutor: 13, student: 14, admin: 15,
};
const memberRoleStyle = (user) => {
  const rawId = user?.roleId ?? user?.RoleId;
  const roleName = String(user?.role ?? user?.Role ?? "").trim().toLowerCase();
  const roleId = rawId !== null && rawId !== undefined && rawId !== "" ? Number(rawId) : ROLE_ID_BY_NAME[roleName];
  if (MEMBER_ROLE_STYLES[roleId]) return MEMBER_ROLE_STYLES[roleId];
  if (ADMIN_ROLE_IDS.includes(roleId)) return { label: user?.role || user?.Role || "Admin", color: ADMIN_ROLE_COLOR };
  return { label: "", color: UNKNOWN_ROLE_COLOR };
};

const ChatSideBar = ({ sidebar, chat }) => {
  const { changeNickname, changeTheme, userData, addUserToChat, deleteUser, makeAdmin } = useContext(ChatContext);
  const [modal, setModal] = useState(false);
  const [memberState, setMemberState] = useState(false);
  const [optionState, setOptionState] = useState(false);
  const [settingState, setSettingState] = useState(false);
  const [photoState, setPhotoState] = useState(false);
  const [editGroupName, setEditGroupName] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const [groupName, setGroupName] = useState(chat.nickname ? chat.nickname : chat.name);
  const [description, setDescription] = useState(chat.description || "");
  const loggedInUser = localStorage.getItem("userId");
  const [groupId, setGroupId] = useState(chat.id);
  useEffect(() => {
    if(chat.group){
      setGroupName(chat.groupName ? chat.groupName : chat.groupName); 
    }
    setGroupId(chat?.id);
  }, []);
  // Presentation-only styles for the Group Info panel (scoped to this panel).
  const groupInfoStyle = `
    .tct-group-info.nk-chat-profile { border-left: 1px solid #e5e9f2; }
    .tct-group-info .chat-profile { padding-bottom: 24px; }
    .tct-group-info .user-card-s2 {
      margin: 0 !important;
      padding: 28px 20px 20px;
      border-bottom: 1px solid #e5e9f2;
    }
    .tct-group-info .user-card-s2 .user-info { min-width: 0; max-width: 100%; }
    .tct-group-info .user-card-s2 .lead-text {
      font-size: 16px;
      font-weight: 700;
      color: #364a63;
      word-break: break-word;
    }
    .tct-group-info .user-card-s2 .sub-text { color: #8094ae; font-size: 13px; }
    .tct-group-info .tct-more-avatar span { color: #526484; font-weight: 600; }
    .tct-group-info .chat-profile-group { border-bottom: 1px solid #e5e9f2; }
    .tct-group-info .chat-profile-head { padding-left: 20px; padding-right: 20px; }
    .tct-group-info .chat-profile-head .overline-title { color: #526484; }
    .tct-group-info .chat-profile-body-inner { padding-left: 20px; padding-right: 20px; }
    .tct-group-info .tct-info-row {
      padding: 12px 14px;
      border: 1px solid #e5e9f2;
      border-radius: 8px;
      background: #fff;
    }
    .tct-group-info .tct-info-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #8094ae;
      margin-bottom: 4px;
    }
    .tct-group-info .tct-edit-icon { cursor: pointer; color: #8094ae; font-size: 16px; flex-shrink: 0; margin-left: 10px; }
    .tct-group-info .tct-edit-icon:hover { color: #6576ff; }
    .tct-group-info .tct-count-badge {
      display: inline-block;
      min-width: 22px;
      padding: 0 7px;
      margin-left: 6px;
      border-radius: 999px;
      background: #ebeef2;
      color: #526484;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
    }
    .tct-group-info .chat-members .add-opt {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px dashed #c9d2e3;
      border-radius: 8px;
      color: #6576ff;
    }
    .tct-group-info .chat-members .add-opt .sub-text { color: #6576ff; font-weight: 600; }
    .tct-group-info .chat-members .add-opt:hover { background: #f5f6ff; }
    .tct-group-info .chat-members .user-card {
      padding: 6px 8px;
      border-radius: 8px;
    }
    .tct-group-info .chat-members .user-card:hover { background: #f5f6fa; }
    .tct-group-info .chat-members .user-card > a { min-width: 0; flex: 1; }
    .tct-group-info .chat-members .user-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #364a63;
      font-weight: 500;
    }
    .tct-group-info .chat-members .user-role { color: #8094ae; font-size: 12px; }
    .tct-group-info .chat-members .tct-role-pill {
      flex-shrink: 0; margin-left: 8px; padding: 2px 8px; border-radius: 999px;
      font-size: 11px; font-weight: 600; line-height: 1.5; white-space: nowrap;
    }
  `;
  return (
    <SimpleBar className={`nk-chat-profile tct-group-info ${sidebar ? "visible" : ""}`}>
      <style>{groupInfoStyle}</style>
      <div className="user-card user-card-s2 my-4">
        {chat.group ? (
          <div className="user-avatar-group">
            {chat.user.slice(0, 3).map((user, index) => {
              return (
                <>
                  <UserAvatar1
                    className="chat-media"
                    image={getImageUrl(user)}
                    theme={memberRoleStyle(user).color}
                    text={findUpper1(user.name)}
                    key={index}
                  ></UserAvatar1>
                  {/* <UserAvatar1
                    group={true}
                    theme={user.theme}
                    text={findUpper(user.name)}
                    image={user.image}
                    size="md"
                    className="chat-media"
                    key={index}
                  ></UserAvatar1> */}
                </>
              );
            })}
            {chat.user.length > 3 && (
              <UserAvatar1
                className="chat-media tct-more-avatar"
                theme="#e5e9f2"
                text={`+${chat.user.length - 3}`}
              ></UserAvatar1>
              // <UserAvatar theme="bg-light" text={chat.user.length - 3} size="md" className="chat-media">

              // </UserAvatar>
            )}
          </div>
        ) : (
          <UserAvatar1
            className="chat-media"
            image={getImageUrl(chat)}
            theme={getColor(chat.name)}
            text={findUpper1(chat.name)}
          ></UserAvatar1>
          // <UserAvatar theme={chat.theme} image={chat.image} size="md" text={findUpper(chat.name)}></UserAvatar>
        )}
        <div className="user-info">
          {chat.group ? (
            <>
              <div className="lead-text">{chat.groupName ? chat.groupName : chat.groupName}</div>
            </>
          ) : (
            <>
              <div className="lead-text">{chat.nickname ? chat.nickname : chat.name}</div>
            </>
          )}
          {/* <h5>{chat.nickname ? chat.nickname : chat.name}</h5> */}
          {chat.group ? (
            <span className="sub-text">
              {chat.user?.length || 0} {chat.user?.length === 1 ? "member" : "members"}
            </span>
          ) : (
            <span className="sub-text">Active {chat.active === true ? "now" : `${chat.active} ago`} </span>
          )}
        </div>
        {!chat.group && (
          <UncontrolledDropdown className="user-card-menu">
            <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
              <Icon name="more-h"></Icon>
            </DropdownToggle>
            <DropdownMenu right>
              <LinkList opt className="no-bdr">
                <LinkItem link={"/user-details-regular/1"} icon="eye">
                  View Profile
                </LinkItem>
                <LinkItem link={""} tag="a" icon="na">
                  Block From System
                </LinkItem>
              </LinkList>
            </DropdownMenu>
          </UncontrolledDropdown>
        )}
      </div>
      <div className="chat-profile">
        <div className="chat-profile-group">
          <a
            href="#options"
            onClick={(ev) => {
              ev.preventDefault();
              setOptionState(!optionState);
            }}
            className={`chat-profile-head`}
            id="chat-options"
          >
            <h6 className="title overline-title">Options</h6>
            <span className="indicator-icon">
              <Icon name={`chevron-${optionState ? "up" : "down"}`}></Icon>
            </span>
          </a>
          <div className={`chat-profile-body collapse ${optionState ? "" : "show"}`} id="chat-options">
            <div className="chat-profile-body-inner">
              <ul className="chat-profile-options">
                {/* Group Name */}
                <li className="mb-3">
                  <div className="d-flex align-items-start tct-info-row">
                    <Icon className="icon icon-circle bg-light ni ni-users mt-1"></Icon>

                    <div className="ml-3 w-100">
                      <div className="tct-info-label">
                        {chat.group || chat.chatGroup ? "Group Name" : "Nickname"}
                      </div>

                      {!editGroupName ? (
                        <div className="d-flex align-items-center justify-content-between">
                          <div
                            style={{
                              fontSize: "15px",
                              color: "#364a63",
                              fontWeight: 400,
                              wordBreak: "break-word",
                            }}
                          >
                            {groupName}
                          </div>

                          <Icon
                            name="edit-alt-fill"
                            className="tct-edit-icon"
                            onClick={() => setEditGroupName(true)}
                          />
                        </div>
                      ) : (
                        <div className="d-flex align-items-center">
                          <input
                            autoFocus
                            type="text"
                            className="form-control border-0 shadow-none px-0"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            style={{
                              borderBottom: "2px solid #6576ff",
                              borderRadius: 0,
                              background: "transparent",
                              fontSize: "15px",
                            }}
                          />

                          <Icon
                            name="check"
                            style={{
                              cursor: "pointer",
                              color: "#6576ff",
                              fontSize: "22px",
                              marginLeft: "10px",
                            }}
                            onClick={() => {
                              changeNickname(chat.id, groupName, description, chat.group);
                              setEditGroupName(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>

                {/* Description */}
                <li>
                  <div className="d-flex align-items-start tct-info-row">
                    <Icon className="icon icon-circle bg-light ni ni-file-text mt-1"></Icon>

                    <div className="ml-3 w-100">
                      <div className="tct-info-label">
                        Description
                      </div>

                      {!editDescription ? (
                        <div className="d-flex align-items-start justify-content-between">
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#364a63",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              lineHeight: "20px",
                            }}
                          >
                            {description || "Add group description"}
                          </div>

                          <Icon
                            name="edit-alt-fill"
                            className="tct-edit-icon"
                            style={{ marginTop: "2px" }}
                            onClick={() => setEditDescription(true)}
                          />
                        </div>
                      ) : (
                        <div className="d-flex align-items-start">
                          <textarea
                            autoFocus
                            rows="3"
                            className="form-control border-0 shadow-none px-0"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{
                              borderBottom: "2px solid #6576ff",
                              borderRadius: 0,
                              resize: "none",
                              background: "transparent",
                              fontSize: "14px",
                            }}
                          />

                          <Icon
                            name="check"
                            style={{
                              cursor: "pointer",
                              color: "#6576ff",
                              fontSize: "22px",
                              marginLeft: "10px",
                              marginTop: "8px",
                            }}
                            onClick={() => {
                              changeNickname(chat.id, groupName, description, chat.group);
                              setEditDescription(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* .chat-profile-group */}
        {chat.group && (
          <div className="chat-profile-group">
            <a
              href="#member"
              onClick={(ev) => {
                setGroupId(chat?.Id);
                ev.preventDefault();
                setMemberState(!memberState);
              }}
              className="chat-profile-head"
            >
              <h6 className="title overline-title">
                Members
                <span className="tct-count-badge">{chat.user?.length || 0}</span>
              </h6>
              <span className="indicator-icon">
                <Icon name={`chevron-${memberState ? "up" : "down"}`}></Icon>
              </span>
            </a>
            <div className={`chat-profile-body collapse ${memberState ? "" : "show"}`} id="chat-photos">
              <div className="chat-profile-body-inner">
                <ul className="chat-members">
                  <li>
                    <UncontrolledDropdown>
                      <DropdownToggle
                        tag="a"
                        color="transparent"
                        className="chat-members-link add-opt"
                        href="#dropdown"
                        onClick={(ev) => {
                          ev.preventDefault();
                          setGroupId(chat?.id);
                          setModal(true);
                        }}
                      >
                        <Icon name="plus" className="icon-circle bg-light"></Icon>
                        <span className="sub-text">Add Member</span>
                      </DropdownToggle>
                      {/* <DropdownMenu>
                        <ul className="link-list-plain">
                          {userData.map((user, key) => {
                            return (
                              <li key={key}>
                                <DropdownItem
                                  tag="a"
                                  href="#dropdown"
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    addUserToChat(chat.id, user);
                                  }}
                                >
                                  <UserAvatar
                                    text={findUpper(user.name)}
                                    theme={user.theme}
                                    className="xs"
                                    image={null}
                                  />
                                  <div className="user-name">{user.name}</div>
                                </DropdownItem>
                              </li>
                            );
                          })}
                        </ul>
                      </DropdownMenu> */}
                    </UncontrolledDropdown>
                  </li>

                  <li>
                    {chat.user.map((user, idx) => {
                      return (
                        <div className="user-card" key={idx}>
                          <a href="#card" onClick={(ev) => ev.preventDefault()}>
                            {/* <UserAvatar
                              size="sm"
                              theme={user.theme}
                              image={user.image}
                              text={findUpper(user.name)}
                            ></UserAvatar> */}
                            <UserAvatar1
                              className="chat-media"
                              image={getImageUrl(user)}
                              theme={memberRoleStyle(user).color}
                              text={findUpper1(user.name)}
                            ></UserAvatar1>
                            <div className="user-name">{loggedInUser == user.id ? "You" : user.name}</div>
                            {memberRoleStyle(user).label && (
                              <div
                                className="user-role tct-role-pill"
                                style={{ color: memberRoleStyle(user).color, backgroundColor: `${memberRoleStyle(user).color}1A` }}
                              >
                                {memberRoleStyle(user).label}
                              </div>
                            )}
                          </a>
                          <div className="user-actions">
                            <UncontrolledDropdown>
                              <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
                                <Icon name="more-h"></Icon>
                              </DropdownToggle>
                              <DropdownMenu right>
                                <ul className="link-list-opt no-bdr">
                                  <li>
                                    <DropdownItem
                                      tag="a"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        deleteUser(chat.id, user.id);
                                      }}
                                      href="#delete"
                                    >
                                      Remove
                                    </DropdownItem>
                                  </li>
                                  <li>
                                    <DropdownItem
                                      tag="a"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        makeAdmin(chat.id, user.id);
                                      }}
                                      href="#make-admin"
                                    >
                                      Make Admin
                                    </DropdownItem>
                                  </li>
                                </ul>
                              </DropdownMenu>
                            </UncontrolledDropdown>
                          </div>
                        </div>
                      );
                    })}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {/* <div className="chat-profile-group">
          <a
            href="#settings"
            onClick={(ev) => {
              ev.preventDefault();
              setSettingState(!settingState);
            }}
            className="chat-profile-head"
          >
            <h6 className="title overline-title">Settings</h6>
            <span className="indicator-icon">
              <Icon name={`chevron-${settingState ? "up" : "down"}`}></Icon>
            </span>
          </a>
          <div className={`chat-profile-body collapse ${settingState ? "" : "show"}`} id="chat-settings">
            <div className="chat-profile-body-inner">
              <ul className="chat-profile-settings">
                <li>
                  <div className="custom-control custom-control-sm custom-switch">
                    <input type="checkbox" className="custom-control-input" id="customSwitch2" />
                    <label className="custom-control-label" htmlFor="customSwitch2">
                      Notifications
                    </label>
                  </div>
                </li>
                <li>
                  <a
                    className="chat-option-link"
                    href="#ignore"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <Icon className="icon icon-circle bg-light ni ni-bell-off-fill"></Icon>
                    <div>
                      <span className="lead-text">Ignore Messages</span>
                      <span className="sub-text">You won’t be notified when message you.</span>
                    </div>
                  </a>
                </li>
                <li>
                  <a
                    className="chat-option-link"
                    href="#feedback"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <Icon className="icon icon-circle bg-light ni ni-alert-fill"></Icon>
                    <div>
                      <span className="lead-text">Something Wrong</span>
                      <span className="sub-text">Give feedback and report conversion.</span>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div> */}
        {/* <div className="chat-profile-group">
          <a
            href="#shared"
            onClick={(ev) => {
              ev.preventDefault();
              setPhotoState(!photoState);
            }}
            className="chat-profile-head"
          >
            <h6 className="title overline-title">Shared Photos</h6>
            <span className="indicator-icon">
              <Icon name={`chevron-${photoState ? "up" : "down"}`}></Icon>
            </span>
          </a>
          <div className={`chat-profile-body collapse ${photoState ? "" : "show"}`} id="chat-photos">
            <div className="chat-profile-body-inner">
              <ul className="chat-profile-media">
                <li>
                  <a
                    href="#images"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <img src={SlideA} alt="" />
                  </a>
                </li>
                <li>
                  <a
                    href="#images"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <img src={SlideB} alt="" />
                  </a>
                </li>
                <li>
                  <a
                    href="#images"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <img src={SlideC} alt="" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div> */}

        {modal && (
          <AddGroup
            groupId={chat.id}
            modalStateChange={() => {
              setModal(false);
            }}
            modalOpen={modal}
            submitCallback={() => {}}
          ></AddGroup>
        )}
      </div>
    </SimpleBar>
  );
};
export default ChatSideBar;

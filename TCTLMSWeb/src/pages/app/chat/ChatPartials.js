import React, { useContext, useEffect, useState } from "react";
import { DropdownToggle, DropdownMenu, UncontrolledDropdown, DropdownItem } from "reactstrap";
import { Link } from "react-router-dom";
import { Icon, UserAvatar } from "../../../components/Component";
import { findUpper } from "../../../utils/Utils";
import { ChatContext } from "./ChatContext";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor, getImageUrl } from "../../../utils/Utils";
import { useHistory, useLocation } from "react-router-dom";
import ChatGroupMenu from "./ChatGroupMenu";
import MessageAttachment from "./MessageAttachment ";
import ImageViewer from "./ImageView";
import moment from "moment";
const getTick = (msg) => {
  if (msg.isRead) {
    return <span style={{ color: "#53bdeb" }}>✓✓</span>;
  }

  if (msg.isDelivered) {
    return <span>✓✓</span>;
  }

  return <span>✓</span>;
};

export const MeChat = ({ item, chat, onRemoveMessage, onOpenImageViewer, onMessageInfo }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  return (
    <>
      <div className="chat is-me">
        <div className="chat-content">
          <div className="chat-bubbles">
            {item.chat1.map((msg, idx) => {
              return (
                <div
                  className="chat-bubble position-relative"
                  key={idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {msg?.isDeleted === true ? (
                    <div className="chat-msg border bg-white text-muted">Message has been deleted</div>
                  ) : (
                    <React.Fragment>
                      <div className={`chat-msg bg-${chat.chatTheme}`}>
                        {hoverIndex === idx && (
                          <UncontrolledDropdown className="message-menu">
                            <DropdownToggle tag="a" className="btn btn-icon btn-sm">
                              <Icon name="chevron-down" />
                            </DropdownToggle>

                            <DropdownMenu right>
                              <DropdownItem onClick={() => onMessageInfo(msg)}>
                                <Icon name="info-fill" />
                                <span className="ml-2">Message Info</span>
                              </DropdownItem>

                              <DropdownItem onClick={() => onRemoveMessage(msg)}>
                                <Icon name="trash-fill" />

                                <span className="ml-2">Delete</span>
                              </DropdownItem>
                            </DropdownMenu>
                          </UncontrolledDropdown>
                        )}
                        <MessageAttachment msg={msg} onImageClick={onOpenImageViewer} />
                        {msg?.messageText && <div className="message-text">{msg.messageText}</div>}
                        <div className="message-footer">
                          <span className="message-time">{moment(msg.createdAt).format("HH:mm")}</span>
                          <span className="message-status">{getTick(msg)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export const YouChat = ({ item, chat, onOpenImageViewer, onCancelClass, onRescheduleClass, onPostponeClass }) => {
  return (
    <div className="chat is-you">
      <div className="chat-avatar">
        {chat.group ? (
          <UserAvatar1 className="chat-media" theme={getColor(item?.user?.name)} text={findUpper1(item?.user?.name)}>
            {chat.active ? (
              <span className="status dot dot-lg dot-success" />
            ) : (
              <span className="status dot dot-lg dot-gray" />
            )}
          </UserAvatar1>
        ) : (
          <UserAvatar1 className="chat-media" theme={getColor(chat?.nickname)} text={findUpper1(chat?.nickname)}>
            {chat.active ? (
              <span className="status dot dot-lg dot-success" />
            ) : (
              <span className="status dot dot-lg dot-gray" />
            )}
          </UserAvatar1>
        )}
      </div>

      <div className="chat-content">
        <div className="chat-bubbles">
          {item.chat1.map((msg, idx) => {
            return (
              <div className="chat-bubble" key={idx}>
                <div className="chat-msg">
                  {msg.isDeleted ? (
                    "Deleted"
                  ) : (
                    <>
                      <MessageAttachment msg={msg} onImageClick={onOpenImageViewer} />

                      {msg.messageText && <div className="mt-2">{msg.messageText}</div>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ul className="chat-meta align-items-center">
          <li>{item.date}</li>

          {(() => {
            const reminder = item.chat1.find((m) => m.scheduleDetailsId);
            if (!reminder) return null;

            return (
              <li className="ms-2">
                <div className="class-actions">
                  <button
                    className="btn btn-link btn-sm"
                    onClick={() => onRescheduleClass(reminder.scheduleDetailsId)}
                  >
                    <Icon name="calendar-alt" className="me-1" />
                    Reschedule
                  </button>

                  <button className="btn btn-link btn-sm" onClick={() => onPostponeClass(reminder.scheduleDetailsId)}>
                    <Icon name="clock" className="me-1" />
                    Postpone
                  </button>

                  <button
                    className="btn btn-link btn-sm text-danger"
                    onClick={() => onCancelClass(reminder.scheduleDetailsId)}
                  >
                    <Icon name="cross-circle" className="me-1" />
                    Cancel
                  </button>
                </div>
              </li>
            );
          })()}
        </ul>
      </div>
    </div>
  );
};

export const MetaChat = ({ item }) => {
  return (
    <div className="chat-sap">
      <div className="chat-sap-meta">
        <span>{item}</span>
      </div>
    </div>
  );
};

export const ChatItemHeader = ({ item }) => {
  return (
    <Link to={`${process.env.PUBLIC_URL}/app-chat`} className="chat-link">
      {item?.group === true ? (
        <div className="chat-media user-avatar user-avatar-multiple">
          {item.user.slice(0, 2).map((user, idx) => {
            return (
              <UserAvatar
                key={idx}
                theme={user?.theme}
                text={findUpper(user.name)}
                image={user?.image}
                className="chat-media"
              ></UserAvatar>
            );
          })}
          <span className={"status dot dot-lg dot-success"}></span>
        </div>
      ) : (
        <UserAvatar theme={item?.theme} text={findUpper(item?.name)} image={item?.image} className="chat-media">
          <span className={`status dot dot-lg dot-${item?.active === true ? "success" : "gray"}`}></span>
        </UserAvatar>
      )}
      <div className="chat-info">
        <div className="chat-from">
          <div className="name">{item.nickname ? item?.nickname : item?.name}</div>
          <span className="time">{item?.date}</span>
        </div>
        <div className="chat-context">
          <div className="text">
            <p>{item?.convo?.length !== 0 && item.convo[item?.convo?.length - 1].chat[0]}</p>
          </div>
          <div className="status delivered">
            <Icon
              name={`${item?.delivered === true ? "check-circle" : item?.delivered === "sent" ? "check-circle" : ""}`}
            ></Icon>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const ChatItem = ({ item, chatItemClick, setSelectedId, selectedId }) => {
  const { deleteConvo, propAction, selectedUserId } = useContext(ChatContext);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [selectedUID, setSelectedUID] = useState(searchParams.get("uid"));
  const checkBeforeDelete = (id, item) => {
    deleteConvo(id, item.group);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };
  const [itemBGColor, setItemBGColor] = useState();
  const menuData = [
    {
      name: "STD0103-Balaji-CBSE-Grade10",
      count: 2,
      items: [
        {
          id: "0AFF1F42-D8EA-4EF1-932B-AA23C3851983",
          groupName: "Accounts",
        },
        {
          id: "26198DAD-124D-4F44-B18F-BE2EC295996B",
          groupName: "Chemistry",
        },
      ],
    },
  ];
  return (
    <li className={`chat-item ${item?.unread ? "is-unread" : ""}`}>
      {/* <div className="chat-actions">
        <UncontrolledDropdown>
          <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
            <Icon name="more-h"></Icon>
          </DropdownToggle>
          <DropdownMenu right>
            <ul className="link-list-opt no-bdr">
              <li onClick={() => checkBeforeDelete(item.id, item)}>
                <DropdownItem
                  tag="a"
                  href="#delete"
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Delete
                </DropdownItem>
              </li>
              <li onClick={() => propAction(item?.id, "unread")}>
                <DropdownItem
                  tag="a"
                  href="#unread"
                  className={item?.unread ? "disabled" : ""}
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Mark as Unread
                </DropdownItem>
              </li>
              <li onClick={() => propAction(item?.id, "archive")}>
                <DropdownItem
                  tag="a"
                  href="#archive"
                  className={item?.archive ? "disabled" : ""}
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  Archive Message
                </DropdownItem>
              </li>
            </ul>
          </DropdownMenu>
        </UncontrolledDropdown>
      </div> */}
      {/* <WhatsAppGroupMenu
        menuData={menuData}
        selectedId={selectedId}
        onItemClick={(item) => {
          console.log(item);

          // setSelectedId(item.id);
        }}
      ></WhatsAppGroupMenu> */}
    </li>
  );
};

export const ContactItem = ({ item, setTab, setSelectedId, setGroup }) => {
  return (
    <ul className="contacts-list">
      <li>
        <h6 className="title overline-title-alt">{item?.contacts?.length > 0 && item.title}</h6>
      </li>
      {item?.contacts?.map((contact, idx) => {
        return (
          <li
            key={idx}
            onClick={() => {
              setTab("Chats");
              setGroup(false);
              setSelectedId(contact.id);
            }}
          >
            <div className="user-card">
              <a href="#card" onClick={(ev) => ev.preventDefault()}>
                <UserAvatar1
                  className="chat-media"
                  image={getImageUrl(contact)}
                  theme={getColor(contact?.nickname)}
                  text={findUpper1(contact?.nickname)}
                >
                  <span className={`status dot dot-lg dot-${contact.active === true ? "success" : "gray"}`}></span>
                </UserAvatar1>
                {/* <UserAvatar text={findUpper(contact.name)} theme={contact.theme} image={contact.image}></UserAvatar> */}
                <div className="user-name">{contact.name}</div>
              </a>
              <div className="user-actions">
                <Link to={`${process.env.PUBLIC_URL}/app-chat`}>Start Chat</Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

import React, { useState, useEffect, useContext } from "react";
import { Icon } from "../../../components/Component";
import { ChatContext } from "./ChatContext";
import * as signalR from "@microsoft/signalr";

const WhatsAppGroupMenu = ({ menuData = [], selectedId, onItemClick, chatItemClick, setSelectedId }) => {
  const [openGroup, setOpenGroup] = useState(null);
  const { chatState, chatDataSourceState, fav, changeChatUser, chatDataSource } = useContext(ChatContext);
  const [connection, setConnection] = useState(null);
  useEffect(() => {
    console.log("chatDataSource WhatsAppGroupMenu", chatDataSource);
  }, [chatDataSource]);
  const toggleGroup = (groupName) => {
    setOpenGroup((prev) => (prev === groupName ? null : groupName));
  };
  const truncateText = (text, maxLength = 50) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  return (
    <div className="wa-group-menu">
      {menuData.map((group, index) => {
        // A wrapper with a single conversation isn't a "subject folder" — it's
        // just one chat (e.g. a manually created group), so show it directly
        // instead of behind a collapsible "X Subjects" menu.
        if (group.items && group.items.length === 1) {
          const item = group.items[0];
          return (
            <div
              key={item.id}
              className={`wa-chat-item wa-group-header ${selectedId === item.id ? "selected" : ""}`}
              onClick={(ev) => {
                onItemClick(item);
                ev.preventDefault();
                setSelectedId(item.id);
                chatItemClick(item.id, item?.group, item);
              }}
            >
              <div className="wa-group-left">
                <div className="wa-group-avatar">
                  <Icon name={item?.group ? "users-fill" : "user-fill"} />
                </div>

                <div className="wa-group-info">
                  <div className="wa-group-name" title={item.name}>
                    {item.name}
                  </div>

                  <div className="wa-group-message" title={item.messageText}>
                    {item.messageText ? truncateText(item.messageText, 25) : "No messages"}
                  </div>
                </div>
              </div>

              <div className="wa-group-meta">
                <div className="wa-group-top">
                  <span className="wa-group-time">
                    {item.lastMessageDate
                      ? new Date(item.lastMessageDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>

                <div className="wa-group-bottom">
                  {group.unReadCount > 0 && (
                    <span className="chat-unread-badge">{group.unReadCount > 99 ? "99+" : group.unReadCount}</span>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // =========================
        // GROUP CHAT
        // =========================

        if (group.items && group.items.length > 1) {
          const isOpen = openGroup === group.name;

          // latest group message
          const latestMessage =
            [...group.items].sort((a, b) => new Date(b.lastMessageDate || 0) - new Date(a.lastMessageDate || 0))[0] ||
            {};

          return (
            <div key={index} className={`wa-group-card ${isOpen ? "active" : ""}`}>
              <div className="wa-group-header" onClick={() => toggleGroup(group.name)}>
                <div className="wa-group-left">
                  <div className="wa-group-avatar">
                    <Icon name="users-fill" />
                  </div>

                  <div className="wa-group-info">
                    <div className="wa-group-name" title={group.name}>
                      {group.name}
                    </div>

                    <div className="wa-group-message" title={latestMessage?.messageText}>
                      {latestMessage?.messageText
                        ? truncateText(latestMessage.messageText, 25)
                        : `${group.count} Subjects`}
                    </div>
                  </div>
                </div>

                <div className="wa-group-meta">
                  <div className="wa-group-top">
                    <span className="wa-group-time">
                      {latestMessage?.lastMessageDate
                        ? new Date(latestMessage.lastMessageDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                    <Icon className="wa-group-arrow" name={isOpen ? "chevron-down" : "chevron-right"} />
                  </div>

                  <div className="wa-group-bottom">
                    {group.unReadCount > 0 && (
                      <span className="chat-unread-badge">{group.unReadCount > 99 ? "99+" : group.unReadCount}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SUBJECTS */}
              {isOpen && (
                <div className="wa-subject-list">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`wa-subject-item ${selectedId === item.id ? "selected" : ""}`}
                      onClick={(ev) => {
                        console.log("item", item);
                        onItemClick(item);
                        ev.preventDefault();
                        setSelectedId(item.id);
                        chatItemClick(item.id, item?.group, item);
                      }}
                    >
                      <div className="wa-subject-avatar">
                        <Icon name="book-fill" />
                      </div>
                      <div className="wa-subject-info">
                        <div className="wa-subject-name" title={item.groupName}>
                          {item.groupName}{" "}
                        </div>
                        <div className="wa-subject-message" title={item.messageText}>
                          {item.messageText ? truncateText(item.messageText, 15) : "No messages"}
                        </div>
                      </div>
                      <div className="wa-subject-meta">
                        <div className="wa-subject-time">
                          {" "}
                          {item.lastMessageDate
                            ? new Date(item.lastMessageDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                        {item?.unReadCount > 0 && <span className="chat-unread-badge">{item?.unReadCount}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // =========================
        // INDIVIDUAL CHAT
        // =========================

        return (
          <div
            key={group.id}
            className={`wa-chat-item wa-group-header ${selectedId === group.id ? "selected" : ""}`}
            onClick={(ev) => {
              onItemClick(group);
              ev.preventDefault();
              setSelectedId(group.id);
              chatItemClick(group.id, group?.group, group);
            }}
          >
            <div className="wa-group-left">
              <div className="wa-group-avatar">
                <Icon name="user-fill" />
              </div>

              <div className="wa-group-info">
                <div className="wa-group-name" title={group.name}>
                  {group.name}
                </div>

                <div className="wa-group-message" title={group.messageText}>
                  {group.messageText || "No messages"}
                </div>
              </div>
            </div>

            <div className="wa-group-meta">
              <div className="wa-group-top">
                <span className="wa-group-time">
                  {group.lastMessageDate
                    ? new Date(group.lastMessageDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>

              <div className="wa-group-bottom">
                {group.unReadCount > 0 && (
                  <span className="chat-unread-badge">{group.unReadCount > 99 ? "99+" : group.unReadCount}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WhatsAppGroupMenu;

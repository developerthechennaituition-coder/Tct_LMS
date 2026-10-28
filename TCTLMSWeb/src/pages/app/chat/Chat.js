import React, { useEffect, useState, useContext } from "react";
import Head from "../../../layout/head/Head";
import ContentAlt from "../../../layout/content/ContentAlt";
import AppContact from "./contact/Contact";
import ChatBody from "./ChatBody";
import User from "../../../images/avatar/b-sm.jpg";
import { Button, Icon, UserAvatar } from "../../../components/Component";
import { DropdownMenu, DropdownToggle, UncontrolledDropdown, DropdownItem } from "reactstrap";
import { chatData } from "./ChatData";
import { ChatContext } from "./ChatContext";
import { Link, useLocation } from "react-router-dom";
import { ChannelAsideBody, ChatAsideBody } from "./ChatAsideBody";
import ChatApp from "./Chat1";
import { GetLatestMessages, GetGroupContacts } from "../../../apiservices/ChatService";
import * as signalR from "@microsoft/signalr";

const Chat = () => {
  const [mainTab, setMainTab] = useState("Chats");
  const [selectedId, setSelectedId] = useState(null);
  const [group, setGroup] = useState(false);
  const [filterTab, setFilterTab] = useState("messages");
  const [filteredChatList, setFilteredChatList] = useState([]);

  const [filterText, setFilterText] = useState("");
  const [favState, setFavState] = useState(false);
  const [favFilter, setFavFilter] = useState([]);
  const [favFilterText, setFavFilterText] = useState("");
  const [mobileView, setMobileView] = useState(false);
  const [connection, setConnection] = useState(null);

  const { chatState, chatDataSourceState, fav, changeChatUser, chatDataSource } = useContext(ChatContext);
  // const [chatDataSource, setChatDataSource] = chatDataSourceState;
  const [filteredChatList1, setFilteredChatList1] = useState([]);
  const [chat, setChat] = chatState;
  const [favData] = fav;

  useEffect(() => {
    console.log(chatDataSourceState);
    setFilteredChatList1(chatDataSource);
    // await GetChats(false);
  }, [chatDataSource]);

  const GetChats = async (isSignalR) => {
    await GetLatestMessages(localStorage.getItem("userId")).then(async (response) => {
      console.log("CHAT DATA AFTER REFRESH:", response);
      setFilteredChatList1(response);
      if (!isSignalR) {
        if (response.length > 0) {
          // setSelectedId(selectedId);
          // setGroup(group);
          // localStorage.getItem("selectedId");
          // localStorage.getItem("isGroup");
          // setSelectedId(localStorage.getItem("selectedId"));
          // setGroup(localStorage.getItem("isGroup"));
        }
      }
    });
  };

  const GetGroupLatestMessage = async () => {
    await GetGroupContacts(localStorage.getItem("userId")).then(async (response) => {
      setFilteredChatList1(response);
    });
  };

  useEffect(() => {
    // Create Connection
    // const newConnection = new signalR.HubConnectionBuilder()
    //   .withUrl("https://localhost:44352/pushNotificationHub") // Your API URL
    //   .withAutomaticReconnect()
    //   .build();
    // newConnection
    //   .start()
    //   .then(() => console.log("Connected to SignalR"))
    //   .catch((err) => console.log("Connection Error: ", err));
    // // Handle Received Messages
    // newConnection.on("ReceivePushMessage", async (message, userInfo) => {
    //   // setSelectedId(selectedId);
    //   // setGroup(group);
    //   console.log(chatDataSource);
    //   if (chatDataSource != undefined) {
    //     const index = chatDataSource.findIndex((s) => s.id == userInfo.senderId);
    //     const temp = [...chatDataSource];
    //     temp[index].messageText = userInfo?.message;
    //     setChatDataSource(temp);
    //   } else {
    //     await GetChats(true);
    //   }
    //   const isExists = userInfo?.groupMember?.findIndex((s) => s == localStorage.userId);
    //   // if (message == "groupdelete" && isExists >= 0) {
    //   //   GetGroupLatestMessage();
    //   // } else if (message == "GroupChat" && isExists != -1) {
    //   //   await GetChats(true);
    //   // } else {
    //   //   await GetChats(true);
    //   // }
    //   console.log("Left Sidebar - Received message:", message);
    // });
    // setConnection(newConnection);
    // return () => {
    //   newConnection.stop();
    // };
  }, []);

  // Filtering users by search
  useEffect(() => {
    if (filterText !== "") {
      const filteredObject = chatData.filter((item) => {
        return item.name.toLowerCase().includes(filterText.toLowerCase());
      });
      setFilteredChatList([...filteredObject]);
    } else {
      setFilteredChatList([...chatData]);
    }
  }, [filterText, setFilteredChatList]);

  // Filtering favourite users by search
  useEffect(() => {
    if (favFilterText !== "") {
      const filteredObject = favData.filter((item) => {
        return item.name.toLowerCase().includes(favFilterText.toLowerCase()) && item.fav === false;
      });
      setFavFilter([...filteredObject]);
    } else {
      setFavFilter([]);
    }
  }, [favFilterText, favData]);

  const onInputChange = (e) => {
    setFilterText(e.target.value);
  };

  const favInputSearchChange = (e) => {
    setFavFilterText(e.target.value);
  };

  const onFilterClick = (prop) => {
    setFilterTab(prop);
  };

  const chatItemClick = (id, isGroup, currentItem) => {
    // let data = chat;
    // const index = data.findIndex((item) => item.id === id);
    // const dataSet = data.find((item) => item.id === id);
    // if (dataSet["unread"] === true) {
    //   data[index]["unread"] = false;
    //   setChat([...data]);
    // }
    changeChatUser(id, isGroup, currentItem);
    setSelectedId(id);
    setGroup(isGroup);

    if (window.innerWidth < 860) {
      setMobileView(true);
    }
  };

  // Support → Help: a contact picked there opens its 1:1 conversation here, the same way as clicking
  // that contact in this page's TCT Help list. Only runs when the Help page sent a contact.
  const location = useLocation();
  useEffect(() => {
    const helpContact = location.state?.helpContact;
    if (helpContact?.id) {
      chatItemClick(helpContact.id, false, {
        id: helpContact.id,
        name: helpContact.name,
        nickname: helpContact.name,
        group: false,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <React.Fragment>
      <Head title="Chat / Messenger"></Head>
      <ContentAlt>
        {/* Panel separation for this chat page only (scoped to .tct-chat). */}
        <style>{`
          .tct-chat .nk-chat-aside { border-right: 1px solid #e5e9f2; }
          .tct-chat .nk-chat-head {
            background: #fff;
            border-bottom: 1px solid #e5e9f2;
          }
          .tct-chat .nk-chat-panel { background: #eef1f6; }
          /* Faint lift so bubbles separate from the grey, as in WhatsApp (colours unchanged). */
          .tct-chat .nk-chat-panel .chat-msg { box-shadow: 0 1px 1px rgba(31, 43, 58, 0.08); }
          .tct-chat .nk-chat-blank { background: #f5f6fa; }
          /* SimpleBar paints its mask white over the panel; let the panel's grey show. */
          .tct-chat .nk-chat-panel > .simplebar-wrapper > .simplebar-mask { background-color: transparent; }
          /* Same grey around the floating composer as the message history. */
          .tct-chat .nk-chat-body { background: #eef1f6; }
          /* WhatsApp-style composer: a white rounded bar floating above the messages. */
          .tct-chat .nk-chat-editor {
            background: #fff;
            margin: 6px 16px 14px;
            padding: 4px 6px;
            gap: 4px;
            border: 1px solid #e5e9f2;
            border-radius: 26px;
            box-shadow: 0 1px 3px rgba(31, 43, 58, 0.08);
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .tct-chat .nk-chat-editor:focus-within {
            border-color: rgba(133, 79, 255, 0.35);
            box-shadow: 0 1px 3px rgba(31, 43, 58, 0.08), 0 0 0 3px rgba(133, 79, 255, 0.1);
          }
          /* The upload wrapper carries Bootstrap's ml-n1 (negative margin, !important),
             which pulled the "+" against the bar's rounded edge; cancel it here only. */
          .tct-chat .nk-chat-editor-upload { margin-left: 0 !important; }
          /* "+" and send: 40px centred circles, matching the input height. */
          .tct-chat .nk-chat-editor-upload .btn-icon,
          .tct-chat .nk-chat-editor-tools .btn-icon {
            width: 40px;
            height: 40px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          .tct-chat .nk-chat-editor-upload .btn-icon:hover { background: rgba(133, 79, 255, 0.08); }
          .tct-chat .nk-chat-editor-form { padding: 0 2px; }
          .tct-chat .nk-chat-editor-form .form-control {
            min-height: 40px;
            padding: 10px 8px;
            line-height: 20px;
            font-size: 15px;
            color: #364a63;
            background: transparent;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }
          .tct-chat .nk-chat-editor-form .form-control::placeholder { color: #8094ae; opacity: 1; }
          .tct-chat .nk-chat-editor-form .form-control:focus { background: transparent; box-shadow: none; }
          .tct-chat .nk-chat-profile { border-left: 1px solid #e5e9f2; }
        `}</style>
        <div className="nk-chat tct-chat">
          <div className={`nk-chat-aside ${mobileView ? "has-aside" : ""}`}>
            <div className="nk-chat-aside-head">
              <div className="nk-chat-aside-user">
                <UncontrolledDropdown>
                  <DropdownToggle tag="a" className="dropdown-toggle dropdown-indicator">
                    {/* <UserAvatar image={User}></UserAvatar> */}
                    <div className="title">{mainTab}</div>
                  </DropdownToggle>
                  <DropdownMenu>
                    <ul className="link-list-opt no-bdr">
                      <li>
                        <DropdownItem
                          tag="a"
                          href="#contact"
                          onClick={(ev) => {
                            ev.preventDefault();
                            const tabName = mainTab === "Chats" ? "Contact" : "Chats";
                            if (tabName == "Chats") {
                              setGroup(false);
                              GetChats(false);
                            }
                            setMainTab(mainTab === "Chats" ? "Contact" : "Chats");
                          }}
                        >
                          <span>{mainTab === "Chats" ? "Contact" : "Chats"}</span>
                        </DropdownItem>
                      </li>
                      <li>
                        <DropdownItem
                          tag="a"
                          href="#contact"
                          onClick={(ev) => {
                            ev.preventDefault();
                            const tabName =
                              mainTab === "Chats" ? "Channel" : mainTab === "Channel" ? "Contact" : "Channel";
                            setMainTab(mainTab === "Chats" ? "Channel" : mainTab === "Channel" ? "Contact" : "Channel");
                            if (tabName == "Channel") {
                              setGroup(true);
                              GetGroupLatestMessage();
                            } else {
                              setGroup(false);
                              GetChats(false);
                            }
                          }}
                        >
                          <span>{mainTab === "Chats" ? "Channel" : mainTab === "Channel" ? "Contact" : "Channel"}</span>
                        </DropdownItem>
                      </li>
                    </ul>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </div>
              <ul className="nk-chat-aside-tools g-2">
                {mainTab === "Chats" || mainTab === "Channel" ? (
                  <React.Fragment>
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="btn btn-round btn-icon btn-light dropdown-toggle">
                          <Icon name="setting-alt-fill"></Icon>
                        </DropdownToggle>
                        <DropdownMenu right>
                          <ul className="link-list-opt no-bdr">
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdown"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <span>Settings</span>
                              </DropdownItem>
                            </li>
                            <li className="divider"></li>
                            <li
                              onClick={() => onFilterClick("messages")}
                              className={filterTab === "messages" ? "active" : ""}
                            >
                              <DropdownItem
                                tag="a"
                                href="#dropdown"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <span>Messages</span>
                              </DropdownItem>
                            </li>
                            <li
                              onClick={() => onFilterClick("archive")}
                              className={filterTab === "archive" ? "active" : ""}
                            >
                              <DropdownItem
                                tag="a"
                                href="#dropdown"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <span>Archives Chats</span>
                              </DropdownItem>
                            </li>
                            <li
                              onClick={() => onFilterClick("unread")}
                              className={filterTab === "unread" ? "active" : ""}
                            >
                              <DropdownItem
                                tag="a"
                                href="#dropdown"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <span>Unread Chats</span>
                              </DropdownItem>
                            </li>
                            <li
                              onClick={() => onFilterClick("group")}
                              className={filterTab === "group" ? "active" : ""}
                            >
                              <DropdownItem
                                tag="a"
                                href="#dropdown"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <span>Group Chats</span>
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                    {/* <li>
                      <Button color="light" className="btn-round btn-icon">
                        <Icon name="edit-alt-fill"></Icon>
                      </Button>
                    </li> */}
                  </React.Fragment>
                ) : (
                  <li>
                    <Button color="light" className="btn-round btn-icon">
                      <Icon name="user-add-fill"></Icon>
                    </Button>
                  </li>
                )}
              </ul>
            </div>
            {mainTab === "Chats" ? (
              <> 
                {filteredChatList1 && (
                  <>
                    {filteredChatList1?.length > 0 && (
                      <ChatAsideBody
                        onInputChange={onInputChange}
                        filteredChatList={filteredChatList}
                        filteredChatList1={filteredChatList1}
                        GetChats={GetChats}
                        favState={favState}
                        favFilter={favFilter}
                        showFavSection={false}
                        setFavFilter={setFavFilter}
                        setFavState={setFavState}
                        selectedId={selectedId}
                        setSelectedId={setSelectedId}
                        setGroup={setGroup}
                        group={group}
                        favInputSearchChange={favInputSearchChange}
                        favFilterText={favFilterText}
                        chatItemClick={chatItemClick}
                        filterTab={filterTab}
                      />
                    )}
                  </>
                )}
              </>
            ) : mainTab === "Channel" ? (
              <ChannelAsideBody
                filteredChatList={filteredChatList1}
                onInputChange={onInputChange}
                setSelectedId={setSelectedId}
                setMobileView={setMobileView}
                selectedId={selectedId}
                setGroup={setGroup}
                group={group}
                chatItemClick={chatItemClick}
                filterTab={filterTab}
              />
            ) : (
              <AppContact setTab={setMainTab} chatItemClick={chatItemClick} />
            )}
          </div>
          {filteredChatList1 && (
            <>
              {selectedId !== null ? (
                <ChatBody
                  id={selectedId}
                  group={group}
                  setGroup={setGroup}
                  setSelectedId={setSelectedId}
                  setMobileView={setMobileView}
                  mobileView={mobileView}
                />
              ) : (
                <div className="nk-chat-body">
                  <div className="nk-chat-blank">
                    <div className="nk-chat-blank-icon">
                      <Icon name="chat" className="icon-circle icon-circle-xxl bg-white"></Icon>
                    </div>
                    <div className="nk-chat-blank-btn">
                      <Link to={`${process.env.PUBLIC_URL}/app-chat`}>
                        <Button color="primary" disabled={mainTab === "Contact"} onClick={() => setMainTab("Contact")}>
                          Start Chat
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ContentAlt>
    </React.Fragment>
  );
};

export default Chat;

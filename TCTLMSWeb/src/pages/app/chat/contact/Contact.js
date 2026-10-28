import React, { useState, useEffect } from "react";
import SimpleBar from "simplebar-react";
import { Icon } from "../../../../components/Component";
import UserAvatar1 from "../../../../components/user/UserAvatar1";
import { findUpper1, getColor } from "../../../../utils/Utils";
import { getChatContacts } from "../../../../apiservices/ChatService";

const AppContact = ({ setTab, chatItemClick }) => {
  const [contactData, setContacts] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [filterText, setFilter] = useState("");

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await getChatContacts(localStorage.getItem("userId"));
      setContacts(response);
      setFilterData(response);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // 🔎 Filtering logic
  useEffect(() => {
    if (!filterText) {
      setFilterData(contactData);
      return;
    }

    const filtered = contactData.filter((item) => {
      const name = (item.fullName ?? item.firstName ?? "").toLowerCase();
      return name.includes(filterText.toLowerCase());
    });

    setFilterData(filtered);
  }, [filterText, contactData]);

  const onInputChange = (e) => {
    setFilter(e.target.value);
  };

  const getImageSource = (data) => {
    if (!data.fileData) return "";
    return `data:image/jpeg;base64,${data.fileData}`;
  };

  return (
    <React.Fragment>
      <SimpleBar className="nk-chat-aside-body">
        {/* 🔎 Search */}
        <div className="nk-chat-aside-search">
          <div className="form-group">
            <div className="form-control-wrap">
              <div className="form-icon form-icon-left">
                <Icon name="search" />
              </div>

              <input
                type="text"
                className="form-round form-control"
                placeholder="Search by name"
                value={filterText}
                onChange={onInputChange}
              />
            </div>
          </div>
        </div>

        {/* 👥 Contacts */}
        <div className="nk-chat-aside-panel nk-chat-contact">
          {filterData.length === 0 ? (
            <div className="ml-5">No user</div>
          ) : (
            <ul className="contacts-list">
              {filterData.map((contact, idx) => {
                const nickname = contact.nickname ?? contact.firstName;

                const startChat = () => {
                  setTab("Chats");
                  chatItemClick(contact.id, false, contact);
                };

                return (
                  <li key={idx} onClick={startChat}>
                    <div className="user-card">
                      <a href="#card" onClick={(ev) => ev.preventDefault()}>
                        <UserAvatar1
                          image={getImageSource(contact)}
                          theme={getColor(nickname)}
                          text={findUpper1(nickname)}
                        />

                        <div className="user-name">
                          {nickname}
                          {contact.role && <span className="user-role text-soft ml-1">({contact.role})</span>}
                        </div>
                      </a>

                      <div className="user-actions">
                        <a
                          href="#start-chat"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            startChat();
                          }}
                        >
                          Start Chat
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SimpleBar>
    </React.Fragment>
  );
};

export default AppContact;

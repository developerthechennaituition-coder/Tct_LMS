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
import { GetMessageInfo } from "../../../apiservices/ChatService";
import MessageAttachment from "./MessageAttachment ";
import MessagePreview from "./MessagePreview";
import MessageInfoHeader from "./MessageInfoHeader";
import StatusSection from "./StatusSection";

const MessageInfoSidebar = ({ sidebar, chat, currentMessage, onClose }) => {
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
  const [messageInfoData, setMessageInfoData] = useState(null);
  useEffect(() => {
    console.log("currentMessage", currentMessage);
    getGroupMessageInfo();
    if (chat.group) {
      setGroupName(chat.groupName ? chat.groupName : chat.groupName);
    }
    setGroupId(chat?.id);
  }, []);
  const getGroupMessageInfo = () => {
    GetMessageInfo(currentMessage.id).then((response) => {
      if (response) {
        setMessageInfoData(response);
      }
    });
  };
  const getTick = (message) => {
  if (!message) return null;

  // Read
  if (message.isRead) {
    return (
      <span style={{ color: "#53bdeb", display: "flex", alignItems: "center" }}>
        <Icon name="check-check" />
      </span>
    );
  }

  // Delivered
  if (message.isDelivered) {
    return (
      <span style={{ color: "#8696A0", display: "flex", alignItems: "center" }}>
        <Icon name="check-check" />
      </span>
    );
  }

  // Sent
  return (
    <span style={{ color: "#8696A0", display: "flex", alignItems: "center" }}>
      <Icon name="check" />
    </span>
  );
};
  return (
    <SimpleBar className={`nk-chat-profile ${sidebar ? "visible" : ""}`}>
      <MessageInfoHeader onClose={onClose} />

      <MessagePreview message={currentMessage} getTick={getTick} />

      {messageInfoData && (
        <>
          <StatusSection
            title={chat.group ? "✓✓ Read by" : "✓✓ Read"}
            color="#53bdeb"
            users={messageInfoData.readBy}
            dateField="readAt"
            loggedInUser={loggedInUser}
            emptyText="No one has read this message yet"
            showCount={!!chat.group}
          />

          {chat.group && messageInfoData.remaining.length > 0 && (
            <div className="remaining-users">{messageInfoData.remaining.length} Remaining</div>
          )}

          <StatusSection
            title={chat.group ? "✓✓ Delivered to" : "✓✓ Delivered"}
            color="#8696A0"
            users={messageInfoData.deliveredTo}
            dateField="deliveredAt"
            loggedInUser={loggedInUser}
            emptyText="No delivered users"
            showCount={!!chat.group}
          />
        </>
      )}
    </SimpleBar>
  );
};
export default MessageInfoSidebar;

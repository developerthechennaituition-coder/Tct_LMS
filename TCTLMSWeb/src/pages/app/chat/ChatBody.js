import React, { useEffect, useState, useContext, useRef } from "react";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import SimpleBar from "simplebar-react";
import { UserAvatar, Icon, Button } from "../../../components/Component";
import { currentTime, findUpper, truncate } from "../../../utils/Utils";
import { ChatContext } from "./ChatContext";
import classNames from "classnames";
import ChatSideBar from "./ChatSideBar";
import { MeChat, YouChat, MetaChat } from "./ChatPartials";
import { PostMessage, GetMessages, DeleteMessage } from "../../../apiservices/ChatService";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor, getImageUrl } from "../../../utils/Utils";
import * as signalR from "@microsoft/signalr";
import { useHistory, useLocation } from "react-router-dom";
import ImageViewer from "./ImageView";
import MessageInfoSidebar from "./MessageInfoSidebar";
import VoiceCallOverlay from "./VoiceCallOverlay";
import TCTScheduleCalender from "../../lms/schedule/TCTScheduleCalender";
import { GetStudentsbyTutor, GetStudents, GetStudentsByUser } from "../../../apiservices/StudentEnrollmentService";

// Roles allowed to open the group attendance calendar (stable role ids from login: Tutor 13, Student 14, Operations 4).
const GROUP_ATTENDANCE_ROLE_IDS = ["13", "14", "4"];

// Group attendance split view (chat left, attendance right). Scoped to .tct-att-panel and
// body.tct-chat-split (set only while the split is open).
const attendanceSplitStyle = `
  body.tct-chat-split .tct-chat .nk-chat-aside { display: none; }
  body.tct-chat-split .tct-chat .nk-chat-body { flex: 1 1 50%; min-width: 0; }
  .tct-chat .tct-att-panel {
    flex: 1 1 50%; min-width: 0; display: flex; flex-direction: column;
    background: #fff; border-left: 1px solid #e5e9f2; overflow: hidden;
  }
  .tct-att-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e5e9f2; }
  .tct-att-title { margin: 0; font-size: 16px; font-weight: 700; color: #1c2b46; }
  .tct-att-sub { display: block; margin-top: 2px; font-size: 13px; color: #8094ae; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tct-att-head > div { min-width: 0; }
  .tct-att-back.btn {
    flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
    border-radius: 8px; font-size: 13px; font-weight: 600; color: #6a35e8; background: #f5f1ff; border: 1px solid #d9cbff;
  }
  .tct-att-back.btn:hover { color: #fff; background: #854fff; border-color: #854fff; }
  .tct-att-picker { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 12px 18px; border-bottom: 1px solid #eef0f5; background: #fafbfd; }
  .tct-att-picker label { margin: 0; font-size: 13px; font-weight: 600; color: #364a63; }
  .tct-att-picker select {
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    flex: 0 1 320px; min-width: 200px; height: 38px; padding: 0 34px 0 12px; font-size: 14px; color: #364a63; cursor: pointer;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23854fff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center / 12px 12px;
    border: 1px solid #dbdfea; border-radius: 8px;
  }
  .tct-att-picker select:focus { outline: none; border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-att-note { font-size: 13px; color: #8094ae; }
  .tct-att-note.is-error { color: #e85347; }
  .tct-att-body { flex: 1 1 auto; min-height: 0; overflow: auto; }
  .tct-att-calendar { padding: 14px 16px 18px; }
  .tct-att-calendar .fc .fc-toolbar { flex-wrap: wrap; gap: 8px; }
  .tct-att-calendar .fc .fc-toolbar-title { font-size: 1.15rem; font-weight: 700; color: #1c2b46; }
  .tct-att-calendar .fc .fc-button-primary { background: #854fff; border-color: #854fff; }
  .tct-att-calendar .fc .fc-button-primary:not(:disabled):hover,
  .tct-att-calendar .fc .fc-button-primary:not(:disabled).fc-button-active { background: #6a35e8; border-color: #6a35e8; }
  .tct-att-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; height: 100%; min-height: 220px; padding: 24px; text-align: center; color: #8094ae; font-size: 14px; }
  .tct-att-empty .icon { font-size: 28px; color: #854fff; }
  .tct-chat .nk-chat-head-tools .tct-att-toggle.active { background: #f5f1ff; border-radius: 50%; }
  /* Narrow screens: dedicated attendance view (Go to Chat returns to the conversation). */
  @media (max-width: 991.98px) {
    body.tct-chat-split .tct-chat .nk-chat-body { display: none; }
    .tct-chat .tct-att-panel { flex-basis: 100%; border-left: 0; }
  }
`;
import { toast } from "react-toastify";
import { getClassScheduleContext } from "../../../apiservices/ScheduleService";
import { classCalendarLink } from "../../../library/workflowDisplay";
const ChatBody = ({ id, group, setGroup, mobileView, setMobileView, setSelectedId }) => {
  const {
  deleteConvo,
  propAction,
  chatState,
  selectedUserId,
  uChatMsg,
  changeChatUser,
  connection,
  sendTyping,
  onlineUserIds,
  startVoiceCall,
  acceptVoiceCall,
  rejectVoiceCall,
  incomingCall,
  activeCall,
  endVoiceCall,
    remoteAudioRef,
    toggleMuteVoiceCall,
    outgoingCall
} = useContext(ChatContext);
  const [chat, setChat] = chatState;
  const [showInfo, setShowInfo] = useState(false);
  const [messageInfo, setMessageInfo] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(selectedUserId);
  const history = useHistory();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [Uchat, setUchat] = useState({});
  const [sidebar, setsidebar] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatOptions, setChatOptions] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingStopTimeoutRef = useRef(null);
  const isTypingActiveRef = useRef(false);
  const partnerTypingClearRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentPreview, setCurrentPreview] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [attachmentType, setAttachmentType] = useState("");
  const [imageViewer, setImageViewer] = useState({
    open: false,
    images: [],
    index: 0,
  });
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const scrollHeight = messagesEndRef.current.scrollHeight;
      const height = messagesEndRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      messagesEndRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  useEffect(async () => {
    const _params = new URLSearchParams(window.location.search);
    const _id = _params.get("uid");
    const _isGroup = _params.get("isGroup");
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [Uchat]);

  const handleAttachmentClick = (type) => {
    setAttachmentType(type);

    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === "image"
          ? "image/*"
          : type === "document"
            ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            : type === "audio"
              ? "audio/*"
              : "*";

      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 0) {
      chatOptions && setChatOptions(false);
      setSelectedFiles((prev) => [...prev, ...files]);
      setShowAttachmentPreview(true);
    }
  };
  // Group Info stays closed until the user opens it (it used to auto-open above 1550px);
  // narrowing the window still closes it.
  const resizeFunc = () => {
    if (window.innerWidth <= 1550) {
      setsidebar(false);
    }
  };

  useEffect(async () => {
    // uChatMsg starts undefined in context until the first GetMessages call
    // resolves — falling back to {} keeps Uchat a safe object to read from
    // on every render instead of throwing while that fetch is in flight.
    setUchat(uChatMsg || {});
    setTimeout(() => {
      scrollToBottom();
    }, 500);
  }, [uChatMsg]);

  // Switching conversations shouldn't carry over a stale "typing…" indicator
  // from whichever chat was open before.
  useEffect(() => {
    setIsPartnerTyping(false);
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    if (partnerTypingClearRef.current) clearTimeout(partnerTypingClearRef.current);
    isTypingActiveRef.current = false;
  }, [id, group]);

  useEffect(() => {
    if (!connection) return;
    const myUserId = localStorage.getItem("userId");

    const handleUserTyping = (data) => {
      if (!data) return;
      const senderId = String(data.senderId ?? data.SenderId ?? "");
      const receiverId = String(data.receiverId ?? data.ReceiverId ?? "");
      const isGroupEvent = data.isGroup ?? data.IsGroup;
      const typing = data.isTyping ?? data.IsTyping;

      if (!senderId || senderId === String(myUserId)) return;

      const isForThisChat = isGroupEvent
        ? !!group && receiverId === String(id)
        : !group && senderId === String(id);
      if (!isForThisChat) return;

      setIsPartnerTyping(!!typing);
      if (partnerTypingClearRef.current) clearTimeout(partnerTypingClearRef.current);
      if (typing) {
        // Self-heals the indicator if a "stopped typing" event is ever missed.
        partnerTypingClearRef.current = setTimeout(() => setIsPartnerTyping(false), 4000);
      }
    };

    connection.on("UserTyping", handleUserTyping);
    return () => {
      connection.off("UserTyping", handleUserTyping);
    };
  }, [connection, id, group]);

  // Group deliveries used to only update the DB — the sender's tick marks
  // stayed stuck on "sent" until they reloaded the chat, even though the
  // recipient was online and the message really had been delivered.
  useEffect(() => {
    if (!connection) return;

    const handleMessageDelivered = (data) => {
      if (!data) return;
      const deliveredIds = new Set((data.messageIds ?? data.MessageIds ?? []).map(String));
      if (deliveredIds.size === 0) return;
      const deliveredAt = data.deliveredAt ?? data.DeliveredAt;

      setUchat((prev) => {
        if (!prev?.convo?.length) return prev;
        let changed = false;
        const convo = prev.convo.map((conv) => {
          if (!conv.chat1?.length) return conv;
          let convChanged = false;
          const chat1 = conv.chat1.map((msg) => {
            if (msg?.isDelivered || !deliveredIds.has(String(msg?.id))) return msg;
            convChanged = true;
            return { ...msg, isDelivered: true, deliveredAt: deliveredAt ?? msg.deliveredAt };
          });
          if (!convChanged) return conv;
          changed = true;
          return { ...conv, chat1 };
        });
        return changed ? { ...prev, convo } : prev;
      });
    };

    connection.on("MessageDelivered", handleMessageDelivered);
    return () => {
      connection.off("MessageDelivered", handleMessageDelivered);
    };
  }, [connection]);

  useEffect(() => {
    setMessageInfo({
      text: "Hello Everyone",

      readBy: [
        {
          userId: 1,
          name: "John",
          readAt: "Today 10:20 AM",
        },
        {
          userId: 2,
          name: "David",
          readAt: "Today 10:21 AM",
        },
      ],

      deliveredTo: [
        {
          userId: 3,
          name: "Steve",
          deliveredAt: "Today 10:19 AM",
        },
        {
          userId: 4,
          name: "James",
          deliveredAt: "Today 10:18 AM",
        },
      ],
    });

    window.addEventListener("resize", resizeFunc);
    resizeFunc();
    return () => {
      window.removeEventListener("resize", resizeFunc);
    };
  }, []);

  const onChatOptions = () => {
    setChatOptions(!chatOptions);
  };

  const stopTypingIndicator = () => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (isTypingActiveRef.current) {
      isTypingActiveRef.current = false;
      sendTyping(id, group, false, group ? Uchat.user?.map((u) => u.id) : null);
    }
  };

  const onInputChange = (e) => {
    setInputText(e.target.value);

    if (!isTypingActiveRef.current) {
      isTypingActiveRef.current = true;
      sendTyping(id, group, true, group ? Uchat.user?.map((u) => u.id) : null);
    }

    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(stopTypingIndicator, 2000);
  };

  // ---- Group attendance split view ----
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceStudents, setAttendanceStudents] = useState(null); // null = loading
  const [attendanceError, setAttendanceError] = useState("");
  const [attendanceStudentId, setAttendanceStudentId] = useState("");
  const appSidebarWasCompactRef = useRef(null); // app sidebar state before the split opened
  const attendanceOpenRef = useRef(false);
  attendanceOpenRef.current = attendanceOpen;
  const canViewGroupAttendance = GROUP_ATTENDANCE_ROLE_IDS.includes(String(localStorage.getItem("roleId") || ""));

  // The app sidebar keeps its collapse state internally; use its own burger button so its
  // existing toggle logic runs (desktop only; below 1200px the sidebar is an overlay).
  const isAppSidebarCompact = () => !!document.querySelector(".nk-sidebar.is-compact");
  const toggleAppSidebarCompact = () => {
    const toggleEl = document.querySelector(".nk-sidebar .nk-nav-compact");
    if (toggleEl) toggleEl.click();
  };
  const restoreAppSidebar = () => {
    if (appSidebarWasCompactRef.current === false && isAppSidebarCompact()) toggleAppSidebarCompact();
    appSidebarWasCompactRef.current = null;
  };

  // Students of this group: group members (user ids) matched to student records the user can
  // already see through the existing role-based student list. Non-students are not offered.
  const loadAttendanceStudents = () => {
    setAttendanceStudents(null);
    setAttendanceError("");
    const emptyGuid = "00000000-0000-0000-0000-000000000000";
    const roleId = localStorage.getItem("roleId");
    const userId = localStorage.getItem("userId");
    const request =
      roleId == "13"
        ? GetStudentsbyTutor(userId, emptyGuid, emptyGuid, emptyGuid, "", 1000, 1)
        : roleId == "6" || roleId == "4"
          ? GetStudentsByUser(userId, parseInt(roleId), emptyGuid, emptyGuid, emptyGuid, "", 1000, 1)
          : GetStudents(emptyGuid, emptyGuid, emptyGuid, "", 1000, 1);
    const memberIds = new Set((Uchat?.user || []).map((u) => String(u.id).toLowerCase()));
    Promise.resolve(request)
      .then((response) => {
        const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        const byStudent = new Map();
        rows.forEach((row) => {
          if (row?.id && row?.userId && memberIds.has(String(row.userId).toLowerCase()) && !byStudent.has(row.id)) {
            byStudent.set(row.id, { id: row.id, userId: row.userId, name: row.studentName || row.fullName || "Student", code: row.code });
          }
        });
        const students = Array.from(byStudent.values());
        setAttendanceStudents(students);
        if (students.length === 1) setAttendanceStudentId(students[0].id);
      })
      .catch(() => {
        setAttendanceStudents([]);
        setAttendanceError("Unable to load the students for this group.");
      });
  };

  const openAttendance = () => {
    if (!canViewGroupAttendance) return; // not permitted for this role
    setsidebar(false); // Group Info and attendance are separate panels
    setAttendanceStudentId("");
    setAttendanceOpen(true);
    if (window.innerWidth >= 1200 && appSidebarWasCompactRef.current === null) {
      appSidebarWasCompactRef.current = isAppSidebarCompact();
      if (!appSidebarWasCompactRef.current) toggleAppSidebarCompact();
    }
    loadAttendanceStudents();
  };

  const closeAttendance = () => {
    setAttendanceOpen(false);
    setAttendanceStudentId("");
    setAttendanceStudents(null);
    setAttendanceError("");
    restoreAppSidebar();
  };

  // Switching conversations: Group Info closed, attendance split closed (avoids showing the
  // previous group's students).
  useEffect(() => {
    setsidebar(false);
    if (attendanceOpenRef.current) closeAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, group]);

  // Layout class while the split is open; restore the app sidebar if the page is left.
  useEffect(() => {
    document.body.classList.toggle("tct-chat-split", attendanceOpen && !!group);
    return () => document.body.classList.remove("tct-chat-split");
  }, [attendanceOpen, group]);
  useEffect(() => () => restoreAppSidebar(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMenu = () => {
    // Opening Group Info closes the attendance split so the two panels never overlap.
    if (!sidebar && attendanceOpenRef.current) closeAttendance();
    setsidebar(!sidebar);
  };

  const onTextSubmit = (e) => {
    e.preventDefault();
    stopTypingIndicator();
    const params1 = new URLSearchParams(new URL(window.location.href).search);
    const uid1 = params1.get("uid");
    const _isGroup = params1.get("isGroup");
    let allChat = chat;
    let defaultChat = Uchat;
    let text = truncate(inputText, 74);
    setUchat({ ...defaultChat });
    setInputText("");
    console.log(Uchat);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("Attachments", file);
    });
    formData.append("Chat", [text]);
    formData.append("SenderId", localStorage.userId);
    formData.append("ReceiverId", uid1);
    formData.append("IsGroup", _isGroup == "true" ? true : false);
    formData.append("ConversationId", "1");
    formData.append("IsFromMe", true);
    const inputData = {
      SenderId: localStorage.userId,
      ReceiverId: uid1,
      IsGroup: _isGroup == "true" ? true : false,
      ConversationId: "",
      IsFromMe: true,
      Chat: [text],
    };

    PostMessage(formData).then((response) => {
      GetMessages(localStorage.userId, id, _isGroup).then((response) => {
        setUchat(response);
        setSelectedFiles([]);
        setCurrentPreview(0);
        setShowAttachmentPreview(false);
        setInputText("");
      });
    });
  };
  const sendAttachments = async () => {
    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("Attachments", file);
    });

    formData.append("Message", inputText);
    setSelectedFiles([]);
    setCurrentPreview(0);
    setShowAttachmentPreview(false);
    setInputText("");
  };
  const onRemoveMessage = async (message) => {
    const messageId = message?.messageId ?? message?.MessageId;
    if (!Number.isInteger(Number(messageId)) || Number(messageId) <= 0) {
      toast.error("Unable to delete this message because its ID is missing.");
      return;
    }
    await DeleteMessage(Number(messageId), localStorage.userId, id)
      .then((response) => {
        GetMessages(localStorage.userId, id, group).then((response) => {
          setUchat(response);
        });
      })
      .catch(() => {});
  };
  const openingClass = useRef(false);
  const goToClassSchedule = async (scheduleDetailsId) => {
    if (openingClass.current) return;
    if (!scheduleDetailsId) { toast.error("This message has no class reference."); return; }
    openingClass.current = true;
    try {
      const response = await getClassScheduleContext(scheduleDetailsId);
      const context = response?.data ?? response;
      history.push(`${process.env.PUBLIC_URL || ""}${classCalendarLink(context, localStorage.getItem("userRole"))}`);
    } catch (error) {
      toast.error("Could not open this class. It may be unavailable or you may not have access.");
    } finally {
      openingClass.current = false;
    }
  };

  const onRescheduleClass = (scheduleDetailsId) => {
    goToClassSchedule(scheduleDetailsId);
  };

  const onPostponeClass = (scheduleDetailsId) => {
    goToClassSchedule(scheduleDetailsId);
  };

  const onCancelClass = (scheduleDetailsId) => {
    goToClassSchedule(scheduleDetailsId);
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);

    setSelectedFiles(updatedFiles);

    if (updatedFiles.length === 0) {
      setShowAttachmentPreview(false);
      setCurrentPreview(0);
      return;
    }

    if (currentPreview >= updatedFiles.length) {
      setCurrentPreview(updatedFiles.length - 1);
    }
  };
  // Dock the Group Info panel beside the chat (instead of overlaying it) from
  // this width, so browsers with a smaller viewport (e.g. Edge at higher zoom)
  // get the same docked layout. The stylesheet only reserves room for the
  // panel from 1540px (xxl), so reserve its 325px width below that.
  const PROFILE_DOCK_MIN_WIDTH = 1400;
  const isProfileDocked = sidebar && window.innerWidth > PROFILE_DOCK_MIN_WIDTH;
  const chatBodyClass = classNames({
    "nk-chat-body": true,
    "show-chat": mobileView,
    "profile-shown": isProfileDocked,
  });
  const chatBodyStyle = isProfileDocked && window.innerWidth < 1540 ? { paddingRight: "325px" } : undefined;
  const currentFile = selectedFiles[currentPreview];
  const isPartnerOnline = !group && onlineUserIds?.has(String(id));
  // WhatsApp-style group subtitle: the member list, not online/last-seen —
  // that's a 1:1 chat concept and doesn't map cleanly onto a group.
  const groupMemberList = group
    ? (Uchat?.user || [])
        .map((u) => (String(u.id) === String(localStorage.getItem("userId")) ? "You" : u.nickname || u.name || u.firstName))
        .filter(Boolean)
    : [];
  // Header shows only the first few names, then "+N" for the rest; the full
  // list stays available as a tooltip.
  const GROUP_HEADER_NAME_COUNT = 3;
  const groupMemberNames = groupMemberList.join(", ");
  const groupMemberHiddenCount = Math.max(0, groupMemberList.length - GROUP_HEADER_NAME_COUNT);
  const groupMemberSummary =
    groupMemberList.slice(0, GROUP_HEADER_NAME_COUNT).join(", ") +
    (groupMemberHiddenCount > 0 ? ` +${groupMemberHiddenCount}` : "");
  // Uchat.active is a REST-only snapshot from whenever the chat was loaded —
  // `true` just means "logged in within the last hour" at that moment, and
  // goes stale the instant the person actually logs out. Once we have a live
  // SignalR read (isPartnerOnline) that must win; the boolean form of
  // Uchat.active is only trustworthy as a fallback when we have no live
  // signal at all, e.g. before the socket has connected.
  const lastSeenText =
    typeof Uchat?.active === "string" ? (
      <>
        <span className="d-none d-sm-inline mr-1">Active </span> {`${Uchat.active} ago `}
      </>
    ) : (
      "Offline"
    );
  return (
    <React.Fragment>
      <audio
  ref={remoteAudioRef}
  autoPlay
  playsInline
  controls={false}
  muted={false}
  volume={1.0}
/>
<VoiceCallOverlay
  incomingCall={incomingCall}
  activeCall={activeCall}
    outgoingCall={outgoingCall}
  onAccept={acceptVoiceCall}
  onReject={rejectVoiceCall}
  onEnd={endVoiceCall}
  onMute={toggleMuteVoiceCall}
/>
        {/* ==================== INCOMING VOICE CALL ==================== */}
    
      <ImageViewer
        open={imageViewer.open}
        images={imageViewer.images}
        currentIndex={imageViewer.index}
        setCurrentIndex={(index) =>
          setImageViewer((prev) => ({
            ...prev,
            index,
          }))
        }
        onClose={() =>
          setImageViewer((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
      {Uchat && (
        <>
          {Object.keys(Uchat).length > 0 && (
            <div className={chatBodyClass} style={chatBodyStyle}>
              <div className="nk-chat-head">
                <ul className="nk-chat-head-info">
                  <li className="nk-chat-body-close" onClick={() => setMobileView(false)}>
                    <a
                      href="#hide-chat"
                      onClick={(ev) => {
                        ev.preventDefault();
                      }}
                      className="btn btn-icon btn-trigger nk-chat-hide ml-n1"
                    >
                      <Icon name="arrow-left"></Icon>
                    </a>
                  </li>
                  <li
                    className="nk-chat-head-user"
                    // Groups: the header opens Group Info, same as the info icon.
                    onClick={group ? () => toggleMenu() : undefined}
                    style={group ? { cursor: "pointer" } : undefined}
                    title={group ? "Group info" : undefined}
                  >
                    <div className="user-card">
                      {Uchat.group ? (
                        <div className="chat-media user-avatar user-avatar-multiple">
                          {Uchat.user?.map((user, index) => {
                            return (
                              <>
                                <UserAvatar1
                                  group={true}
                                  className="chat-media"
                                  theme={getColor(user.name)}
                                  text={findUpper1(user.name)}
                                  key={index}
                                ></UserAvatar1>
                              </>
                            );
                          })}
                          <span className={"status dot dot-lg dot-success"}></span>
                        </div>
                      ) : (
                        <>
                          <UserAvatar1
                            className="chat-media"
                            theme={getColor(Uchat.nickname)}
                            text={findUpper1(Uchat.nickname)}
                          >
                            <span className={`status dot dot-lg dot-${isPartnerOnline ? "success" : "gray"}`}></span>
                          </UserAvatar1>
                        </>
                      )}
                      <div className="user-info">
                        {Uchat.group ? (
                          <>
                            <div className="lead-text" title={Uchat.name || Uchat.groupName}>{Uchat.name || Uchat.groupName || "Class group"}</div>
                            {Uchat.groupName && Uchat.groupName !== Uchat.name && <div className="sub-text">{Uchat.groupName}</div>}
                          </>
                        ) : (
                          <>
                            <div className="lead-text">{Uchat.nickname ? Uchat.nickname : Uchat.name}</div>
                          </>
                        )}

                        <div className="sub-text">
                          {isPartnerTyping ? (
                            <span className="text-primary">Typing…</span>
                          ) : Uchat.group ? (
                            <span title={groupMemberNames}>{groupMemberSummary}</span>
                          ) : isPartnerOnline ? (
                            <span className="text-success">Online</span>
                          ) : (
                            lastSeenText
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
                {/*<ul className="nk-chat-head-tools">
                  {group && (
                    <>
                      <li className="mr-n1 mr-md-n2">
                        <a
                          href="#alert"
                          onClick={(e) => {
                            e.preventDefault();
                            toggleMenu();
                          }}
                          className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
                        >
                          <Icon name="alert-circle-fill"></Icon>
                        </a>
                      </li>
                    </>
                  )}
                </ul>*/}
                <ul className="nk-chat-head-tools">
  {!group && (
    <li className="mr-n1 mr-md-n2">
      <Button
        color="light"
        className="btn-icon btn-trigger"
        onClick={() => startVoiceCall(id)}
        title="Voice Call"
      >
        <Icon name="call" />
      </Button>
    </li>
  )}

  {group && (
    <>
      {canViewGroupAttendance && (
      <li className="mr-1">
        <a
          href="#attendance"
          onClick={(e) => {
            e.preventDefault();
            attendanceOpen ? closeAttendance() : openAttendance();
          }}
          className={`btn btn-icon btn-trigger text-primary tct-att-toggle${attendanceOpen ? " active" : ""}`}
          title="View Student Attendance"
          aria-label="View Student Attendance"
          aria-pressed={attendanceOpen}
        >
          <Icon name="calendar-alt"></Icon>
        </a>
      </li>
      )}
      <li className="mr-n1 mr-md-n2">
        <a
          href="#alert"
          onClick={(e) => {
            e.preventDefault();
            toggleMenu();
          }}
          className="btn btn-icon btn-trigger text-primary chat-profile-toggle"
          title="Group info"
          aria-label="Group info"
        >
          <Icon name="alert-circle-fill"></Icon>
        </a>
      </li>
    </>
  )}
</ul>
              </div>
              {showAttachmentPreview ? (
                <div className="attachment-body-preview">
                  <div className="attachment-preview-header">
                    <button
                      className="preview-close"
                      onClick={() => {
                        setSelectedFiles([]);
                        setSelectedFile(null);
                        setShowAttachmentPreview(false);
                      }}
                    >
                      ✕
                    </button>

                    <span>{selectedFile?.name}</span>
                  </div>
                  <div className="attachment-preview-content">
                    {currentFile?.type?.startsWith("image/") ? (
                      <img src={URL.createObjectURL(currentFile)} alt="" className="image-preview-large" alt="" />
                    ) : (
                      <div className="attachment-document-preview">
                        <Icon name="file-docs" />
                        <h4>No preview available</h4>
                        <span>{currentFile?.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="attachment-strip">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className={`attachment-thumb ${currentPreview === index ? "active" : ""}`}
                        onClick={() => setCurrentPreview(index)}
                      >
                        {file.type.startsWith("image/") ? (
                          <img src={URL.createObjectURL(file)} alt="" />
                        ) : (
                          <div className="doc-thumb">📄</div>
                        )}

                        <button
                          className="thumb-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    <button className="add-more-btn" onClick={() => fileInputRef.current.click()}>
                      +
                    </button>
                  </div>

                  <div className="attachment-preview-footer">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type a message"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />

                    <Button color="primary" className="btn-round btn-icon" onClick={(e) => onTextSubmit(e)}>
                      <Icon name="send-alt" />
                    </Button>
                  </div>
                </div>
              ) : (
                <SimpleBar className="nk-chat-panel" scrollableNodeProps={{ ref: messagesEndRef }}>
                  {Uchat?.convo?.map((item, idx) => {
                    if (item.me) {
                      return (
                        <MeChat
                          key={idx}
                          item={item}
                          chat={Uchat}
                          onRemoveMessage={onRemoveMessage}
                          onOpenImageViewer={(images, index) => {
                            setImageViewer({
                              open: true,
                              images,
                              index,
                            });
                          }}
                          onMessageInfo={(itemId) => { 
                            setSelectedItemId(itemId);
                            setShowInfo(true);
                          }}
                        />
                      );
                    } else if (item.meta) {
                      return <MetaChat key={idx} item={item.meta.metaText} />;
                    } else {
                      return (
                        <YouChat
                          key={idx}
                          item={item}
                          chat={Uchat}
                          onOpenImageViewer={(images, index) => {
                            setImageViewer({
                              open: true,
                              images,
                              index,
                            });
                          }}
                          onRescheduleClass={onRescheduleClass}
                          onPostponeClass={onPostponeClass}
                          onCancelClass={onCancelClass}
                        />
                      );
                    }
                  })}
                </SimpleBar>
              )}

              <input type="file" ref={fileInputRef} multiple style={{ display: "none" }} onChange={handleFileChange} />
              <div className="nk-chat-editor">
                <div className="nk-chat-editor-upload  ml-n1">
                  <Button
                    size="sm"
                    className={`btn-icon btn-trigger text-primary toggle-opt ${chatOptions ? "active" : ""}`}
                    onClick={() => onChatOptions()}
                  >
                    <Icon name="plus-circle-fill"></Icon>
                  </Button>
                  <div className={`chat-upload-option whatsapp-attachment-menu ${chatOptions ? "expanded" : ""}`}>
                    <ul>
                      <li>
                        <a
                          href="#img"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAttachmentClick("image");
                          }}
                        >
                          <Icon name="img-fill" />
                        </a>
                      </li>

                      <li>
                        <a
                          href="#document"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAttachmentClick("document");
                          }}
                        >
                          <Icon name="file-docs" />
                        </a>
                      </li>

                      <li>
                        <a
                          href="#audio"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAttachmentClick("audio");
                          }}
                        >
                          <Icon name="mic" />
                        </a>
                      </li>

                      <li>
                        <a
                          href="#camera"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAttachmentClick("image");
                          }}
                        >
                          <Icon name="camera-fill" />
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
                {selectedFile && (
                  <div className="attachment-preview border rounded p-2 mb-2 d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{selectedFile.name}</strong>
                      <div className="text-muted small">{(selectedFile.size / 1024).toFixed(2)} KB</div>
                    </div>

                    <Button size="sm" color="danger" onClick={() => setSelectedFile(null)}>
                      Remove
                    </Button>
                  </div>
                )}
                {Uchat.isActive === true && (
                  <div className="nk-chat-editor-form">
                    <div className="form-control-wrap">
                      <textarea
                        className="form-control form-control-simple no-resize"
                        rows="1"
                        id="default-textarea"
                        onChange={(e) => onInputChange(e)}
                        value={inputText}
                        placeholder="Type your message...sss"
                        onKeyDown={(e) => {
                          e.code === "Enter" && e.target.value != "" && onTextSubmit(e);
                        }}
                      ></textarea>
                    </div>
                  </div>
                )}
                <ul className="nk-chat-editor-tools g-2">
                  {inputText != "" && inputText != null && inputText != undefined && (
                    <li>
                      <Button color="primary" onClick={(e) => onTextSubmit(e)} className="btn-round btn-icon">
                        <Icon name="send-alt"></Icon>
                      </Button>
                    </li>
                  )}
                </ul>
              </div>
              <ChatSideBar sidebar={sidebar} chat={Uchat} />
              {showInfo == true && (
                <>
                  <MessageInfoSidebar sidebar={showInfo} currentMessage={selectedItemId} chat={Uchat} onClose={() => setShowInfo(false)} />
                </>
              )}

              {window.innerWidth <= PROFILE_DOCK_MIN_WIDTH && sidebar && (
                <div onClick={() => toggleMenu()} className="nk-chat-profile-overlay" />
              )}
            </div>
          )}
          {group && canViewGroupAttendance && attendanceOpen && Object.keys(Uchat).length > 0 && (
            <aside className="tct-att-panel" aria-label="Student attendance">
              <style>{attendanceSplitStyle}</style>
              <div className="tct-att-head">
                <div>
                  <h6 className="tct-att-title">Student Attendance</h6>
                  <span className="tct-att-sub">
                    {(attendanceStudents || []).find((st) => st.id === attendanceStudentId)?.name ||
                      "Select a student"}{" "}
                    · {Uchat.groupName || Uchat.name}
                  </span>
                </div>
                <button type="button" className="btn tct-att-back" onClick={closeAttendance}>
                  <Icon name="chat"></Icon>
                  <span>Go to Chat</span>
                </button>
              </div>
              <div className="tct-att-picker">
                <label htmlFor="tct-att-student">Student</label>
                {attendanceStudents === null ? (
                  <span className="tct-att-note">Loading students…</span>
                ) : attendanceError ? (
                  <span className="tct-att-note is-error">{attendanceError}</span>
                ) : attendanceStudents.length === 0 ? (
                  <span className="tct-att-note">No student records were found for this group's members.</span>
                ) : (
                  <select
                    id="tct-att-student"
                    value={attendanceStudentId}
                    onChange={(e) => setAttendanceStudentId(e.target.value)}
                  >
                    <option value="">Select a student</option>
                    {attendanceStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                        {st.code ? ` (${st.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="tct-att-body">
                {attendanceStudentId ? (
                  // Existing schedule/attendance calendar (same as the student calendar page), narrowed to
                  // the selected student. Tutors keep their tutor scope; other roles query the student's
                  // schedule (Coordinator/Operations keep their own scope inside the calendar).
                  <div className="tct-att-calendar">
                    <TCTScheduleCalender
                      key={attendanceStudentId}
                      guestType={localStorage.getItem("roleId") == "13" ? "tutor" : "student"}
                      guestUserId={
                        localStorage.getItem("roleId") == "13"
                          ? undefined
                          : (attendanceStudents || []).find((st) => st.id === attendanceStudentId)?.userId
                      }
                      filterStudentId={attendanceStudentId}
                    />
                  </div>
                ) : (
                  <div className="tct-att-empty">
                    <Icon name="calendar-alt"></Icon>
                    <span>Select a student from this group to view their attendance.</span>
                  </div>
                )}
              </div>
            </aside>
          )}
        </>
      )}
    </React.Fragment>
  );
};

export default ChatBody;

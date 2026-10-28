import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { Icon, UserAvatar } from "../../../components/Component";
import SimpleBar from "simplebar-react";
import {
  Input,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";
import { ChatItem, ContactItem } from "./ChatPartials";
import AddGroup from "./AddGroup";
import { findUpper } from "../../../utils/Utils";
import { chatData } from "./ChatData";
import { ChatContext } from "./ChatContext";
import {
  GetChatLabels,
  GetChatLabel,
  CreateChatLabel,
  AddChatLabelMember,
  RemoveChatLabelMember,
  DeleteChatLabel,
  getChatContacts,
  GetGroupContacts,
  ReadChatMessages,
ReadGroupMessages,
GetLatestMessages,
GetMessages,
GetHelpContacts,
} from "../../../apiservices/ChatService";
import { useLocation, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import UserAvatar1 from "../../../components/user/UserAvatar1";
import { findUpper1, getColor, getImageUrl } from "../../../utils/Utils";
import WhatsAppGroupMenu from "./WhatsAppGroupMenu";

// Chat page styles (aside list, TCT Help, header tools, empty state). Every selector is under
// .tct-chat (only set on the /app-chat page wrapper) or .tct-chat-aside (this list).
const chatAsideStyle = `
  /* Header: "Chats" title + settings button */
  .tct-chat .nk-chat-aside-head { align-items: center; padding-top: 18px; padding-bottom: 12px; }
  .tct-chat .nk-chat-aside-user .title { font-size: 1.35rem; font-weight: 700; color: #1c2b46; }
  .tct-chat .nk-chat-aside-tools .btn-icon.btn-light {
    width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
    color: #854fff; background: #f5f1ff; border-color: transparent; transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-chat .nk-chat-aside-tools .btn-icon.btn-light:hover { color: #fff; background: #854fff; }

  /* Search */
  .tct-chat-aside .nk-chat-aside-search { margin-bottom: 18px; }
  .tct-chat-aside .nk-chat-aside-search .form-control {
    height: 40px; padding-left: 40px; font-size: 14px; color: #364a63;
    background: #f8f9fc; border: 1px solid #e5e9f2; border-radius: 10px; box-shadow: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .tct-chat-aside .nk-chat-aside-search .form-control::placeholder { color: #8094ae; }
  .tct-chat-aside .nk-chat-aside-search .form-control:focus { background: #fff; border-color: #854fff; box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.12); }
  .tct-chat-aside .nk-chat-aside-search .form-icon { width: 40px; color: #8094ae; }

  /* Section titles */
  .tct-chat-aside .nk-chat-list .overline-title-alt { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #8094ae; }

  /* TCT Help: readable, purple, comfortable click area */
  .tct-chat-aside .tct-help-link {
    display: inline-flex; align-items: center; gap: 4px; margin-right: -8px; padding: 5px 8px;
    border-radius: 8px; color: #6a35e8; cursor: pointer; user-select: none;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .tct-chat-aside .tct-help-link .overline-title-alt { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: inherit; }
  .tct-chat-aside .tct-help-link .icon { font-size: 15px; }
  .tct-chat-aside .tct-help-link:hover { background: #f5f1ff; color: #4c1fd0; }
  .tct-chat-aside .tct-help-link:focus { outline: none; }
  .tct-chat-aside .tct-help-link:focus-visible { box-shadow: 0 0 0 3px rgba(133, 79, 255, 0.22); }

  /* Chat rows */
  .tct-chat-aside .wa-group-header {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin: 2px 0;
    border-radius: 12px; cursor: pointer; transition: background-color 0.15s ease, box-shadow 0.15s ease;
  }
  .tct-chat-aside .wa-group-header:hover { background: #f7f4ff; }
  .tct-chat-aside .wa-group-header.selected { background: #efe8ff; box-shadow: inset 3px 0 0 #854fff; }
  .tct-chat-aside .wa-group-left { display: flex; align-items: center; gap: 12px; flex: 1 1 auto; min-width: 0; }
  .tct-chat-aside .wa-group-info { flex: 1 1 auto; min-width: 0; }
  .tct-chat-aside .wa-group-name {
    font-size: 14px; font-weight: 600; color: #1c2b46;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .tct-chat-aside .wa-group-message {
    margin-top: 2px; font-size: 13px; color: #8094ae;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .tct-chat-aside .wa-group-header.selected .wa-group-name { color: #4c1fd0; }
  .tct-chat-aside .wa-group-meta { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .tct-chat-aside .wa-group-top { display: flex; align-items: center; gap: 4px; }
  .tct-chat-aside .wa-group-time, .tct-chat-aside .wa-subject-time { font-size: 11.5px; color: #8094ae; white-space: nowrap; }
  .tct-chat-aside .wa-group-bottom { min-height: 20px; }
  .tct-chat-aside .chat-unread-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
    font-size: 11px; font-weight: 700; line-height: 1; color: #fff; background: #854fff;
  }
  .tct-chat-aside .wa-subject-item { border-radius: 10px; transition: background-color 0.15s ease; }
  .tct-chat-aside .wa-subject-item:hover { background: #f7f4ff; }
  .tct-chat-aside .wa-subject-item.selected { background: #efe8ff; }
  .tct-chat-aside .wa-subject-info { min-width: 0; }
  .tct-chat-aside .wa-subject-name, .tct-chat-aside .wa-subject-message { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* No search results */
  .tct-chat-aside .tct-chat-search-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 16px; text-align: center; }
  .tct-chat-aside .tct-chat-search-empty-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; border-radius: 50%; font-size: 22px; color: #854fff; background: #f5f1ff;
  }
  .tct-chat-aside .tct-chat-search-empty-title { font-size: 14px; font-weight: 600; color: #364a63; }
  .tct-chat-aside .tct-chat-search-empty-text { font-size: 13px; color: #8094ae; }

  /* Main area empty state (no conversation selected) */
  .tct-chat .nk-chat-blank-icon .icon-circle {
    color: #854fff; background: #f5f1ff !important; box-shadow: 0 8px 24px rgba(133, 79, 255, 0.15);
  }
  .tct-chat .nk-chat-blank-btn { margin-top: 20px; }
  .tct-chat .nk-chat-blank-btn .btn {
    height: 42px; padding: 0 24px; border-radius: 10px; font-weight: 600;
    box-shadow: 0 6px 16px rgba(133, 79, 255, 0.25);
  }
`;

// Display names a chat row can match on (group/wrapper name, subject names, person names).
const chatSearchNames = (entry) => {
  const names = [entry?.name, entry?.nickname, entry?.groupName];
  (entry?.items || []).forEach((item) => names.push(item?.name, item?.nickname, item?.groupName));
  return names.filter(Boolean).map((name) => String(name).toLowerCase());
};

export const ChatAsideBody = ({
  onInputChange,
  favState,
  favFilter,
  setFavState,
  selectedId,
  showFavSection,
  setSelectedId,
  favInputSearchChange,
  favFilterText,
  filterTab,
  chatItemClick,
  GetChats,
  filteredChatList1 = [],
  filteredChatList = [],
}) => {
  
  
  const { fav, favAction, chatDataSourceState } = useContext(ChatContext);
  const [, setChatDataSource] = chatDataSourceState;

const [chatLabels, setChatLabels] = useState([]);

const [labelChatList, setLabelChatList] = useState(null);

const labelScrollStyle = `
  .label-horizontal-scroll::-webkit-scrollbar {
    display: none;
  }
`;

const [selectedLabelId, setSelectedLabelId] = useState("__all__");
// Chat search text. The parent's onInputChange is still called, but it filters Chat.js's
// demo chatData (not the list shown here), so the visible list is filtered with this value.
const [chatSearchText, setChatSearchText] = useState("");

const [isCreatingLabel, setIsCreatingLabel] = useState(false);

const [labelContextMenu, setLabelContextMenu] = useState(null);

useEffect(() => {
  const handleOutsideClick = () => {
    setLabelContextMenu(null);
  };

  document.addEventListener("click", handleOutsideClick);

  return () => {
    document.removeEventListener("click", handleOutsideClick);
  };
}, []);

const [deleteLabelId, setDeleteLabelId] = useState(null);

const [showAddMembers, setShowAddMembers] = useState(false);

const [showDeleteLabelConfirm, setShowDeleteLabelConfirm] = useState(false);

const [showCreateLabel, setShowCreateLabel] = useState(false);

const [newLabelName, setNewLabelName] = useState("");

const [memberUsers, setMemberUsers] = useState([]);

const [memberGroups, setMemberGroups] = useState([]);

const [memberSearch, setMemberSearch] = useState("");

// TCT Help: support contacts for the logged-in tutor/student.
const helpUserRole = (localStorage.getItem("userRole") || "").trim().toLowerCase();
const showTctHelp = helpUserRole === "tutor" || helpUserRole === "student";
const [tctHelpOpen, setTctHelpOpen] = useState(false);
const [helpContacts, setHelpContacts] = useState([]);
const [helpLoading, setHelpLoading] = useState(false);
const [helpError, setHelpError] = useState(false);

const loadHelpContacts = async () => {
  setHelpLoading(true);
  setHelpError(false);

  try {
    const response = await GetHelpContacts();
    const contacts = Array.isArray(response) ? response : response?.data || [];

    // Deduplicate by user ID.
    setHelpContacts(
      contacts.filter(
        (contact, index, list) =>
          contact?.id && list.findIndex((c) => c.id === contact.id) === index
      )
    );
  } catch (error) {
    console.error("Error loading TCT Help contacts:", error);
    setHelpContacts([]);
    setHelpError(true);
  } finally {
    setHelpLoading(false);
  }
};

const handleTctHelpClick = () => {
  const nextOpen = !tctHelpOpen;
  setTctHelpOpen(nextOpen);

  if (nextOpen) {
    loadHelpContacts();
  }
};

const helpSections = [
  {
    title: "Coordinator",
    contacts: helpContacts.filter((c) => c.role === "Coordinator"),
  },
  {
    title: "Operations",
    contacts: helpContacts.filter((c) => c.role === "Operations"),
  },
  ...(helpUserRole === "tutor"
    ? [
        {
          title: "Payroll",
          contacts: helpContacts.filter(
            (c) => c.role === "Payroll" || c.role === "PayrollAdmin"
          ),
          emptyText: "No Payroll contacts available.",
        },
      ]
    : []),
];

const hasAssignedHelpContacts =
  helpSections[0].contacts.length > 0 || helpSections[1].contacts.length > 0;
// Right-click "Mark as read" menu for a single chat/group row.
const [chatContextMenu, setChatContextMenu] = useState(null);
// Set after a successful mark-as-read so the current filter/label view is
// re-applied once the refreshed chat data arrives.
const [refreshViewAfterRead, setRefreshViewAfterRead] = useState(false);

useEffect(() => {
  const closeChatContextMenu = () => setChatContextMenu(null);

  document.addEventListener("click", closeChatContextMenu);

  return () => {
    document.removeEventListener("click", closeChatContextMenu);
  };
}, []);

// Works out which chats/groups a right-clicked row stands for, with their
// unread counts. Rows are rendered by WhatsAppGroupMenu, one top-level
// element per displayChatList entry (subjects nested inside open folders).
const getMarkAsReadTargets = (entry, subjectIndex) => {
  if (!entry) {
    return [];
  }

  // Group wrapper (one or more groups sharing a name)
  if (Array.isArray(entry.items) && entry.items.length > 0) {
    const items =
      subjectIndex != null
        ? [entry.items[subjectIndex]].filter(Boolean)
        : entry.items;

    return items
      .filter((item) => item?.id)
      .map((item) => ({
        type: item.group === false ? "user" : "group",
        id: item.id,
        unread:
          entry.items.length === 1
            ? Number(item.unReadCount || entry.unReadCount || 0)
            : Number(item.unReadCount || 0),
      }));
  }

  if (!entry.id) {
    return [];
  }

  return [
    {
      type: entry.group === true ? "group" : "user",
      id: entry.id,
      unread: Number(entry.unReadCount || entry.unreadCount || 0),
    },
  ];
};

const handleChatContextMenu = (e) => {
  const menuRoot = e.currentTarget.querySelector(".wa-group-menu");
  const row = e.target.closest(".wa-group-menu > *");

  if (!menuRoot || !row) {
    return;
  }

  const entry = displayChatList[Array.from(menuRoot.children).indexOf(row)];

  const subjectRow = e.target.closest(".wa-subject-item");
  const subjectIndex = subjectRow
    ? Array.from(subjectRow.parentElement.children).indexOf(subjectRow)
    : null;

  const targets = getMarkAsReadTargets(entry, subjectIndex).filter(
    (target) => target.unread > 0
  );

  // Nothing unread here — no menu, no request.
  if (targets.length === 0) {
    return;
  }

  e.preventDefault();
  setLabelContextMenu(null);
  setChatContextMenu({
    x: e.clientX,
    y: e.clientY,
    targets,
    // Sidebar edges, so the menu can be kept inside it when rendered.
    bounds: e.currentTarget.getBoundingClientRect(),
  });
};

// Places the Mark-as-read menu beside the pointer, flipping left/up when it
// would overflow the sidebar or the viewport.
const CHAT_MENU_WIDTH = 170;
const CHAT_MENU_HEIGHT = 46;
const getChatContextMenuPosition = (menu) => {
  const gap = 6;
  const margin = 8;
  const rightLimit = Math.min(
    window.innerWidth - margin,
    menu.bounds?.right ?? window.innerWidth
  );
  const leftLimit = Math.max(margin, menu.bounds?.left ?? 0);
  const bottomLimit = window.innerHeight - margin;

  let left = menu.x + gap;
  if (left + CHAT_MENU_WIDTH > rightLimit) {
    left = menu.x - gap - CHAT_MENU_WIDTH;
  }
  left = Math.max(leftLimit, Math.min(left, rightLimit - CHAT_MENU_WIDTH));

  let top = menu.y + gap;
  if (top + CHAT_MENU_HEIGHT > bottomLimit) {
    top = menu.y - gap - CHAT_MENU_HEIGHT;
  }
  top = Math.max(margin, top);

  return { left, top };
};

const handleMarkAsRead = async (targets) => {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    console.error("User ID not found in localStorage");
    return;
  }

  try {
    for (const target of targets) {
      if (target.type === "group") {
        // Only this group, only for the current user.
        await ReadGroupMessages(target.id, userId);
      } else {
        // Personal chat — unread messages sit in every conversation the
        // other user started, not only the latest chatId, so mark each.
        const history = await GetMessages(userId, target.id, false);
        const incomingConversationIds = [
          ...new Set(
            (history?.convo || [])
              .filter((conversation) => conversation.me === false)
              .map((conversation) => conversation.id)
          ),
        ];

        for (const conversationId of incomingConversationIds) {
          await ReadChatMessages(conversationId, userId);
        }
      }
    }
  } catch (error) {
    console.error("Error marking chat as read:", error);
    toast.error("Could not mark as read. Please try again.");
    return;
  }

  try {
    const response = await GetLatestMessages(userId);
    setRefreshViewAfterRead(true);
    setChatDataSource(response);
  } catch (error) {
    console.error("Error refreshing chats after mark as read:", error);
  }
};
 const handleLabelClick = async (label) => {
  // Permanent All list
  if (label.id === "__all__") {
    setSelectedLabelId("__all__");
    setSelectedMembers([]);
    setLabelChatList(filteredChatList1);

    console.log("All chats selected:", filteredChatList1);

    return;
  }

  try {
    console.log("Clicked label:", label);

    const response = await GetChatLabel(label.id);

    console.log("Selected label details:", response);

    const members =
      response?.members ||
      response?.data?.members ||
      [];

    console.log("Label members from API:", members);

    // Convert API members into a simple format
    const normalizedMembers = members
      .map((member) => {
        if (member.userId) {
          return {
            type: "user",
            id: member.userId,
          };
        }

        if (member.groupId) {
          return {
            type: "group",
            id: member.groupId,
          };
        }

        return null;
      })
      .filter(Boolean);

    console.log("Normalized label members:", normalizedMembers);

    setSelectedLabelId(label.id);
    setSelectedMembers(normalizedMembers);

    // -----------------------------------------
    // FIND ALL USERS FROM THE LABEL
    // -----------------------------------------

    const labelUserIds = normalizedMembers
      .filter((member) => member.type === "user")
      .map((member) => member.id);

    const labelGroupIds = normalizedMembers
      .filter((member) => member.type === "group")
      .map((member) => member.id);

    console.log("Label user IDs:", labelUserIds);
    console.log("Label group IDs:", labelGroupIds);

    // Find users from complete memberUsers list
    // -----------------------------------------
// LOAD COMPLETE USERS AND GROUPS
// -----------------------------------------

const userId = localStorage.getItem("userId");

const [usersResponse, groupsResponse] = await Promise.all([
  getChatContacts(userId),
  GetGroupContacts(userId),
]);

const allUsers = Array.isArray(usersResponse)
  ? usersResponse
  : usersResponse?.data || [];

const allGroups = Array.isArray(groupsResponse)
  ? groupsResponse
  : groupsResponse?.data || [];

console.log("ALL USERS FOR LABEL:", allUsers);
console.log("ALL GROUPS FOR LABEL:", allGroups);

// -----------------------------------------
// FIND ALL USERS FROM THE LABEL
// -----------------------------------------

const labelUsers = allUsers
  .filter((user) => labelUserIds.includes(user.id))
  .map((user) => ({
    ...user,
    group: false,
  }));

// -----------------------------------------
// FIND ALL GROUPS FROM THE LABEL
// -----------------------------------------

// Use the freshly loaded groups (memberGroups is only filled when the
// Add-members modal opens), normalized the same way as loadMembers.
const labelGroups = allGroups
  .map((group) => ({
    ...group,
    id:
      group.id ||
      group.Id ||
      group.groupId ||
      group.GroupId ||
      group.groupID ||
      group.GroupID ||
      group.items?.[0]?.id,
  }))
  .filter((group) => labelGroupIds.includes(group.id));

console.log("LABEL USERS:", labelUsers);
console.log("LABEL GROUPS:", labelGroups);

    console.log("LABEL USERS:", labelUsers);
    console.log("LABEL GROUPS:", labelGroups);

    // -----------------------------------------
    // ALSO KEEP EXISTING CHAT DATA
    // -----------------------------------------

    const existingChats = filteredChatList1.filter((chat) => {
  return !chat.group && labelUserIds.includes(chat.id);
});

    console.log("EXISTING LABEL CHATS:", existingChats);

    // -----------------------------------------
    // COMBINE USERS + GROUPS + EXISTING CHATS
    // -----------------------------------------

    const combinedLabelList = [
  // Existing chats keep their normal chat data
  ...existingChats,

  // Add every label user, even if they have never chatted
  ...labelUsers
    .filter(
      (user) =>
        !existingChats.some(
          (chat) => chat.id === user.id
        )
    )
    .map((user) => ({
      ...user,
      id: user.id,
      group: false,
      name:
        user.name ||
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "Unknown User",
      nickname: user.nickname || "",
      theme: user.theme || null,
      items: [],
    })),

  // Add every label group, even if it has never had a chat
  ...labelGroups
    .filter(
      (group) =>
        !existingChats.some(
          (chat) => chat.id === group.id
        )
    )
    .map((group) => ({
      ...group,
      id: group.id,
      group: true,
      name: group.name || "Unknown Group",
      nickname: group.nickname || "",
      theme: group.theme || null,
      items: [],
    })),
];
    console.log(
      "FINAL LABEL LIST:",
      combinedLabelList
    );

    setLabelChatList(combinedLabelList);

  } catch (error) {
    console.error(
      "Error loading label details:",
      error
    );
  }
};

const handleDeleteLabel = () => {
  const labelId = labelContextMenu?.labelId;

  console.log("Context menu label ID:", labelId);

  if (!labelId) {
    console.log("No label ID found");
    return;
  }

  setDeleteLabelId(labelId);
  setShowDeleteLabelConfirm(true);
  setLabelContextMenu(null);
};

const [selectedMembers, setSelectedMembers] = useState([]);

// Create-list modal: "Included" chips built from the current selection.
const INCLUDED_PREVIEW_COUNT = 3;
const [showAllIncluded, setShowAllIncluded] = useState(false);

const includedItems = selectedMembers
  .filter((member) => member?.id && (member.type === "user" || member.type === "group"))
  .map((member) => {
    if (member.type === "user") {
      const user = memberUsers.find((u) => u.id === member.id);
      const name =
        user?.fullName?.trim() ||
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        user?.nickname ||
        "Unknown user";
      return { key: `user-${member.id}`, name, kind: "Person" };
    }

    const group = memberGroups.find(
      (g) => g.items?.[0]?.id === member.id || g.id === member.id
    );
    return {
      key: `group-${member.id}`,
      name: group?.name || "Unknown group",
      kind: "Group",
    };
  });

const visibleIncludedItems = showAllIncluded
  ? includedItems
  : includedItems.slice(0, INCLUDED_PREVIEW_COUNT);
const hiddenIncludedCount = includedItems.length - visibleIncludedItems.length;

const loadMembers = async () => {
  try {
    const userId = localStorage.getItem("userId");
  

    console.log("Loading members...");
    console.log("User ID:", userId);

    if (!userId) {
      console.error("User ID not found in localStorage");
      return;
    }

    const [usersResponse, groupsResponse] = await Promise.all([
      getChatContacts(userId),
      GetGroupContacts(userId),
    ]);
  


    console.log("Users API response:", usersResponse);
console.log("Groups API response:", groupsResponse);

const users = Array.isArray(usersResponse)
  ? usersResponse
  : usersResponse?.data || [];

const groups = Array.isArray(groupsResponse)
  ? groupsResponse
  : groupsResponse?.data || [];

 const normalizedGroups = groups.map((group) => ({
  ...group,
  id:
    group.id ||
    group.Id ||
    group.groupId ||
    group.GroupId ||
    group.groupID ||
    group.GroupID ||
    group.items?.[0]?.id,
}));
console.log("NORMALIZED GROUPS:", normalizedGroups);
console.log(
  "GROUP ID CHECK:",
  normalizedGroups.map((g) => ({
    name: g.name,
    id: g.id,
    groupId: g.groupId,
    Id: g.Id,
    GroupId: g.GroupId,
    firstItemId: g.items?.[0]?.id,
  }))
);

setMemberUsers(users);
setMemberGroups(normalizedGroups);

console.log("Users loaded:", users);
console.log("Groups loaded:", normalizedGroups);
console.log(
  "GROUP IDS:",
  normalizedGroups.map((group) => ({
    name: group.name,
    id: group.id,
  }))
);
  } catch (error) {
    console.error("Error loading users and groups:", error);
  }
};
const handleAddMembersToLabel = async () => {
  try {
  console.log("handleAddMembersToLabel STARTED");
    if (!selectedLabelId || selectedLabelId === "__all__") {
  console.log("STOPPED: selectedLabelId =", selectedLabelId);
  return;
}

console.log("selectedLabelId OK:", selectedLabelId);

    const response = await GetChatLabel(selectedLabelId);

    const existingMembers =
      response?.members ||
      response?.data?.members ||
      [];

    console.log("Existing label members:", existingMembers);

    const newMembers = selectedMembers.filter((selected) => {
      return !existingMembers.some(
        (existing) =>
          (selected.type === "user" &&
            existing.userId === selected.id) ||
          (selected.type === "group" &&
            existing.groupId === selected.id)
      );
    });

    console.log("New members to add:", newMembers);

    await Promise.all(
      newMembers.map((member) => {
        if (member.type === "user") {
          return AddChatLabelMember(
            selectedLabelId,
            member.id,
            null
          );
        }

        if (member.type === "group") {
          return AddChatLabelMember(
            selectedLabelId,
            null,
            member.id
          );
        }

        return null;
      })
    );

    console.log("Members added successfully.");

    setShowAddMembers(false);

    const updatedLabel = await GetChatLabel(selectedLabelId);

    const updatedMembers =
  updatedLabel?.members ||
  updatedLabel?.data?.members ||
  [];

setSelectedMembers(updatedMembers);

// Refresh the currently selected label immediately
const currentLabel = chatLabels.find(
  (label) => label.id === selectedLabelId
);

if (currentLabel) {
  await handleLabelClick(currentLabel);
}

  } catch (error) {
    console.error("Error adding members to label:", error);
  }
};

useEffect(() => {
  const loadChatLabels = async () => {
    try {
      const response = await GetChatLabels();

      console.log("Chat labels loaded:", response);

const labels = Array.isArray(response)
  ? response
  : response?.data || [];

setChatLabels(labels);
    } catch (error) {
      console.error("Error loading chat labels:", error);
    }
  };

  loadChatLabels();
}, []);
const handleCreateLabel = async () => {
  const name = newLabelName.trim();

  if (!name) {
    return;
  }

  try {
    // 1. Create the label
    const response = await CreateChatLabel(name);

    console.log("Create label response:", response);

    const createdLabel = response?.data ?? response;

    if (!createdLabel || !createdLabel.id) {
      console.error("Invalid label response:", createdLabel);
      return;
    }

    // 2. Add selected users/groups to the newly created label
    if (selectedMembers.length > 0) {
      await Promise.all(
        selectedMembers.map((member) => {
          if (member.type === "user") {
            return AddChatLabelMember(
              createdLabel.id,
              member.id,
              null
            );
          }

          if (member.type === "group") {
            return AddChatLabelMember(
              createdLabel.id,
              null,
              member.id
            );
          }

          return null;
        })
      );
    }

   setChatLabels((prev) => [...prev, createdLabel]);
setNewLabelName("");
setSelectedMembers([]);
setMemberSearch("");
setIsCreatingLabel(false);
setShowCreateLabel(false);

    console.log("Label and members created successfully.");
  } catch (error) {
    console.error("Error creating chat label:", error);
  }
};

const [favData] = fav;

const defaultChat = filteredChatList.filter((item) => item.group !== true);
  console.log(filteredChatList1);
  const [unreadCountOverride, setUnreadCountOverride] = useState(null);
const calculatedUnreadCount = filteredChatList1.reduce((total, chat) => {  return (
    total +
    (chat.unread === true
      ? 1
      : Number(chat.unReadCount || chat.unreadCount || 0))
  );
}, 0);
const unreadCount =
  unreadCountOverride !== null
    ? unreadCountOverride
    : calculatedUnreadCount;
  const displayChatList =
  selectedLabelId === "__all__"
    ? filteredChatList1
    : labelChatList != null
      ? labelChatList
      : filteredChatList1;
  const chatSearchTerm = chatSearchText.trim().toLowerCase();
  const visibleChatList = chatSearchTerm
    ? displayChatList.filter((entry) => chatSearchNames(entry).some((name) => name.includes(chatSearchTerm)))
    : displayChatList;

  // After "Mark as read", re-apply the selected Unread/label view to the
  // refreshed chat data so badges and lists update in place.
  useEffect(() => {
    if (!refreshViewAfterRead) {
      return;
    }

    setRefreshViewAfterRead(false);

    if (selectedLabelId === "__unread__") {
      setLabelChatList(
        filteredChatList1.filter((chat) => {
          return (
            chat.unread === true ||
            chat.unRead === true ||
            chat.unreadCount > 0 ||
            chat.unReadCount > 0
          );
        })
      );
      return;
    }

    const currentLabel = chatLabels.find(
      (label) => label.id === selectedLabelId
    );

    if (currentLabel) {
      handleLabelClick(currentLabel);
    }
  }, [filteredChatList1]);

  return (
    <SimpleBar className="nk-chat-aside-body tct-chat-aside">
      <style>{chatAsideStyle}</style>
      <ul className="chat-list"></ul>
      <div className="nk-chat-aside-search">
        <div className="form-group">
          <div className="form-control-wrap">
            <div className="form-icon form-icon-left">
              <Icon name="search"></Icon>
            </div>
            <Input
              type="text"
              className="form-round"
              id="default-03"
              placeholder="Search chats and groups..."
              aria-label="Search chats and groups"
              onChange={(e) => {
                onInputChange(e);
                setChatSearchText(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      {showFavSection && (
        <>
          <div className="nk-chat-aside-panel nk-chat-fav">
            <h6 className="title overline-title-alt">Favorites</h6>
            <ul className="fav-list">
              <li>
                <Button
                  color="light"
                  outline
                  size="lg"
                  className="btn-icon btn-white btn-round"
                  onClick={() => setFavState(!favState)}
                >
                  <Icon name={favState ? "cross" : "plus"}></Icon>
                </Button>
              </li>
              {favData.map((user, idx) => {
                return (
                  user.fav === true && (
                    <li key={idx} onClick={() => setSelectedId(user.id)}>
                      <a href="#dropdown" onClick={(ev) => ev.preventDefault()}>
                        {/* <UserAvatar image={user.image} theme={user.theme} text={findUpper(user.name)}>
                          <span className={`status dot dot-lg dot-${user.active === true ? "success" : "gray"}`}></span>
                        </UserAvatar> */}
                        <UserAvatar1
                          className="chat-media"
                          image={getImageUrl(user)}
                          theme={getColor(user.nickname)}
                          text={findUpper1(user.nickname)}
                        >
                          <span className={`status dot dot-lg dot-${user.active === true ? "success" : "gray"}`}></span>
                        </UserAvatar1>
                      </a>
                    </li>
                  )
                );
              })}
            </ul>
          </div>
          {favState && (
            <SimpleBar className="nk-chat-aside-body">
              <div className="nk-chat-aside-search">
                <div className="form-group">
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="search"></Icon>
                    </div>
                    <Input
                      type="text"
                      className="form-round"
                      id="default-03"
                      placeholder="Search by name1"
                      onChange={(e) => favInputSearchChange(e)}
                    />
                  </div>
                </div>
              </div>
              <div className="nk-chat-aside-panel nk-chat-contact">
                <ul className="contacts-list">
                  {favFilter.length === 0 ? (
                    favFilterText ? (
                      <div className="ml-3">No user found</div>
                    ) : (
                      favData.slice(0, 3).map((contact, idx) => {
                        return (
                          contact.fav === false && (
                            <li key={idx} onClick={() => favAction(contact.id)}>
                              <div className="user-card">
                                <a href="#card" onClick={(ev) => ev.preventDefault()}>
                                  <UserAvatar
                                    text={findUpper(contact.name)}
                                    theme={contact.theme}
                                    image={contact.image}
                                  ></UserAvatar>
                                  <div className="user-name">{contact.name}</div>
                                </a>
                                <div className="user-actions">
                                  <a href="#start-chat" onClick={(ev) => ev.preventDefault()}>
                                    Start Chat
                                  </a>
                                </div>
                              </div>
                            </li>
                          )
                        );
                      })
                    )
                  ) : (
                    favFilter.map((contact, idx) => {
                      return (
                        contact.fav === false && (
                          <li key={idx} onClick={() => favAction(contact.id)}>
                            <div className="user-card">
                              <a href="#card" onClick={(ev) => ev.preventDefault()}>
                                <UserAvatar
                                  text={findUpper(contact.name)}
                                  theme={contact.theme}
                                  image={contact.image}
                                ></UserAvatar>
                                <div className="user-name">{contact.name}</div>
                              </a>
                              <div className="user-actions">
                                <a href="#start-chat" onClick={(ev) => ev.preventDefault()}>
                                  Start Chat
                                </a>
                              </div>
                            </div>
                          </li>
                        )
                      );
                    })
                  )}
                </ul>
              </div>
            </SimpleBar>
            
          )}
          
        </>
        
      )}
  <div className="nk-chat-list">
  <div
    className="d-flex justify-content-between align-items-center"
    style={{ marginBottom: "8px", minHeight: "24px" }}
  >
    <h6 className="title overline-title-alt mb-0">
      Labels
    </h6>

    {showTctHelp && (
      <div
        className="tct-help-link"
        role="button"
        tabIndex={0}
        aria-expanded={tctHelpOpen}
        onClick={handleTctHelpClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTctHelpClick();
          }
        }}
      >
        <h6
          className="title overline-title-alt mb-0"
          style={{ color: tctHelpOpen ? "#4f46e5" : undefined }}
        >
          TCT Help
        </h6>
        <Icon name={tctHelpOpen ? "chevron-down" : "chevron-right"}></Icon>
      </div>
    )}
  </div>

<div
  className="d-flex align-items-center"
  style={{
    gap: "8px",
    background: "#f5f7fb",
    borderRadius: "12px",
    paddingRight: "8px",
  }}
>
<ul
  className="chat-list"
  style={{
    display: "flex",
    flex: "1 1 auto",
    minWidth: 0,
    flexWrap: "nowrap",
    gap: "10px",
    padding: "10px 12px",
    margin: "0",
    overflowX: "auto",
    overflowY: "hidden",
    whiteSpace: "nowrap",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    background: "#f5f7fb",
    borderRadius: "12px",
    minHeight: "58px",
    alignItems: "center",
  }}
>
  <li
    key="__all__"
    onClick={() =>
      handleLabelClick({
        id: "__all__",
        name: "All",
      })
    }
    style={{
      cursor: "pointer",
      flexShrink: 0,
    }}
  >
    <div
      className="user-card"
      style={{
        background:
          selectedLabelId === "__all__"
            ? "#e9e1ff"
            : "#f5f7fb",
        borderRadius: "10px",
        padding: "9px 16px",
        minWidth: "70px",
        textAlign: "center",
        fontWeight: "600",
        color: "#4f46e5",
      }}
    >
      <div className="user-name">
        All
      </div>
    </div>
  </li>

  {/* NEW: UNREAD */}
  <li
    key="__unread__"
    onClick={() => {
      setSelectedLabelId("__unread__");

      const unreadChats = filteredChatList1.filter((chat) => {
        return (
          chat.unread === true ||
          chat.unRead === true ||
          chat.unreadCount > 0 ||
          chat.unReadCount > 0
        );
      });

      setLabelChatList(unreadChats);
    }}
    style={{
      cursor: "pointer",
      flexShrink: 0,
    }}
  >
    <div
      className="user-card"
      style={{
        background:
          selectedLabelId === "__unread__"
            ? "#e9e1ff"
            : "#f5f7fb",
        borderRadius: "10px",
        padding: "9px 16px",
        minWidth: "80px",
        textAlign: "center",
        fontWeight: "600",
        color: "#4f46e5",
      }}
    >
      <div className="user-name">
        Unread ({unreadCount})
      </div>
    </div>
  </li>

  {chatLabels.map((label) => (
    <li
      key={label.id}
      onClick={() => {
        setLabelContextMenu(null);
        handleLabelClick(label);
      }}
      onContextMenu={(e) => {
        e.preventDefault();

        setLabelContextMenu({
          labelId: label.id,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      style={{
        cursor: "pointer",
        flexShrink: 0,
        background:
          selectedLabelId === label.id
            ? "#e9e1ff"
            : "transparent",
        borderRadius: "10px",
        padding: "8px 12px",
      }}
    >
      {label.name}
    </li>
  ))}
</ul>

    <Button
      color="light"
      outline
      size="sm"
      className="btn-icon btn-white btn-round"
      style={{ flexShrink: 0 }}
      onClick={() => {
  setSelectedLabelId(null);
  setIsCreatingLabel(true);
  setSelectedMembers([]);
  setLabelChatList(null);
  setMemberSearch("");
  setNewLabelName("");
  setShowCreateLabel(true);
}}
      title="Create Label"
    >
      <Icon name="plus"></Icon>
    </Button>
</div>

    {labelContextMenu && (
  <div
    style={{
      position: "fixed",
      top: labelContextMenu.y,
      left: labelContextMenu.x,
      backgroundColor: "#fff",
      border: "1px solid #ddd",
      borderRadius: "6px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      padding: "5px 0",
      zIndex: 9999,
      minWidth: "150px",
    }}
  >
    <div
      style={{
        padding: "8px 12px",
        cursor: "pointer",
      }}
      onClick={async () => {
      setIsCreatingLabel(false);

        const labelId = labelContextMenu.labelId;

        setLabelContextMenu(null);
       setSelectedLabelId(labelId);
setMemberSearch("");

const response = await GetChatLabel(labelId);

const apiMembers =
  response?.members ||
  response?.data?.members ||
  [];

const members = apiMembers
  .map((member) => {
    if (member.userId) {
      return {
        type: "user",
        id: member.userId,
      };
    }

    if (member.groupId) {
      return {
        type: "group",
        id: member.groupId,
      };
    }

    return null;
  })
  .filter(Boolean);

setSelectedMembers(members);

await loadMembers();

setShowAddMembers(true);
      }}
    >
      Add members
    </div>

    <div
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        color: "#dc3545",
      }}
      onClick={handleDeleteLabel}
    >
      Delete label
    </div>
  </div>

)}
</div>

{showCreateLabel && (
  <Modal
    isOpen={showCreateLabel}
    toggle={() => {
      setNewLabelName("");
      setShowCreateLabel(false);
    }}
    centered
  >
    <ModalHeader
      toggle={() => {
        setNewLabelName("");
        setShowCreateLabel(false);
      }}
    >
      Create new list
    </ModalHeader>

    <ModalBody style={{ padding: "20px 24px" }}>
      <div className="form-group">
        <label className="form-label">
          List name
        </label>

        <div className="form-control-wrap">
          <Input
            type="text"
            value={newLabelName}
            placeholder="List name"
            onChange={(e) => setNewLabelName(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="form-label d-flex justify-content-between align-items-center">
          <span>Included</span>
          {includedItems.length > 0 && (
            <small className="text-muted">
              {includedItems.length} selected
            </small>
          )}
        </label>

        {includedItems.length === 0 ? (
          <div
            className="text-muted"
            style={{ fontSize: "13px", marginBottom: "10px" }}
          >
            No people or groups added yet.
          </div>
        ) : (
          <div
            className="d-flex flex-wrap"
            style={{
              gap: "8px",
              marginBottom: "12px",
              maxHeight: "132px",
              overflowY: "auto",
            }}
          >
            {visibleIncludedItems.map((item) => (
              <div
                key={item.key}
                className="d-flex align-items-center"
                title={`${item.name} (${item.kind})`}
                style={{
                  gap: "8px",
                  maxWidth: "100%",
                  padding: "4px 10px 4px 4px",
                  border: "1px solid #e5e9f2",
                  borderRadius: "999px",
                  background: "#f5f6fa",
                }}
              >
                <div
                  className={`user-avatar ${item.kind === "Group" ? "bg-info" : "bg-primary"}`}
                  style={{
                    width: "28px",
                    height: "28px",
                    minWidth: "28px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  <span>{item.name.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ minWidth: 0, lineHeight: 1.2 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#364a63",
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8094ae" }}>
                    {item.kind}
                  </div>
                </div>
              </div>
            ))}

            {(hiddenIncludedCount > 0 ||
              (showAllIncluded && includedItems.length > INCLUDED_PREVIEW_COUNT)) && (
              <button
                type="button"
                className="btn btn-sm btn-round"
                style={{
                  border: "1px solid #e5e9f2",
                  background: "#fff",
                  color: "#6576ff",
                  fontWeight: 600,
                  padding: "4px 12px",
                }}
                title={
                  hiddenIncludedCount > 0
                    ? includedItems
                        .slice(INCLUDED_PREVIEW_COUNT)
                        .map((item) => item.name)
                        .join(", ")
                    : "Show fewer"
                }
                onClick={() => setShowAllIncluded((prev) => !prev)}
              >
                {hiddenIncludedCount > 0 ? `+${hiddenIncludedCount}` : "Show less"}
              </button>
            )}
          </div>
        )}

        <Button
  color="light"
  block
  className="text-start"
  type="button"
  onClick={async () => {
  // Keep earlier picks: selectedMembers is already cleared when the
  // Create-list modal is opened from the "+" button.
  setMemberSearch("");

  await loadMembers();

  setShowAddMembers(true);
}}
>
  <Icon name="plus" className="me-2" />
  Add people or groups
</Button>
      </div>
    </ModalBody>

    <ModalFooter
      className="d-flex justify-content-end"
      style={{ padding: "14px 24px", borderTop: "1px solid #e5e9f2" }}
    >
      <Button
        color="primary"
        onClick={handleCreateLabel}
        disabled={!newLabelName.trim()}
      >
        Create list
      </Button>
    </ModalFooter>
  </Modal>
)}
{showDeleteLabelConfirm && (
  <Modal
    isOpen={showDeleteLabelConfirm}
    toggle={() => setShowDeleteLabelConfirm(false)}
    centered
  >
    <ModalHeader
      toggle={() => setShowDeleteLabelConfirm(false)}
    >
      Delete label
    </ModalHeader>

    <ModalBody>
      Are you sure you want to delete this label?
    </ModalBody>

    <ModalFooter>
      <Button
        color="light"
        onClick={() => setShowDeleteLabelConfirm(false)}
      >
        Cancel
      </Button>

      <Button
        color="danger"
        onClick={async () => {
          try {
            console.log("Delete button clicked");
            console.log("deleteLabelId:", deleteLabelId);

            if (!deleteLabelId) {
              console.log("deleteLabelId is empty");
              return;
            }

            console.log("Deleting label:", deleteLabelId);

            await DeleteChatLabel(deleteLabelId);

            setChatLabels((prev) =>
              prev.filter((label) => label.id !== deleteLabelId)
            );

            if (selectedLabelId === deleteLabelId) {
              setSelectedLabelId(null);
              setLabelChatList([]);
            }

            setShowDeleteLabelConfirm(false);
            setDeleteLabelId(null);

            alert("Label deleted successfully.");
          } catch (error) {
            console.error("Error deleting label:", error);
          }
        }}
      >
        Delete
      </Button>
    </ModalFooter>
  </Modal>
)}
{showAddMembers && (
  <Modal
  isOpen={showAddMembers}
  toggle={() => setShowAddMembers(false)}
  centered
  size="md"
  style={{
    maxWidth: "520px",
    width: "95%",
  }}
>
    <ModalHeader toggle={() => setShowAddMembers(false)}>
      Add to list
    </ModalHeader>

    <ModalBody>
      <div className="form-group">
        <div className="form-control-wrap">
          <div className="form-icon form-icon-left">
            <Icon name="search" />
          </div>

          <Input
  type="text"
  className="form-round"
  placeholder="Search name, number or username"
  value={memberSearch}
  onChange={(e) => setMemberSearch(e.target.value)}
/>
        </div>
      </div>

      <div className="mt-4">
        <h6 className="text-muted">Users and Groups</h6>

        <div className="py-3"
        style={{
    maxHeight: "420px",
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: "6px",
  }}>

  {memberUsers
    .filter((user) => {
      const search = memberSearch.toLowerCase();

      return (
        user.fullName?.toLowerCase().includes(search) ||
        user.firstName?.toLowerCase().includes(search) ||
        user.lastName?.toLowerCase().includes(search) ||
        user.nickname?.toLowerCase().includes(search) ||
        user.userCode?.toLowerCase().includes(search)
      );
    })
    .map((user) => (
      <div
  key={`user-${user.id}`}
  className="d-flex align-items-center"
  style={{
    cursor: "pointer",
    padding: "10px 12px",
    marginBottom: "4px",
    borderRadius: "10px",
    transition: "background-color 0.15s ease",
  }}
  onClick={() => {
    setSelectedMembers((prev) => {
      const exists = prev.some(
        (member) => member.type === "user" && member.id === user.id
      );

      if (exists) {
        return prev.filter(
          (member) => !(member.type === "user" && member.id === user.id)
        );
      }

      return [
        ...prev,
        {
          type: "user",
          id: user.id,
        },
      ];
    });
  }}
>
  <input
  type="checkbox"
  checked={selectedMembers.some(
    (member) => member.type === "user" && member.id === user.id
  )}
  onChange={() => {}}
  style={{
    width: "17px",
    height: "17px",
    marginRight: "12px",
    cursor: "pointer",
    flexShrink: 0,
  }}
/>

 <div
  className="user-avatar bg-primary"
  style={{
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "12px",
    fontSize: "15px",
    fontWeight: "600",
  }}
>
  <span>
    {(user.firstName || user.fullName || "?")
      .charAt(0)
      .toUpperCase()}
  </span>
</div>

  <div
  style={{
    minWidth: 0,
    flex: 1,
    lineHeight: "1.25",
  }}
>
  <div
    className="user-name"
    style={{
      fontSize: "14px",
      fontWeight: "600",
      color: "#364a63",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {user.fullName || user.firstName || user.nickname}
  </div>

  <small
    style={{
      display: "block",
      marginTop: "3px",
      fontSize: "12px",
      color: "#8094ae",
    }}
  >
    {user.role || "User"}
  </small>
</div>
</div>
    ))}

  {memberGroups.map((group) => (
  
    <div
key={`group-${group.items?.[0]?.id}`}
  className="d-flex align-items-center py-2"
  style={{ cursor: "pointer" }}
  onClick={() => {
    setSelectedMembers((prev) => {
      const exists = prev.some(
(member) =>
  member.type === "group" &&
member.id === group.items?.[0]?.id       );

      if (exists) {
        return prev.filter(
(member) =>
  !(
    member.type === "group" &&
    member.id === group.items?.[0]?.id
  )        );
      }

      return [
        ...prev,
        {
          type: "group",
          id: group.items?.[0]?.id,
        },
      ];
    });
  }}
>
  <input
    type="checkbox"
    className="me-2"
    checked={selectedMembers.some(
      (member) => member.type === "group" && member.id === group.items?.[0]?.id
    )}
    onChange={() => {}}
  />

  <div className="user-avatar bg-info me-2">
    <span>
      {(group.name || "G").charAt(0).toUpperCase()}
    </span>
  </div>

  <div>
    <div className="user-name">
      {group.name}
    </div>

    <small className="text-muted">
      Group
    </small>
  </div>
</div>
  ))}

  {memberUsers.length === 0 && memberGroups.length === 0 && (
    <div className="text-muted py-3">
      No users or groups found.
    </div>
  )}

</div>
      </div>
    </ModalBody>

   <ModalFooter
  style={{
    padding: "14px 20px",
    borderTop: "1px solid #e5e7eb",
    justifyContent: "flex-end",
  }}
>
  <Button
  color="success"
  className="btn-icon btn-round"
  onClick={() => {
  console.log("GREEN BUTTON CLICKED");

  if (isCreatingLabel) {
    setShowAddMembers(false);
    setShowCreateLabel(true);
    return;
  }

  handleAddMembersToLabel();
}}
>
  <Icon name="check" />
</Button>
</ModalFooter>
  </Modal>
)}

<div className="nk-chat-list">
  <h6 className="title overline-title-alt">{filterTab}</h6>
{showTctHelp && tctHelpOpen && (
  <div style={{ padding: "4px 4px 8px" }}>
        {helpLoading ? (
          <small className="text-muted">Loading contacts...</small>
        ) : helpError ? (
          <small className="text-danger">
            Unable to load help contacts. Please try again.
          </small>
        ) : (
          <>
            {!hasAssignedHelpContacts && (
              <small className="text-muted d-block mb-2">
                No Coordinator or Operations contacts assigned.
              </small>
            )}
            {helpSections
              .filter(
                (section) =>
                  section.contacts.length > 0 || section.emptyText
              )
              .map((section) => (
                <div key={section.title} className="mb-2">
                  <small className="text-muted">{section.title}</small>
                  {section.contacts.length === 0 ? (
                    <small className="text-muted d-block">
                      {section.emptyText}
                    </small>
                  ) : (
                    section.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="d-flex align-items-center py-1"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedId(contact.id);
                          chatItemClick(contact.id, false, {
                            id: contact.id,
                            name: contact.name,
                            nickname: contact.name,
                            group: false,
                          });
                        }}
                      >
                        <div className="user-avatar sm bg-primary me-2 mr-2">
                          <span>
                            {(contact.name || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="user-name">{contact.name}</div>
                      </div>
                    ))
                  )}
                </div>
              ))}
          </>
        )}
  </div>
)}
        <ul
          className="chat-list"
          onContextMenu={handleChatContextMenu}
          // Hidden (not unmounted) while TCT Help contacts use this area.
          style={{ display: showTctHelp && tctHelpOpen ? "none" : undefined }}
        >
          {chatSearchTerm && visibleChatList.length === 0 && (
            <li className="tct-chat-search-empty">
              <span className="tct-chat-search-empty-icon">
                <Icon name="search"></Icon>
              </span>
              <span className="tct-chat-search-empty-title">No chats found</span>
              <span className="tct-chat-search-empty-text">Try a different name or clear the search.</span>
            </li>
          )}
          <WhatsAppGroupMenu
            menuData={visibleChatList}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            chatItemClick={chatItemClick}
            onItemClick={(item) => {
              console.log(item);

              // setSelectedId(item.id);
            }}
          ></WhatsAppGroupMenu>
          
{visibleChatList.map((item, index) => {
  return (
    <ChatItem
      key={item.id || item.items?.[0]?.id || index}
      item={
        unreadCountOverride === 0
          ? {
              ...item,
              unReadCount: 0,
              UnReadCount: 0,
              unreadCount: 0,
              unread: false,
              Unread: false,
        }
          : item
      }
      setSelectedId={setSelectedId}
      chatItemClick={chatItemClick}
    />
  );
})}

        </ul>
        {chatContextMenu &&
          ReactDOM.createPortal(
            <div
              role="menu"
              style={{
                position: "fixed",
                ...getChatContextMenuPosition(chatContextMenu),
                width: `${CHAT_MENU_WIDTH}px`,
                backgroundColor: "#fff",
                border: "1px solid #e5e9f2",
                borderRadius: "8px",
                boxShadow: "0 6px 20px rgba(31, 43, 58, 0.15)",
                padding: "4px",
                zIndex: 9999,
              }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                role="menuitem"
                className="d-flex align-items-center"
                style={{
                  gap: "8px",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#364a63",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f5f6fa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={() => {
                  const { targets } = chatContextMenu;
                  setChatContextMenu(null);
                  handleMarkAsRead(targets);
                }}
              >
                <Icon name="check-circle" style={{ color: "#6576ff" }}></Icon>
                Mark as read
              </div>
            </div>,
            document.body
          )}
        {/* <ul className="chat-list">
          {defaultChat.length !== 0 ? (
            filteredChatList.map((item, idx) => {
              if (filterTab === "messages") {
                return (
                  item.convo.length > 0 &&
                  !item.group &&
                  !item.archive && (
                    <ChatItem
                      key={idx}
                      item={item}
                      selectedId={selectedId}
                      setSelectedId={setSelectedId}
                      chatItemClick={chatItemClick}
                    ></ChatItem>
                  )
                );
              } else if (filterTab === "archive") {
                return (
                  item.convo.length > 0 &&
                  item.archive &&
                  !item.group && (
                    <ChatItem
                      key={idx}
                      item={item}
                      selectedId={selectedId}
                      setSelectedId={setSelectedId}
                      chatItemClick={chatItemClick}
                    ></ChatItem>
                  )
                );
              } else if (filterTab === "unread") {
                return (
                  item.convo.length > 0 &&
                  item.unread &&
                  !item.group && (
                    <ChatItem
                      key={idx}
                      item={item}
                      selectedId={selectedId}
                      setSelectedId={setSelectedId}
                      chatItemClick={chatItemClick}
                    ></ChatItem>
                  )
                );
              } else {
                return (
                  item.convo.length > 0 &&
                  !item.channel &&
                  item.group && (
                    <ChatItem
                      key={idx}
                      item={item}
                      selectedId={selectedId}
                      setSelectedId={setSelectedId}
                      chatItemClick={chatItemClick}
                    ></ChatItem>
                  )
                );
              }
            })
          ) : (
            <p className="m-3">No user found</p>
          )}
        </ul> */}
      </div>
    </SimpleBar>
  );
};

export const ChannelAsideBody = ({
  filteredChatList = [],
  onInputChange,
  setSelectedId,
  setMobileView,
  selectedId,
  chatItemClick,
  filterTab,
}) => {
  const defaultChat = filteredChatList.filter((item) => item.group === true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [id, setId] = useState(searchParams.get("id"));
  const [modal, setModal] = useState(false);
  const userRole = (localStorage.getItem("userRole") || "").trim().toLowerCase();
  const canCreateGroup = !["student", "tutor"].includes(userRole);
  const CloseButton = () => {
    return (
      <span className="btn-trigger toast-close-button" role="button">
        <Icon name="cross"></Icon>
      </span>
    );
  };
  return (
    <SimpleBar className="nk-chat-aside-body">
      <div className="nk-chat-aside-search">
        <ToastContainer />
        <div className="form-group">
          <div className="form-control-wrap">
            <div className="form-icon form-icon-left">
              <Icon name="search"></Icon>
            </div>
            <Input
              type="text"
              className="form-round"
              id="default-03"
              placeholder="Search by name"
              onChange={(e) => onInputChange(e)}
            />
          </div>
        </div>
      </div>
      {modal && canCreateGroup && (
        <AddGroup
          groupId={"00000000-0000-0000-0000-000000000000"}
          modalStateChange={() => {
            setModal(false);
          }}
          modalOpen={modal}
          submitCallback={() => {}}
        ></AddGroup>
      )}
      {/*       
      <div className="nk-chat-aside-panel nk-chat-channel">
        <h6 className="title overline-title-alt">All Channels</h6>
        <ul className="channel-list">
          {chatData.map((item, idx) => {
            return (
              item.channel && (
                <li
                  key={idx}
                  onClick={() => {
                    setSelectedId(item.id);
                    if (window.innerWidth < 860) setMobileView(true);
                  }}
                >
                  <a
                    href="#name"
                    onClick={(ev) => ev.preventDefault()}
                    className={selectedId === item.id ? "active" : ""}
                  >
                    # {item.name}
                  </a>
                </li>
              )
            );
          })}
        </ul>
      </div> */}

      <div className="nk-chat-list">
        <h6 className="title overline-title-alt">
          Teams / Groups TEST{" "}
          {canCreateGroup && (
            <Button
              size="sm"
              className={`btn-icon text-primary toggle-opt `}
              onClick={() => setModal(true)}
            >
              <Icon name="plus-circle-fill"></Icon>
            </Button>
          )}
        </h6>

        <ul className="chat-list">
          {defaultChat.length == 0 ? (
            <WhatsAppGroupMenu
              menuData={filteredChatList}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              chatItemClick={chatItemClick}
              onItemClick={(item) => {
                console.log(item);

                // setSelectedId(item.id);
              }}
            ></WhatsAppGroupMenu>
          ) : (
            // filteredChatList.map((item, idx) => {
            //   if (filterTab === "messages") {
            //     return (

            //       item.group &&
            //       !item.archive &&
            //       !item.channel && (
            //         <ChatItem
            //           key={idx}
            //           item={item}
            //           selectedId={selectedId}
            //           setSelectedId={setSelectedId}
            //           chatItemClick={chatItemClick}
            //         ></ChatItem>
            //       )
            //     );
            //   }
            // })
            <p className="m-3">No group found</p>
          )}
        </ul>
      </div>
    </SimpleBar>
  );
};

export const ContactAsideBody = (onInputChange, filterData, filterText, contactData, setSelectedId) => {
  return (
    <SimpleBar className="nk-chat-aside-body">
      <div className="nk-chat-aside-search">
        <div className="form-group">
          <div className="form-control-wrap">
            <div className="form-icon form-icon-left">
              <Icon name="search"></Icon>
            </div>
            <input
              type="text"
              className="form-round form-control"
              id="default-03"
              placeholder="Search by name"
              onChange={(e) => onInputChange(e)}
            />
          </div>
        </div>
      </div>
      <div className="nk-chat-aside-panel nk-chat-contact">
        {filterData.length === 0 ? (
          filterText ? (
            <div className="ml-5">No user</div>
          ) : (
            contactData.map((item, idx) => {
              return <ContactItem key={idx} item={item}></ContactItem>;
            })
          )
        ) : (
          <ul className="contacts-list">
            {filterData.map((contact, idx) => {
              return (
                <React.Fragment>
                  <li key={idx} setSelectedId={setSelectedId(contact.id)}>
                    <div className="user-card">
                      <a href="#name" onClick={(ev) => ev.preventDefault()}>
                        <UserAvatar
                          text={findUpper(contact.name)}
                          theme={contact.theme}
                          image={contact.image}
                        ></UserAvatar>
                        <div className="user-name">{contact.name}</div>
                      </a>
                      <div className="user-actions">
                        <a href="#start-chat" onClick={(ev) => ev.preventDefault()}>
                          Start Chat
                        </a>
                      </div>
                    </div>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}
        
      </div>
    </SimpleBar>
  );
};

import React, { useEffect, useState, createContext,  useRef } from "react";
import { chatData, addUserData } from "./ChatData";
import { useHistory, useLocation } from "react-router-dom";
import {
  GetGroupMembers,
  DeleteGroup,
  RemoveGroupMember,
  GetMessages,
  UpdateGroupName,
  ReadGroupMessages,
  ReadChatMessages,
  PostMessage
} from "../../../apiservices/ChatService";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { GetLatestMessages, GetGroupContacts } from "../../../apiservices/ChatService";
import * as signalR from "@microsoft/signalr";
import { config } from "../../../library/config";
import { registerChatConnection, unregisterChatConnection } from "../../../library/signalRRegistry";
import outgoingRingtone from "../../../assets/sounds/outgoing-ringtone.mp3";
import incomingRingtone from "../../../assets/sounds/incoming-ringtone.mp3";
const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

export const ChatContext = createContext();
export const ChatContextProvider = (props) => {
  const history = useHistory();
  const [chat, setChat] = useState([]);
  const [uChatMsg, setUChatMsg] = useState();
  const [favData, setFavData] = useState(chatData);
  const [userData, setUserData] = useState(addUserData);
  const [chatDataSource, setChatDataSource] = useState();
  const [connection, setConnection] = useState(null);
  const connectionRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
const [activeCall, setActiveCall] = useState(null);
const peerConnectionRef = useRef(null);
const [outgoingCall, setOutgoingCall] = useState(null);
const callStartTimeRef = useRef(null);
const localStreamRef = useRef(null);
const remoteAudioRef = useRef(null);
const outgoingRingtoneRef = useRef(null);
const incomingRingtoneRef = useRef(null);
const pendingIceCandidatesRef = useRef([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get("uid"));
  
const getWebRTCConfiguration = () => ({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
});
const toggleMuteVoiceCall = (shouldMute) => {
  if (!localStreamRef.current) {
    console.log("No local microphone stream available.");
    return;
  }

  const audioTracks = localStreamRef.current.getAudioTracks();

  audioTracks.forEach((track) => {
    track.enabled = !shouldMute;

    console.log(
      shouldMute
        ? "🔇 Microphone muted"
        : "🎤 Microphone unmuted"
    );

    console.log("Track enabled:", track.enabled);
  });
};
/*  useEffect(async () => { 
    const _params = new URLSearchParams(window.location.search);
    const _id = _params.get("uid");
    const _isGroup = _params.get("isGroup"); 
  }, [location.search]); */ 

  useEffect(() => {
    fetchChatData();  
  }, []);

  useEffect(() => { 
    const token = localStorage.accessToken;
    const chatApiBaseUrl = config.CHAT_APP_API_URL.replace(/\/$/, "");
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${chatApiBaseUrl}/pushNotificationHub?userId=${localStorage.getItem("userId")}`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    /*newConnection
      .start()
      .then(() => console.log("Connected to SignalR"))
      .catch((err) => console.log("Connection Error: ", err));*/

    newConnection.on("GroupMessageRead", (data) => {
    });

    // The hub already broadcasts these the instant a user connects/disconnects
    // (PushNotificationHub.OnConnectedAsync/OnDisconnectedAsync) — nothing on
    // the frontend was listening, so online status only ever refreshed when a
    // chat was reloaded instead of updating live.
    newConnection.on("UpdateOnlineUsers", (ids) => {
      setOnlineUserIds(new Set((ids || []).map(String)));
    });
    newConnection.on("UserOnline", (uid) => {
      setOnlineUserIds((prev) => new Set(prev).add(String(uid)));
    });
    newConnection.on("UserOffline", (uid) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(uid));
        return next;
      });
    });
    // Handle Received Messages
    newConnection.on("ReceivePushMessage", async (message, userInfo) => {
      const params1 = new URLSearchParams(new URL(window.location.href).search);
      const uid1 = params1.get("uid");
      const _isGroup = params1.get("isGroup") == "true" ? true : false;
      if (message == "GroupChat") {
        const isExists = userInfo?.groupMember?.findIndex((s) => s == localStorage.userId);
        if (isExists != -1) {
          await fetchChatData();
          if (_isGroup == true) {
            if (uid1 == userInfo.receiverId) {
              await GetMessages(localStorage.userId, userInfo.receiverId, true).then((response) => {
                setUChatMsg(response);
              });
            }
          }
          return;
        }
      }
      if (localStorage.userId == userInfo.receiverId) {
        await fetchChatData();
        if (localStorage.userId == userInfo.receiverId && uid1 == userInfo.senderId) {
          await GetMessages(localStorage.userId, userInfo.senderId, false).then((response) => {
            setUChatMsg(response);
          });
        }
      } 
    });
        // ==================== VOICE CALL SIGNALING ====================

    newConnection.on("IncomingCall", async (data) => {
      console.log("Incoming voice call:", data);
      setOutgoingCall(null);
        setIncomingCall(data);
          await startIncomingRingtone();
    });

    newConnection.on("CallUserResult", (data) => {
      console.log("Call result:", data);
        if (data && data.Success === false) {
    setOutgoingCall(null);
    console.log("Call could not be started:", data.Message);
  }
    });

   newConnection.on("CallAccepted", async (data) => {
    stopOutgoingRingtone();
  const currentConnection = connectionRef.current;

  console.log("🔥 CALL ACCEPTED RECEIVED ON CALLER 🔥");
  console.log("Call accepted:", data);
  console.log("SignalR state:", currentConnection?.state);

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ Caller SignalR connection is not connected.");
    return;
  }

  setActiveCall(data);
  callStartTimeRef.current = Date.now();
  setOutgoingCall(null);

  try {
    console.log("Requesting microphone access...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("Microphone access granted.");

    localStreamRef.current = stream;

    const peerConnection = new RTCPeerConnection(
      getWebRTCConfiguration()
    );

    peerConnectionRef.current = peerConnection;

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "CALLER ICE connection state:",
        peerConnection.iceConnectionState
      );
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "CALLER WebRTC connection state:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        setTimeout(() => {
          logVoiceCallStats("CALLER");
        }, 3000);
      }
    };

    peerConnection.onsignalingstatechange = () => {
      console.log(
        "CALLER WebRTC signaling state:",
        peerConnection.signalingState
      );
    };

    stream.getTracks().forEach((track) => {
      console.log("========== CALLER LOCAL AUDIO ==========");
      console.log("Track kind:", track.kind);
      console.log("Track enabled:", track.enabled);
      console.log("Track muted:", track.muted);
      console.log("Track readyState:", track.readyState);

      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async (event) => {
      console.log("========== CALLER REMOTE AUDIO ==========");

      const remoteStream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      const audio = remoteAudioRef.current;

      if (!audio) {
        console.error("❌ CALLER remote audio element missing.");
        return;
      }

      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;

      try {
        await audio.play();
        console.log("✅ CALLER AUDIO PLAYING");
      } catch (error) {
        console.error("❌ CALLER AUDIO PLAY FAILED:", error);
      }
    };

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) return;

      try {
        await currentConnection.invoke(
          "SendIceCandidate",
          data.receiverId,
          data.callId,
          JSON.stringify(event.candidate)
        );

        console.log("✅ Caller ICE sent.");
      } catch (error) {
        console.error("❌ Caller ICE failed:", error);
      }
    };

    console.log("========== CREATING WEBRTC OFFER ==========");

    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    console.log(
      "Local description set:",
      peerConnection.localDescription?.type
    );

    console.log("========== SEND CALL OFFER ==========");

    await currentConnection.invoke(
      "SendCallOffer",
      data.receiverId,
      data.callId,
      JSON.stringify(peerConnection.localDescription)
    );

    console.log("✅ WebRTC offer sent.");

  } catch (error) {
    console.error("❌ Failed to create WebRTC offer:", error);

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }
});

    newConnection.on("CallRejected", (data) => {
      console.log("Call rejected:", data);
        stopOutgoingRingtone();
  stopIncomingRingtone();
       setOutgoingCall(null);
  setActiveCall(null);
  setIncomingCall(null);

  if (callStartTimeRef.current) {
    callStartTimeRef.current = null;
  }

  console.log("Outgoing voice call cleared after rejection.");
    });

    newConnection.on("CallEnded", (data) => {
      console.log("Call ended:", data);
      cleanupVoiceCall();
    });
    console.log("✅ ReceiveCallOffer handler registered");

newConnection.on("ReceiveCallOffer", async (data) => {
  const currentConnection = connectionRef.current;

  console.log("🔥 RECEIVE CALL OFFER RECEIVED ON THIS DEVICE 🔥");
  console.log("Offer data:", data);

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ SignalR connection is not connected.");
    return;
  }

  try {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.error("❌ Peer connection does not exist.");
      return;
    }

    if (!data?.offer) {
      console.error("❌ No offer received.");
      return;
    }

    const offer = JSON.parse(data.offer);

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    console.log("✅ Remote description set.");

    if (pendingIceCandidatesRef.current.length > 0) {
      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error("❌ Failed queued ICE:", error);
        }
      }

      pendingIceCandidatesRef.current = [];
    }

    console.log("========== CREATING WEBRTC ANSWER ==========");

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    console.log("========== SEND CALL ANSWER ==========");

    await currentConnection.invoke(
      "SendCallAnswer",
      data.senderId,
      data.callId,
      JSON.stringify(peerConnection.localDescription)
    );

    console.log("✅ WebRTC answer sent.");

  } catch (error) {
    console.error("❌ Failed to process WebRTC offer:", error);
  }
});
/*    console.log("✅ ReceiveCallOffer handler registered");

newConnection.on("ReceiveCallOffer", async (data) => {
  console.log("🔥 RECEIVE CALL OFFER RECEIVED ON THIS DEVICE 🔥");
  console.log("Offer data:", data);
newConnection.on("ReceiveCallOffer", async (data) => {
   console.log("========== RECEIVE CALL OFFER ==========");
  console.log("Offer data:", data);
  console.log("Sender ID:", data?.senderId);
  console.log("Call ID:", data?.callId);
  console.log("Offer exists:", !!data?.offer);
  console.log("Received WebRTC offer:", data);

  try {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.error("Peer connection does not exist.");
      return;
    }

    console.log("Setting remote description...");

    const offer = JSON.parse(data.offer);

    await peerConnection.setRemoteDescription(
  new RTCSessionDescription(offer)
);

console.log("Remote description set.");

if (pendingIceCandidatesRef.current.length > 0) {
  console.log(
    "Adding queued ICE candidates:",
    pendingIceCandidatesRef.current.length
  );

  for (const candidate of pendingIceCandidatesRef.current) {
    try {
      await peerConnection.addIceCandidate(candidate);

      console.log("Queued ICE candidate added.");
    } catch (error) {
      console.error(
        "Failed to add queued ICE candidate:",
        error
      );
    }
  }

  pendingIceCandidatesRef.current = [];
}

    console.log("========== CREATING WEBRTC ANSWER ==========");

const answer = await peerConnection.createAnswer();

console.log("WebRTC answer created.");
console.log("Answer SDP exists:", !!answer?.sdp);

console.log("Setting receiver local description...");

await peerConnection.setLocalDescription(answer);

console.log(
  "Receiver local description set:",
  peerConnection.localDescription?.type
);

console.log(
  "RECEIVER signaling state:",
  peerConnection.signalingState
);

console.log("========== RECEIVER TRANSCEIVERS ==========");
console.log(
  peerConnection.getTransceivers().map((t) => ({
    mid: t.mid,
    direction: t.direction,
    currentDirection: t.currentDirection,
    senderKind: t.sender?.track?.kind,
    receiverKind: t.receiver?.track?.kind,
  }))
);

console.log("========== SEND CALL ANSWER ==========");

await newConnection.invoke(
  "SendCallAnswer",
  data.senderId,
  data.callId,
  JSON.stringify(peerConnection.localDescription)
);

console.log("WebRTC answer sent.");

  } catch (error) {
    console.error(
      "Failed to process WebRTC offer:",
      error
    );
  }
});
*/
/*
  newConnection.on("ReceiveCallAnswer", async (data) => {
  console.log("Received WebRTC answer:", data);

  try {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.error("Peer connection does not exist.");
      return;
    }

    const answer = JSON.parse(data.answer);

    console.log("Setting remote description from answer...");

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log("Remote description set from answer.");

    // ==================== ADD QUEUED ICE CANDIDATES ====================

    if (pendingIceCandidatesRef.current.length > 0) {
      console.log(
        "Adding queued ICE candidates:",
        pendingIceCandidatesRef.current.length
      );

      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await peerConnection.addIceCandidate(candidate);

          console.log("Queued ICE candidate added.");
        } catch (error) {
          console.error(
            "Failed to add queued ICE candidate:",
            error
          );
        }
      }

      pendingIceCandidatesRef.current = [];
    }

  } catch (error) {
    console.error(
      "Failed to process WebRTC answer:",
      error
    );
  }
});
*/
newConnection.on("ReceiveCallAnswer", async (data) => {
    console.log("========== RECEIVE CALL ANSWER ==========");
  console.log("Answer data:", data);
  console.log("Sender ID:", data?.senderId);
  console.log("Call ID:", data?.callId);
  console.log("Answer exists:", !!data?.answer);

  console.log("Received WebRTC answer:", data);

  try {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.error("Peer connection does not exist.");
      return;
    }

    // Prevent duplicate answers
    if (
      peerConnection.signalingState !== "have-local-offer"
    ) {
      console.log(
        "Ignoring duplicate answer. Current state:",
        peerConnection.signalingState
      );
      return;
    }

    const answer = JSON.parse(data.answer);

    console.log("Setting remote description from answer...");

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log("Remote description set from answer.");

    // ==================== ADD QUEUED ICE CANDIDATES ====================

    if (pendingIceCandidatesRef.current.length > 0) {
      console.log(
        "Adding queued ICE candidates:",
        pendingIceCandidatesRef.current.length
      );

      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await peerConnection.addIceCandidate(candidate);

          console.log("Queued ICE candidate added.");
        } catch (error) {
          console.error(
            "Failed to add queued ICE candidate:",
            error
          );
        }
      }

      pendingIceCandidatesRef.current = [];
    }

  } catch (error) {
    console.error(
      "Failed to process WebRTC answer:",
      error
    );
  }
});
  newConnection.on("ReceiveIceCandidate", async (data) => {
  console.log("Received ICE candidate:", data);

  try {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.error("Peer connection does not exist.");
      return;
    }

    const candidate = new RTCIceCandidate(
      JSON.parse(data.candidate)
    );

    /*
     * ICE candidate can arrive before
     * remote description is available.
     */
    if (!peerConnection.remoteDescription) {
      console.log(
        "Remote description not ready. Queueing ICE candidate."
      );

      pendingIceCandidatesRef.current.push(candidate);

      return;
    }

    console.log("Adding ICE candidate...");

    await peerConnection.addIceCandidate(candidate);

    console.log("ICE candidate added successfully.");

  } catch (error) {
    console.error(
      "Failed to process ICE candidate:",
      error
    );
  }
});
newConnection
  .start()
  .then(() => {
    console.log("✅ Connected to SignalR");
    console.log("SignalR Connection ID:", newConnection.connectionId);
  })
  .catch((err) => {
    console.error("❌ SignalR Connection Error:", err);
  });
    setConnection(newConnection);
    connectionRef.current = newConnection;
    registerChatConnection(newConnection);

    return () => {
      unregisterChatConnection(newConnection);
      connectionRef.current = null;
      newConnection.stop();
    };
  }, []);

  // Function for deleting a conversation
  const deleteConvo = (id, isgroup) => {
    if (isgroup) {
      DeleteGroup(id, localStorage.getItem("userId"))
        .then((response) => {
          toast.success("Group deleted successfully.", {
            position: "botton-right",
            autoClose: true,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: false,
          });
        })
        .catch((error) => {});
    }
    let data = chat;

    data = data.filter((item) => item.id !== id);
    setChat([...data]);
  };

  // Universal function for any props
  const propAction = (id, prop) => {
    let data = chat;
    const index = data.findIndex((item) => item.id === id);
    data[index][prop] = true;
    setChat([...data]);
  };

  // Function to add favourite to favourite list
  const favAction = (id) => {
    let data = favData;
    const index = data.findIndex((item) => item.id === id);
    data[index].fav = true;
    setFavData([...data]);
    setChat([...data]);
  };

  const changeChatUser = async (id, isGroup, currentItem) => {
    const params = new URLSearchParams(window.location.search);
    params.set("uid", id);
    params.set("isGroup", isGroup);
    history.push({ search: params.toString() });
    if (currentItem?.unReadCount > 0) {
      if (isGroup) {
        readGroupMessages(id, localStorage.getItem("userId"));
      } else if (currentItem?.chatId) {
        readChatMessages(currentItem.chatId, id, localStorage.getItem("userId"));
      }
    }
    try {
      const response = await GetMessages(localStorage.userId, id, isGroup);
      setUChatMsg(response);
    } catch (error) {
      // A contact with no prior conversation (e.g. starting a personal chat
      // for the first time) can fail here. Fall back to a minimal shell so
      // the chat window still opens instead of silently doing nothing.
      setUChatMsg({
        id,
        group: isGroup,
        nickname: currentItem?.nickname ?? currentItem?.firstName ?? currentItem?.name,
        name: currentItem?.name ?? currentItem?.firstName,
        isActive: true,
        active: true,
        convo: [],
      });
    }
  };

  const readGroupMessages = (groupId, userId) => {
    ReadGroupMessages(groupId, userId)
      .then((response) => {
        setChatDataSource((prev) => {
          if (!Array.isArray(prev)) return prev; // nothing to update, avoid crash

          return prev.map((entry) => {
            // Grouped "subject" wrapper — zero out just the matching item inside it.
            if (Array.isArray(entry.items)) {
              const items = entry.items.map((item) => (item.id === groupId ? { ...item, unReadCount: 0 } : item));
              return {
                ...entry,
                items,
                unReadCount: items.reduce((sum, item) => sum + (item.unReadCount || 0), 0),
              };
            }
            // Flat entry (personal chat) — leave it untouched; only the
            // matching group id below should be zeroed.
            return entry.id === groupId ? { ...entry, unReadCount: 0 } : entry;
          });
        });
      })
      .catch((error) => {});
  };

  const readChatMessages = (conversationId, otherUserId, userId) => {
    ReadChatMessages(conversationId, userId)
      .then(() => {
        setChatDataSource((prev) => {
          if (!Array.isArray(prev)) return prev;

          return prev.map((entry) =>
            !Array.isArray(entry.items) && entry.id === otherUserId ? { ...entry, unReadCount: 0 } : entry
          );
        });
      })
      .catch((error) => {});
  };

  // Function to change nickame
  const changeNickname = (id, name, description, group) => {
    const data = chat;
    // const index = data.findIndex((item) => item.id === id);
    // data[index].nickname = name;
    let inputData = {
      GroupName: name,
      Id: id,
      Description: description,
      IsGroup: group || false,
      UserId: localStorage.getItem("userId"),
    };

    UpdateGroupName(inputData).then((response) => {
      if (response.succeeded) {
        GetMessages(localStorage.userId, id, group == null ? false : group).then((response) => {
          setUChatMsg(response);
        });
      }
    });
    // setChat([...data]);
  };

  // Function to change theme
  const changeTheme = (id, name) => {
    const data = chat;
    const index = data.findIndex((item) => item.id === id);
    data[index].chatTheme = name;
    setChat([...data]);
  };

  // Removes user from group
  const deleteUser = (id, userId) => {
    // let data = chat;
    // const grouped = data.findIndex((item) => item.id === id);
    // const group = data.find((item) => item.id === id);
    // const user = group.user.filter((user) => user.id !== userId);
    // group.user = user;
    // data[grouped] = group;
    // setChat([...data]);

    let inputData = {
      GroupId: id,
      MemberId: userId,
      UserId: localStorage.getItem("userId"),
    };

    RemoveGroupMember(inputData).then((response) => {
      if (response.succeeded) {
        GetMessages(localStorage.userId, id, group == null ? false : group).then((response) => {
          setUChatMsg(response);
        });
      }
    });
  };

  // Makes a user admin
  const makeAdmin = (id, userId) => {
    let data = chat;
    const grouped = data.findIndex((item) => item.id === id);
    const group = data.find((item) => item.id === id);
    group.user.forEach((element) => {
      element.role = "User";
    });
    const userIndex = group.user.findIndex((item) => item.id === userId);
    group.user[userIndex].role = "Admin";
    data[grouped] = group;
    setChat([...data]);
  };

  // Add a user to a chat
  const addUserToChat = (id, object) => {
    let data = chat;
    const group = data.find((item) => item.id === id);
    let newUserGroup = [...group.user, object];
    group.user = newUserGroup;
    setChat(data);
    let newUserData = userData;
    let user = newUserData.filter((el) => el.id !== object.id);
    setUserData(user);
  };

  const fetchChatData = async () => {
    try {
      await GetLatestMessages(localStorage.getItem("userId")).then(async (response) => {
        setChatDataSource(response);
      });
    } catch (error) {
      console.error("Error fetching chat data:", error);
    }
  };

  // Lets the receiver's typing dot show up without a DB round trip: the hub
  // fans this out only to the relevant user's/group's live connections.
  const sendTyping = (receiverId, isGroup, isTyping, memberIds) => {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    connection
      .invoke("Typing", localStorage.getItem("userId"), receiverId, isGroup, isTyping, memberIds || null)
      .catch(() => {});
  };
  const saveVoiceCallHistory = async (
  callerId,
  receiverId,
  durationSeconds,
  status
) => {
  try {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    const formattedDuration = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;

    const callMessage = `📞 Voice call · ${formattedDuration} · ${status}`;

    const formData = new FormData();

    formData.append("Chat", [callMessage]);
    formData.append("SenderId", callerId);
    formData.append("ReceiverId", receiverId);
    formData.append("IsGroup", "false");
    formData.append("ConversationId", "1");
    formData.append("IsFromMe", "true");

    console.log("Saving voice call history:", {
      callerId,
      receiverId,
      durationSeconds,
      status,
      callMessage,
    });

    await PostMessage(formData);

    console.log("Voice call history saved successfully.");
  } catch (error) {
    console.error("Failed to save voice call history:", error);
  }
};
const logVoiceCallStats = async (label) => {
  const peerConnection = peerConnectionRef.current;

  if (!peerConnection) {
    console.log(`${label}: No peer connection`);
    return;
  }

  try {
    const stats = await peerConnection.getStats();

    stats.forEach((report) => {
      if (
        report.type === "inbound-rtp" &&
        (report.kind === "audio" || report.mediaType === "audio")
      ) {
        console.log(`${label} INBOUND AUDIO`, {
          packetsReceived: report.packetsReceived,
          bytesReceived: report.bytesReceived,
          packetsLost: report.packetsLost,
          jitter: report.jitter,
        });
      }

      if (
        report.type === "outbound-rtp" &&
        (report.kind === "audio" || report.mediaType === "audio")
      ) {
        console.log(`${label} OUTBOUND AUDIO`, {
          packetsSent: report.packetsSent,
          bytesSent: report.bytesSent,
          packetsLost: report.packetsLost,
        });
      }
    });
  } catch (error) {
    console.error(`${label} getStats failed:`, error);
  }
};
const startOutgoingRingtone = async () => {
  try {
    if (outgoingRingtoneRef.current) {
      outgoingRingtoneRef.current.pause();
      outgoingRingtoneRef.current.currentTime = 0;
    }

    const audio = new Audio(outgoingRingtone);

    audio.loop = true;
    audio.volume = 1.0;

    outgoingRingtoneRef.current = audio;

    await audio.play();

    console.log("🔔 OUTGOING RINGTONE STARTED");
  } catch (error) {
    console.error("❌ OUTGOING RINGTONE FAILED:", error);
  }
};

const startIncomingRingtone = async () => {
  try {
    if (incomingRingtoneRef.current) {
      incomingRingtoneRef.current.pause();
      incomingRingtoneRef.current.currentTime = 0;
    }

    const audio = new Audio(incomingRingtone);

    audio.loop = true;
    audio.volume = 1.0;

    incomingRingtoneRef.current = audio;

    await audio.play();

    console.log("🔔 INCOMING RINGTONE STARTED");
  } catch (error) {
    console.error("❌ INCOMING RINGTONE FAILED:", error);
  }
};

const stopOutgoingRingtone = () => {
  if (outgoingRingtoneRef.current) {
    outgoingRingtoneRef.current.pause();
    outgoingRingtoneRef.current.currentTime = 0;
    outgoingRingtoneRef.current = null;

    console.log("🔕 OUTGOING RINGTONE STOPPED");
  }
};

const stopIncomingRingtone = () => {
  if (incomingRingtoneRef.current) {
    incomingRingtoneRef.current.pause();
    incomingRingtoneRef.current.currentTime = 0;
    incomingRingtoneRef.current = null;

    console.log("🔕 INCOMING RINGTONE STOPPED");
  }
};
// ==================== VOICE CALL ====================

const startVoiceCall = async (receiverId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    console.log("SignalR is not connected.");
    return;
  }

  if (!receiverId) {
    console.log("Receiver ID is missing.");
    return;
  }

  const callId = crypto.randomUUID();

  //console.log("Starting voice call...");
  setOutgoingCall({
  callId,
  callerId: localStorage.getItem("userId"),
  receiverId,
});

console.log("Starting voice call...");
  console.log("Receiver ID:", receiverId);
  console.log("Call ID:", callId);

  try {
    await connection.invoke("CallUser", receiverId, callId);

    console.log("CallUser invoked successfully.");
     await startOutgoingRingtone();
  } catch (error) {
    console.error("Failed to start voice call:", error);
    setOutgoingCall(null);
  }
};
/*const acceptVoiceCall = async () => {
  console.log("🔥🔥 ACCEPT STARTED 🔥🔥");

  const currentConnection = connectionRef.current;

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ SignalR NOT CONNECTED");
    return;
  }

  if (!incomingCall) {
    console.error("❌ NO INCOMING CALL");
    return;
  }

  console.log("📞 Incoming call:", incomingCall);
  console.log("📡 Connection ID:", currentConnection.connectionId);
  console.log("📡 State:", currentConnection.state);

  try {
    // =====================================
    // STEP 1 — ACCEPT THROUGH SIGNALR FIRST
    // =====================================

    console.log("🔥🔥 CALLING AcceptCall NOW 🔥🔥");

    await currentConnection.invoke(
      "AcceptCall",
      incomingCall.callerId,
      incomingCall.callId
    );

    console.log("✅✅ AcceptCall SUCCESS ✅✅");

    // =====================================
    // STEP 2 — CHANGE UI
    // =====================================

    setActiveCall({
      ...incomingCall,
    });

    setIncomingCall(null);

    callStartTimeRef.current = Date.now();

    console.log("✅ Active call UI opened");

    // =====================================
    // STEP 3 — MICROPHONE
    // =====================================

    console.log("🎤 Requesting microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("✅ Microphone granted");

    localStreamRef.current = stream;

    // =====================================
    // STEP 4 — PEER CONNECTION
    // =====================================

        const peerConnection = new RTCPeerConnection(
      getWebRTCConfiguration()
    );

    peerConnectionRef.current = peerConnection;

    console.log("✅ Receiver peer connection created");

    // =====================================
    // RECEIVER WEBRTC STATE LOGGING
    // =====================================

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER ICE:",
        peerConnection.iceConnectionState
      );
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER CONNECTION:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        console.log("✅ RECEIVER WEBRTC CONNECTED");

        setTimeout(() => {
          logVoiceCallStats("RECEIVER");
        }, 3000);
      }
    };

    peerConnection.onsignalingstatechange = () => {
      console.log(
        "📡 RECEIVER SIGNALING:",
        peerConnection.signalingState
      );
    };

    // =====================================
    // RECEIVER ICE CANDIDATE
    // =====================================

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("📡 RECEIVER ICE gathering completed.");
        return;
      }

      console.log("📡 RECEIVER ICE CANDIDATE GENERATED");

      try {
        await currentConnection.invoke(
          "SendIceCandidate",
          incomingCall.callerId,
          incomingCall.callId,
          JSON.stringify(event.candidate)
        );

        console.log("✅ RECEIVER ICE SENT");
      } catch (error) {
        console.error(
          "❌ RECEIVER ICE SEND FAILED:",
          error
        );
      }
    };

    // =====================================
    // RECEIVER REMOTE AUDIO
    // =====================================

    peerConnection.ontrack = async (event) => {
      console.log("🔊 RECEIVER REMOTE AUDIO TRACK RECEIVED");

      const remoteStream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      const audio = remoteAudioRef.current;

      if (!audio) {
        console.error(
          "❌ RECEIVER REMOTE AUDIO ELEMENT NOT FOUND"
        );
        return;
      }

      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;

      try {
        await audio.play();

        console.log("✅ RECEIVER AUDIO PLAYING");
      } catch (error) {
        console.error(
          "❌ RECEIVER AUDIO PLAY FAILED:",
          error
        );
      }
    };

    // =====================================
    // ADD RECEIVER MICROPHONE
    // =====================================

    stream.getTracks().forEach((track) => {
      console.log(
        "🎤 Adding receiver audio track:",
        track.kind
      );

      peerConnection.addTrack(track, stream);
    });

    console.log("✅ Receiver microphone track added");
  } catch (error) {
    console.error("❌ ACCEPT FAILED");
    console.error(error);
  }
};*/
/*const acceptVoiceCall = async () => {
  console.log("🔥🔥 ACCEPT STARTED 🔥🔥");

  const currentConnection = connectionRef.current;

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ SignalR NOT CONNECTED");
    return;
  }

  if (!incomingCall) {
    console.error("❌ NO INCOMING CALL");
    return;
  }

  const call = incomingCall;

  console.log("📞 Incoming call:", call);
  console.log("📡 Connection ID:", currentConnection.connectionId);
  console.log("📡 State:", currentConnection.state);

  try {
    // =====================================
    // STEP 1 — MICROPHONE FIRST
    // =====================================

    console.log("🎤 Requesting microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("✅ Microphone granted");

    localStreamRef.current = stream;

    // =====================================
    // STEP 2 — CREATE PEER CONNECTION
    // =====================================

    const peerConnection = new RTCPeerConnection(
      getWebRTCConfiguration()
    );

    peerConnectionRef.current = peerConnection;

    console.log("✅ Receiver peer connection created");

    // =====================================
    // STEP 3 — RECEIVER ICE STATE
    // =====================================

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER ICE:",
        peerConnection.iceConnectionState
      );
    };

    // =====================================
    // STEP 4 — RECEIVER WEBRTC STATE
    // =====================================

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER CONNECTION:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        console.log("✅ RECEIVER WEBRTC CONNECTED");

        setTimeout(() => {
          logVoiceCallStats("RECEIVER");
        }, 3000);
      }
    };

    // =====================================
    // STEP 5 — SIGNALING STATE
    // =====================================

    peerConnection.onsignalingstatechange = () => {
      console.log(
        "📡 RECEIVER SIGNALING:",
        peerConnection.signalingState
      );
    };

    // =====================================
    // STEP 6 — RECEIVER ICE CANDIDATES
    // =====================================

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("📡 RECEIVER ICE gathering completed.");
        return;
      }

      console.log("📡 RECEIVER ICE CANDIDATE GENERATED");

      try {
        await currentConnection.invoke(
          "SendIceCandidate",
          call.callerId,
          call.callId,
          JSON.stringify(event.candidate)
        );

        console.log("✅ RECEIVER ICE SENT");
      } catch (error) {
        console.error(
          "❌ RECEIVER ICE SEND FAILED:",
          error
        );
      }
    };

    // =====================================
    // STEP 7 — RECEIVER REMOTE AUDIO
    // =====================================

    peerConnection.ontrack = async (event) => {
      console.log("🔊 RECEIVER REMOTE AUDIO TRACK RECEIVED");

      const remoteStream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      const audio = remoteAudioRef.current;

      if (!audio) {
        console.error(
          "❌ RECEIVER REMOTE AUDIO ELEMENT NOT FOUND"
        );
        return;
      }

      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;

      try {
        await audio.play();

        console.log("✅ RECEIVER AUDIO PLAYING");
      } catch (error) {
        console.error(
          "❌ RECEIVER AUDIO PLAY FAILED:",
          error
        );
      }
    };

    // =====================================
    // STEP 8 — ADD MICROPHONE TRACK
    // =====================================

    stream.getTracks().forEach((track) => {
      console.log(
        "🎤 Adding receiver audio track:",
        track.kind
      );

      peerConnection.addTrack(track, stream);
    });

    console.log("✅ Receiver microphone track added");

    // =====================================
    // STEP 9 — UPDATE UI
    // =====================================

    setActiveCall({
      ...call,
    });

    setIncomingCall(null);

    callStartTimeRef.current = Date.now();

    console.log("✅ Active call UI opened");

    // =====================================
    // STEP 10 — ACCEPT CALL LAST
    // =====================================

    console.log("🔥🔥 CALLING AcceptCall NOW 🔥🔥");

    await currentConnection.invoke(
      "AcceptCall",
      call.callerId,
      call.callId
    );

    console.log("✅✅ AcceptCall SUCCESS ✅✅");
    console.log(
      "🚀 Receiver is READY before caller sends offer"
    );

  } catch (error) {
    console.error("❌ ACCEPT FAILED");
    console.error(error);

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIncomingCall(null);
    setActiveCall(null);
  }
};*/
/*const acceptVoiceCall = async () => {
  console.log("🔥🔥 ACCEPT STARTED 🔥🔥");

  const currentConnection = connectionRef.current;

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ SignalR NOT CONNECTED");
    return;
  }

  if (!incomingCall) {
    console.error("❌ NO INCOMING CALL");
    return;
  }

  const call = incomingCall;

  console.log("📞 Incoming call:", call);
  console.log("📡 Connection ID:", currentConnection.connectionId);
  console.log("📡 State:", currentConnection.state);

  try {
    // =====================================
    // STEP 1 — ACCEPT CALL FIRST
    // =====================================

    console.log("🔥🔥 CALLING AcceptCall NOW 🔥🔥");

    await currentConnection.invoke(
      "AcceptCall",
      call.callerId,
      call.callId
    );

    console.log("✅✅ AcceptCall SUCCESS ✅✅");

    // =====================================
    // STEP 2 — SHOW ACTIVE CALL UI
    // =====================================

    setActiveCall({
      ...call,
    });

    setIncomingCall(null);

    callStartTimeRef.current = Date.now();

    console.log("✅ Active call UI opened");

    // =====================================
    // STEP 3 — REQUEST MICROPHONE
    // =====================================

    console.log("🎤 Requesting microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("✅ Microphone granted");

    localStreamRef.current = stream;

    // =====================================
    // STEP 4 — CREATE PEER CONNECTION
    // =====================================

    const peerConnection = new RTCPeerConnection(
      getWebRTCConfiguration()
    );

    peerConnectionRef.current = peerConnection;

    console.log("✅ Receiver peer connection created");

    // =====================================
    // STEP 5 — ICE STATE
    // =====================================

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER ICE:",
        peerConnection.iceConnectionState
      );
    };

    // =====================================
    // STEP 6 — WEBRTC CONNECTION STATE
    // =====================================

    peerConnection.onconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER CONNECTION:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        console.log("✅ RECEIVER WEBRTC CONNECTED");

        setTimeout(() => {
          logVoiceCallStats("RECEIVER");
        }, 3000);
      }
    };

    // =====================================
    // STEP 7 — SIGNALING STATE
    // =====================================

    peerConnection.onsignalingstatechange = () => {
      console.log(
        "📡 RECEIVER SIGNALING:",
        peerConnection.signalingState
      );
    };

    // =====================================
    // STEP 8 — ICE CANDIDATES
    // =====================================

    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("📡 RECEIVER ICE gathering completed.");
        return;
      }

      console.log("📡 RECEIVER ICE CANDIDATE GENERATED");

      try {
        await currentConnection.invoke(
          "SendIceCandidate",
          call.callerId,
          call.callId,
          JSON.stringify(event.candidate)
        );

        console.log("✅ RECEIVER ICE SENT");

      } catch (error) {
        console.error(
          "❌ RECEIVER ICE SEND FAILED:",
          error
        );
      }
    };

    // =====================================
    // STEP 9 — REMOTE AUDIO
    // =====================================

    peerConnection.ontrack = async (event) => {
      console.log("🔊 RECEIVER REMOTE AUDIO TRACK RECEIVED");

      const remoteStream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      const audio = remoteAudioRef.current;

      if (!audio) {
        console.error(
          "❌ RECEIVER REMOTE AUDIO ELEMENT NOT FOUND"
        );
        return;
      }

      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;

      try {
        await audio.play();

        console.log(
          "✅ RECEIVER AUDIO PLAYING"
        );

      } catch (error) {
        console.error(
          "❌ RECEIVER AUDIO PLAY FAILED:",
          error
        );
      }
    };

    // =====================================
    // STEP 10 — ADD MICROPHONE TRACK
    // =====================================

    stream.getTracks().forEach((track) => {
      console.log(
        "🎤 Adding receiver audio track:",
        track.kind
      );

      peerConnection.addTrack(
        track,
        stream
      );
    });

    console.log(
      "✅ Receiver microphone track added"
    );

  } catch (error) {

    console.error(
      "❌ ACCEPT FLOW ERROR:",
      error
    );

    // IMPORTANT:
    // Do not send RejectCall or EndCall here.
    // The call has already been accepted through SignalR.

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    console.error(
      "⚠️ Call was accepted, but WebRTC setup failed."
    );
  }
};*/
const acceptVoiceCall = async () => {
  stopIncomingRingtone();
  console.log("🔥🔥 ACCEPT STARTED 🔥🔥");

  const currentConnection = connectionRef.current;

  if (
    !currentConnection ||
    currentConnection.state !== signalR.HubConnectionState.Connected
  ) {
    console.error("❌ SignalR NOT CONNECTED");
    return;
  }

  if (!incomingCall) {
    console.error("❌ NO INCOMING CALL");
    return;
  }

  const call = incomingCall;

  console.log("📞 Incoming call:", call);
  console.log("📡 Connection ID:", currentConnection.connectionId);
  console.log("📡 State:", currentConnection.state);

  try {
    // STEP 1 — REQUEST MICROPHONE
    console.log("🎤 Requesting microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log("✅ Microphone granted");

    localStreamRef.current = stream;

    // STEP 2 — CREATE PEER CONNECTION
    const peerConnection = new RTCPeerConnection(
      getWebRTCConfiguration()
    );

    peerConnectionRef.current = peerConnection;

    console.log("✅ Receiver peer connection created");

    // STEP 3 — ICE STATE
    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER ICE:",
        peerConnection.iceConnectionState
      );
    };

    // STEP 4 — CONNECTION STATE
    peerConnection.onconnectionstatechange = () => {
      console.log(
        "📡 RECEIVER CONNECTION:",
        peerConnection.connectionState
      );

      if (peerConnection.connectionState === "connected") {
        console.log("✅ RECEIVER WEBRTC CONNECTED");

        setTimeout(() => {
          logVoiceCallStats("RECEIVER");
        }, 3000);
      }
    };

    // STEP 5 — SIGNALING STATE
    peerConnection.onsignalingstatechange = () => {
      console.log(
        "📡 RECEIVER SIGNALING:",
        peerConnection.signalingState
      );
    };

    // STEP 6 — ICE CANDIDATES
    peerConnection.onicecandidate = async (event) => {
      if (!event.candidate) {
        console.log("📡 RECEIVER ICE gathering completed.");
        return;
      }

      console.log("📡 RECEIVER ICE CANDIDATE GENERATED");

      try {
        await currentConnection.invoke(
          "SendIceCandidate",
          call.callerId,
          call.callId,
          JSON.stringify(event.candidate)
        );

        console.log("✅ RECEIVER ICE SENT");
      } catch (error) {
        console.error(
          "❌ RECEIVER ICE SEND FAILED:",
          error
        );
      }
    };

    // STEP 7 — REMOTE AUDIO
    peerConnection.ontrack = async (event) => {
      console.log("🔊 RECEIVER REMOTE AUDIO TRACK RECEIVED");

      const remoteStream =
        event.streams?.[0] ||
        new MediaStream([event.track]);

      const audio = remoteAudioRef.current;

      if (!audio) {
        console.error(
          "❌ RECEIVER REMOTE AUDIO ELEMENT NOT FOUND"
        );
        return;
      }

      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;

      try {
        await audio.play();
        console.log("✅ RECEIVER AUDIO PLAYING");
      } catch (error) {
        console.error(
          "❌ RECEIVER AUDIO PLAY FAILED:",
          error
        );
      }
    };

    // STEP 8 — ADD MICROPHONE TRACK
    stream.getTracks().forEach((track) => {
      console.log(
        "🎤 Adding receiver audio track:",
        track.kind
      );

      peerConnection.addTrack(
        track,
        stream
      );
    });

    console.log(
      "✅ Receiver microphone track added"
    );

    // STEP 9 — SHOW ACTIVE CALL UI
    setActiveCall({
      ...call,
    });

    setIncomingCall(null);

    callStartTimeRef.current = Date.now();

    console.log("✅ Active call UI opened");

    // STEP 10 — ACCEPT CALL LAST
    console.log("🔥🔥 CALLING AcceptCall NOW 🔥🔥");

    await currentConnection.invoke(
      "AcceptCall",
      call.callerId,
      call.callId
    );

    console.log("✅✅ AcceptCall SUCCESS ✅✅");

    console.log(
      "🚀 Receiver is READY before caller sends offer"
    );

  } catch (error) {
    console.error("❌ ACCEPT FLOW ERROR:", error);

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    console.error(
      "⚠️ Call was accepted, but WebRTC setup failed."
    );
  }
};
const cleanupVoiceCall = () => {
  console.log("Cleaning up voice call...");
  stopOutgoingRingtone();
  stopIncomingRingtone();

  // Stop microphone
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;
  }

  // Close WebRTC connection
  if (peerConnectionRef.current) {
    peerConnectionRef.current.close();
    peerConnectionRef.current = null;
  }

  // Clear remote audio
  if (remoteAudioRef.current) {
    remoteAudioRef.current.pause();
    remoteAudioRef.current.srcObject = null;
     remoteAudioRef.current.load();
  }

  // Clear queued ICE candidates
  pendingIceCandidatesRef.current = [];

  setActiveCall(null);
  setIncomingCall(null);
  setOutgoingCall(null);
  callStartTimeRef.current = null;
  console.log("Voice call cleanup completed.");
};
const endVoiceCall = async () => {
  const currentCall = activeCall || outgoingCall;

  if (!currentCall) {
    console.log("No active or outgoing voice call.");
    return;
  }

  const currentUserId = localStorage.getItem("userId");

  const isCaller = currentCall.callerId === currentUserId;

  const otherUserId = isCaller
    ? currentCall.receiverId
    : currentCall.callerId;

  // If the call was connected, calculate the actual duration.
  const durationSeconds = callStartTimeRef.current
    ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
    : 0;

  const status = activeCall ? "Completed" : "Cancelled";

  try {
    console.log("Ending voice call...");
    console.log("Call ID:", currentCall.callId);
    console.log("Call status:", status);
    console.log("Call duration:", durationSeconds, "seconds");

    // Notify the other user.
    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected
    ) {
      await connection.invoke(
        "EndCall",
        otherUserId,
        currentCall.callId
      );

      console.log("EndCall invoked successfully.");
    }

    // Save call history only once from the user who ends/cancels the call.
    await saveVoiceCallHistory(
      currentCall.callerId,
      currentCall.receiverId,
      durationSeconds,
      status
    );

  } catch (error) {
    console.error("Failed to end voice call:", error);
  } finally {
    setOutgoingCall(null);
    callStartTimeRef.current = null;
    cleanupVoiceCall();
  }
};
/*const rejectVoiceCall = async () => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    console.log("SignalR is not connected.");
    return;
  }

  if (!incomingCall) {
    console.log("No incoming call.");
    return;
  }

  try {
    await connection.invoke(
      "RejectCall",
      incomingCall.callerId,
      incomingCall.callId
    );

    console.log("Voice call rejected.");

    setIncomingCall(null);
  } catch (error) {
    console.error("Failed to reject voice call:", error);
  }
};*/
  const rejectVoiceCall = async () => {
  if (!incomingCall) {
    console.log("No incoming call.");
    return;
  }

  // Stop receiver ringtone immediately
  stopIncomingRingtone();

  const currentCall = incomingCall;

  // Clear incoming call UI immediately
  setIncomingCall(null);

  try {
    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected
    ) {
      await connection.invoke(
        "RejectCall",
        currentCall.callerId,
        currentCall.callId
      );

      console.log("Voice call rejected.");
    }
  } catch (error) {
    console.error("Failed to reject voice call:", error);
  } finally {
    // Make sure all call resources are cleaned up
    cleanupVoiceCall();
  }
};
  return (
    <ChatContext.Provider
      value={{
        chatState: [chat, setChat],
        chatDataSourceState: [chatDataSource, setChatDataSource],
        chatDataSource: chatDataSource,
        chatData: chat,
        fav: [favData],
        userData: userData,
        deleteConvo: deleteConvo,
        changeChatUser: changeChatUser,
        selectedUserId: selectedUserId,
        uChatMsg: uChatMsg,
        propAction: propAction,
        favAction: favAction,
        changeNickname: changeNickname,
        changeTheme: changeTheme,
        deleteUser: deleteUser,
        makeAdmin: makeAdmin,
        addUserToChat: addUserToChat,
        connection: connection,
        sendTyping: sendTyping,
        onlineUserIds: onlineUserIds,
        startVoiceCall: startVoiceCall,
        acceptVoiceCall: acceptVoiceCall,
        rejectVoiceCall: rejectVoiceCall,
        incomingCall: incomingCall,
        activeCall: activeCall,
        outgoingCall: outgoingCall,
        remoteAudioRef: remoteAudioRef,
        cleanupVoiceCall,
        endVoiceCall,
        toggleMuteVoiceCall,
      }}
    >
      {props.children}
      <ToastContainer />
    </ChatContext.Provider>
  );
};

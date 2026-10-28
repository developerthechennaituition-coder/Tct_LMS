import React, { useEffect, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
} from "lucide-react";

import "./VoiceCallOverlay.css";

const VoiceCallOverlay = ({
  incomingCall,
  activeCall,
  outgoingCall,
  callUserName,
  onAccept,
  onReject,
  onEnd,
  onMute
}) => {
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const call = activeCall || outgoingCall || incomingCall;

  useEffect(() => {
    if (!activeCall) {
      setSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall]);

  if (!call) {
    return null;
  }

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  const isIncoming = !!incomingCall;
  const isOutgoing = !!outgoingCall && !activeCall;
  const isConnected = !!activeCall;
const handleMute = () => {
  const newMutedState = !muted;

  setMuted(newMutedState);

  if (onMute) {
    onMute(newMutedState);
  }
};

  return (
    <div className="voice-call-overlay">
      <div className="voice-call-window">

        {/* Top section */}
        <div className="voice-call-header">
          <span>
            {isIncoming
              ? "Incoming voice call"
              : isOutgoing
              ? "Calling"
              : "Voice call"}
          </span>
        </div>

        {/* Avatar */}
        <div className="voice-call-avatar">
            {(callUserName || "U").charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="voice-call-name">
         {callUserName || "User"}
        </div>

        {/* Status / Timer */}
        <div className="voice-call-status">
          {isIncoming && "Incoming call..."}
{isOutgoing && "Calling..."}
{isConnected && (
  <>
    <span>Connected</span>
    <span className="voice-call-timer">
      {formatTime(seconds)}
    </span>
  </>
)}
        </div>

        {/* Incoming call buttons */}
        {isIncoming && (
          <div className="voice-call-actions incoming-actions">

            <div className="voice-action-group">
            <button
  type="button"
  className="voice-call-button reject"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🔥 REJECT BUTTON TOUCHED");

    if (onReject) {
      onReject();
    }
  }}
  style={{
    position: "relative",
    zIndex: 99999,
    pointerEvents: "auto",
    touchAction: "manipulation",
  }}
>
  <PhoneOff size={24} />
</button>

              <span>Reject</span>
            </div>

            <div className="voice-action-group">
             <button
  type="button"
  className="voice-call-button accept"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("🔥 ACCEPT BUTTON TOUCHED");

    if (onAccept) {
      onAccept();
    }
  }}
  style={{
    position: "relative",
    zIndex: 99999,
    pointerEvents: "auto",
    touchAction: "manipulation",
  }}
>
  <Phone size={24} />
</button>

              <span>Accept</span>
            </div>

          </div>
        )}

        {/* Connected call controls */}
        {isConnected && (
          <div className="voice-call-controls">

            <button
              className={`voice-control-button ${
                muted ? "muted" : ""
              }`}
              onClick={handleMute}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <MicOff size={22} />
              ) : (
                <Mic size={22} />
              )}
            </button>

            <button
              className="voice-control-button end-call"
              onClick={onEnd}
              title="End call"
            >
              <PhoneOff size={24} />
            </button>

          </div>
        )}

        {/* Outgoing call */}
        {isOutgoing && (
          <div className="voice-call-controls">

            <button
              className="voice-control-button end-call"
              onClick={onEnd}
              title="Cancel call"
            >
              <PhoneOff size={24} />
            </button>

          </div>
        )}

      </div>
    </div>
  );
};

export default VoiceCallOverlay;
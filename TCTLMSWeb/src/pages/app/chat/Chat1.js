import React, { useState, useEffect } from "react";
import { MessageCircle, Users, Settings, Search, Send, Paperclip, Smile, Edit2, Trash2 } from "lucide-react";

const ChatApp = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState([
    {
      id: "1",
      name: "John Doe",
      lastMessage: "Hey, how are you?",
      unread: 2,
      status: "online",
      timestamp: "10:30 AM",
    },
    {
      id: "2",
      name: "Team Chat",
      lastMessage: "Meeting at 2 PM",
      unread: 0,
      type: "group",
      timestamp: "9:15 AM",
    },
  ]);

  const [messages] = useState([
    {
      id: 1,
      senderId: "2",
      senderName: "John Doe",
      content: "Hey, how are you?",
      timestamp: "10:30 AM",
      status: "read",
    },
    {
      id: 2,
      senderId: "1",
      senderName: "Me",
      content: "I'm good, thanks! How about you?",
      timestamp: "10:31 AM",
      status: "sent",
    },
  ]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* User Profile Section */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">JD</div>
            <div className="ml-3">
              <div className="font-medium">Jane Doe</div>
              <div className="text-sm text-gray-500">Online</div>
            </div>
          </div>
          <Settings className="w-5 h-5 text-gray-500 cursor-pointer" />
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                activeChat?.id === chat.id ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-center">
                <div className="relative">
                  {chat.type === "group" ? (
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Users className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      {chat.name.charAt(0)}
                    </div>
                  )}
                  {chat.status === "online" && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{chat.name}</div>
                    <div className="text-sm text-gray-500">{chat.timestamp}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{chat.lastMessage}</div>
                </div>
                {chat.unread > 0 && (
                  <div className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {activeChat.type === "group" ? <Users className="w-5 h-5" /> : activeChat.name.charAt(0)}
              </div>
              <div className="ml-3">
                <div className="font-medium">{activeChat.name}</div>
                <div className="text-sm text-gray-500">{activeChat.status === "online" ? "Online" : "Offline"}</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Search className="w-5 h-5 text-gray-500 cursor-pointer" />
              <MessageCircle className="w-5 h-5 text-gray-500 cursor-pointer" />
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer">
                <Edit2 className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === "1" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderId === "1" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {msg.senderId !== "1" && <div className="text-xs text-gray-500 mb-1">{msg.senderName}</div>}
                  <div>{msg.content}</div>
                  <div className="text-xs mt-1 flex justify-end">
                    {msg.timestamp}
                    {msg.senderId === "1" && <span className="ml-2">{msg.status === "sent" ? "✓" : "✓✓"}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="text-gray-500 hover:text-gray-700">
                <Smile className="w-5 h-5" />
              </button>
              <button
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                onClick={() => {
                  if (message.trim()) {
                    // Handle sending message
                    setMessage("");
                  }
                }}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto" />
            <h2 className="mt-4 text-lg font-medium text-gray-900">No chat selected</h2>
            <p className="mt-2 text-gray-500">Choose a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;

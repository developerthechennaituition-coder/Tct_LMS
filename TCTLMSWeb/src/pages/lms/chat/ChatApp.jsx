import React, { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { getContacts  } from "../../../apiservices/ChatService";

const ChatApp = () => {
  const [connection, setConnection] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [chatHistory, setChatHistory] = useState({});
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const newConnection = new HubConnectionBuilder()
      //.withUrl('/chatHub')
      .withUrl('/pushNotificationHub?userId=' + localStorage.getItem("userId"))
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
    newConnection.start()
      .then(() => {
        newConnection.on('ReceiveMessage', handleReceiveMessage);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const role = localStorage.getItem("userRole");
      const response = await getContacts(userId, role);
      setContacts(response);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleReceiveMessage = (message) => {
    setMessages(prev => [...prev, message]);
    setChatHistory(prev => ({
      ...prev,
      [message.senderId]: [...(prev[message.senderId] || []), message]
    }));
  };

  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
    setMessages(chatHistory[contact.id] || []);
  };

  const handleSendMessage = async () => {
    if (!selectedContact || (!newMessage.trim() && files.length === 0)) return;

    const formData = new FormData();
    formData.append('message', newMessage);
    files.forEach(file => formData.append('files', file));
    formData.append('receiverId', selectedContact.id);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: formData
      });
      
      setNewMessage('');
      setFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Left Pane */}
      <table>
        <tr>
          <td>
          <div className="w-80 border-r flex flex-col" style={{ backgroundColor: "#798bff" }}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Chats</h1>
          <input
            type="text"
            placeholder="Search by name"
            className="w-full mt-4 p-2 border rounded bg-gray-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.filter(contact => 
            contact.fullName.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(contact => (
            <div
              key={contact.id}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedContact?.id === contact.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => handleContactSelect(contact)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{contact.fullName}</div>
                  <div className="text-sm text-gray-500">{contact.role}</div>
                </div>
                {chatHistory[contact.id]?.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {new Date(chatHistory[contact.id].slice(-1)[0].timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
              {chatHistory[contact.id]?.length > 0 && (
                <div className="text-sm text-gray-500 mt-1 truncate">
                  {chatHistory[contact.id].slice(-1)[0].content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
          </td>
          <td>
          <div className="flex-1 flex flex-col" style={{ backgroundColor: "red" }}>
        {selectedContact ? (
          <>
            <div className="p-4 border-b">
              <div className="font-medium">{selectedContact.fullName}</div>
              <div className="text-sm text-gray-500">Active now</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-4 flex ${msg.senderId === 'currentUser' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    msg.senderId === 'currentUser' ? 'bg-blue-500 text-white' : 'bg-gray-100'
                  }`}>
                    {msg.content}
                    {msg.attachments?.map((attachment, i) => (
                      <div key={i} className="mt-2">
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" 
                           className="text-sm underline">
                          {attachment.fileName}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full p-2 pr-10 border rounded"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <label htmlFor="file-upload" className="absolute right-2 top-2 cursor-pointer">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-lg">+</span>
                    </div>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    multiple
                    accept=".pdf,.doc,.docx,image/*"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Send
                </button>
              </div>
              {files.length > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  {files.length} file(s) selected
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
          </td>
        </tr>
      </table>
      

      {/* Right Pane */}
      
    </div>
  );
};

export default ChatApp;
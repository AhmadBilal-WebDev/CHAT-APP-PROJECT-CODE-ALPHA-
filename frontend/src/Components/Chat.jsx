import React, { useEffect, useRef, useState } from "react";
import { FiSend } from "react-icons/fi";
import { IoPeople } from "react-icons/io5";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { TfiFiles } from "react-icons/tfi";
import CallScreen from "./CallScreen";
const SERVER_URL = "http://localhost:5000";

const ChatDashboard = () => {
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectUser, setSelectUser] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [searchBar, setSearchBar] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [chatMessage, setChatMessage] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fileToSend, setFileToSend] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const [callState, setCallState] = useState({
    inCall: false,
    isCaller: false,
    remoteUser: null,
    incoming: null,
  });

  const lastDiv = useRef(null);
  const socket = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    socket.current = io(SERVER_URL);
    return () => socket.current && socket.current.disconnect();
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userChat"));
    if (userData) setCurrentUser(userData);

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/auth/getAllUsers`);
        const data = await res.json();
        if (data.success) setContacts(data.data);
      } catch (err) {
        console.log(err.message);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser && socket.current) {
      socket.current.emit("addUser", currentUser.userId);
    }
  }, [currentUser]);

  const handleSelectUser = (user, index) => {
    setSelectUser(user);
    setActiveIndex(index);
    showAllMessages(user);
  };

  const showAllMessages = async (user) => {
    try {
      const myUser = JSON.parse(localStorage.getItem("userChat"));
      const URL = `${SERVER_URL}/chat/showAllMessages/${myUser.userId}/${user._id}`;
      const res = await fetch(URL);
      const { success, data } = await res.json();
      if (success) {
        const updatedData = data.map((msg) => {
          if (msg.fileUrl && msg.fileUrl.startsWith("/uploads")) {
            return { ...msg, fileUrl: `${SERVER_URL}${msg.fileUrl}` };
          }
          return msg;
        });
        setChatMessage(updatedData);
      }
    } catch (err) {
      console.log(err.message);
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim() && !fileToSend) return;

    if (fileToSend) {
      await uploadFileAndSend();
      return;
    }

    try {
      const URL = `${SERVER_URL}/chat/message`;
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          senderId: currentUser.userId,
          receiverId: selectUser._id,
        }),
      });

      const { success, data } = await response.json();
      if (success) {
        socket.current.emit("sendMsg", {
          senderId: currentUser.userId,
          receiverId: selectUser._id,
          message: userMessage,
        });

        setChatMessage((prev) => [
          ...prev,
          {
            senderId: currentUser.userId,
            message: userMessage,
            time: data.time,
            fileUrl: data.fileUrl || null,
            fileType: data.fileType || null,
            fileName: data.fileName || null,
          },
        ]);

        setUserMessage("");
      }
    } catch (err) {
      console.log(err.message);
    }
  };

  const uploadFileAndSend = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("senderId", currentUser.userId);
      formData.append("receiverId", selectUser._id);

      const res = await fetch(`${SERVER_URL}/chat/upload`, {
        method: "POST",
        body: formData,
      });

      const { success, data } = await res.json();

      if (success) {
        const fileUrl = data.fileUrl.startsWith("http")
          ? data.fileUrl
          : `${SERVER_URL}${data.fileUrl}`;

        socket.current.emit("sendMsg", {
          senderId: currentUser.userId,
          receiverId: selectUser._id,
          message: "",
          fileUrl,
          fileType: data.fileType,
          fileName: data.fileName,
          time: data.time,
        });

        setChatMessage((prev) => [
          ...prev,
          {
            senderId: currentUser.userId,
            message: "",
            fileUrl,
            fileType: data.fileType,
            fileName: data.fileName,
            time: data.time,
          },
        ]);

        setFileToSend(null);
        setFilePreviewUrl(null);
      } else {
        console.log("Upload failed", data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!socket.current) return;

    socket.current.on("shareMsg", (msg) => {
      if (msg.fileUrl && msg.fileUrl.startsWith("/uploads")) {
        msg.fileUrl = `${SERVER_URL}${msg.fileUrl}`;
      }
      setChatMessage((prev) => [...prev, msg]);
    });

    socket.current.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.current.on("incomingCall", ({ fromUserId, offer }) => {
      setCallState((s) => ({
        ...s,
        incoming: { fromUserId, offer },
        remoteUser: contacts.find((c) => c._id === fromUserId) || null,
      }));
    });

    socket.current.on("callAnswered", ({ fromUserId, answer }) => {
      window.dispatchEvent(
        new CustomEvent("webrtc-answer", { detail: { fromUserId, answer } })
      );
    });

    socket.current.on("iceCandidate", ({ fromUserId, candidate }) => {
      window.dispatchEvent(
        new CustomEvent("webrtc-ice", { detail: { fromUserId, candidate } })
      );
    });

    socket.current.on("callEnded", ({ fromUserId }) => {
      window.dispatchEvent(
        new CustomEvent("webrtc-ended", { detail: { fromUserId } })
      );
    });

    socket.current.on("callUnavailable", ({ toUserId, message }) => {
      window.dispatchEvent(
        new CustomEvent("webrtc-unavailable", { detail: { toUserId, message } })
      );
    });

    return () => {
      if (socket.current) {
        socket.current.off("shareMsg");
        socket.current.off("onlineUsers");
        socket.current.off("incomingCall");
        socket.current.off("callAnswered");
        socket.current.off("iceCandidate");
        socket.current.off("callEnded");
        socket.current.off("callUnavailable");
      }
    };
  }, [contacts]);

  useEffect(() => {
    lastDiv.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessage]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileToSend(file);

    const type = file.type;
    if (type.startsWith("image/") || type.startsWith("video/")) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setFileToSend(null);
    setFilePreviewUrl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("userChat");
    window.location.href = "/";
  };

  const renderMessage = (msg) => {
    const isMe = msg.senderId === currentUser.userId;
    return (
      <div
        key={msg._id ? msg._id + Math.random() : Math.random()}
        className={`mb-2 ${isMe ? "text-right" : "text-left"}`}
      >
        <div
          className={`px-4 py-2 mt-1 rounded-lg inline-block max-w-[70%] break-words ${
            isMe ? "bg-blue-500 text-white" : "bg-gray-700 text-white"
          }`}
        >
          {msg.message && <p>{msg.message}</p>}

          {msg.fileUrl && (
            <div className="mt-2">
              {msg.fileType === "image" ? (
                <img
                  src={msg.fileUrl}
                  alt={msg.fileName || "image"}
                  className="max-w-full max-h-64 rounded-lg"
                />
              ) : msg.fileType === "video" ? (
                <video controls className="max-w-full max-h-64 rounded-lg">
                  <source src={msg.fileUrl} />
                </video>
              ) : (
                <a
                  href={msg.fileUrl}
                  download={msg.fileName || ""}
                  className="underline"
                >
                  {msg.fileName || "Download file"}
                </a>
              )}
            </div>
          )}

          <p className="text-white text-end text-[0.700rem]">{msg.time}</p>
        </div>
      </div>
    );
  };

  const startCall = async (toUser) => {
    if (!toUser) return;
    setCallState((s) => ({
      ...s,
      inCall: true,
      isCaller: true,
      remoteUser: toUser,
      incoming: null,
    }));
  };

  const acceptIncomingCall = () => {
    if (!callState.incoming) return;
    const fromUserId = callState.incoming.fromUserId;
    const remote = contacts.find((c) => c._id === fromUserId) || null;

    window.__INCOMING_CALL = callState.incoming;
    window.__CALL_INCOMING_FROM = fromUserId;

    setCallState((s) => ({
      ...s,
      inCall: true,
      isCaller: false,
      remoteUser: remote,
      incoming: s.incoming,
    }));
  };

  const rejectIncomingCall = () => {
    if (!callState.incoming) return;
    const from = callState.incoming.fromUserId;
    socket.current.emit("endCall", {
      fromUserId: currentUser.userId,
      toUserId: from,
    });
    setCallState({
      inCall: false,
      isCaller: false,
      remoteUser: null,
      incoming: null,
    });
    window.__INCOMING_CALL = null;
    window.__CALL_INCOMING_FROM = null;
  };

  const endCall = () => {
    if (callState.remoteUser) {
      socket.current.emit("endCall", {
        fromUserId: currentUser.userId,
        toUserId: callState.remoteUser._id,
      });
    }
    setCallState({
      inCall: false,
      isCaller: false,
      remoteUser: null,
      incoming: null,
    });
    window.dispatchEvent(new CustomEvent("webrtc-ended-local"));
    window.__INCOMING_CALL = null;
    window.__CALL_INCOMING_FROM = null;
  };

  const handleClickCall = () => {
    if (!selectUser) return alert("Select a contact first");
    if (!onlineUsers.includes(selectUser._id)) {
      return alert("User is offline/unavailable");
    }
    startCall(selectUser);
  };

  return (
    <div className="h-screen flex bg-gray-100 font-sans">
      <div
        className="bg-[#111B21] text-white flex flex-col
        w-[100%] sm:w-[30%] md:w-[25%]
        h-full border-r border-gray-800"
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-green-400">Chats</h2>
          <IoPeople className="text-2xl hover:cursor-pointer" />
        </div>

        <div className="flex justify-center">
          <input
            type="search"
            placeholder="Search"
            value={searchBar}
            onChange={(e) => setSearchBar(e.target.value)}
            className="bg-white mb-2 mt-2 text-black rounded-lg w-[90%] px-2 py-1 text-md outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts
            .filter(
              (items) =>
                items.username !== (currentUser && currentUser.username)
            )
            .filter((items) =>
              items.username.toLowerCase().includes(searchBar.toLowerCase())
            )
            .map((user, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 hover:bg-[#202C33] cursor-pointer 
                 ${activeIndex === index ? "bg-[#202C33]" : ""}`}
                onClick={() => handleSelectUser(user, index)}
              >
                <div className="h-11 w-11 bg-blue-500 rounded-full flex justify-center items-center relative">
                  <p className="text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </p>

                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-[#111B21]"></span>
                  )}
                </div>

                <div>
                  <p className="font-medium">{user.username}</p>
                </div>
              </div>
            ))}
        </div>

        <div className="p-1 border-t border-gray-800 bg-[#111B21] shadow-sm">
          {contacts
            .filter(
              (items) =>
                items.username === (currentUser && currentUser.username)
            )
            .map((items, index) => (
              <div
                key={index}
                className="p-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 bg-blue-500 rounded-full flex justify-center items-center">
                    <p className="text-white font-bold">
                      {items.username.charAt(0).toUpperCase()}
                    </p>
                  </div>
                  <p className="font-medium">{items.username}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex-1 bg-cover bg-[url('https://i.pinimg.com/originals/e8/d9/4e/e8d94e1e8b6b530ad315e9385290141b.jpg')] flex flex-col">
        {!selectUser ? (
          <div className="flex-1 flex justify-center items-center text-white text-xl">
            Select a chat
          </div>
        ) : (
          <>
            <div className="h-15 bg-[#111B21] text-white border-b border-gray-700 flex justify-between items-center px-2">
              <div className="flex items-center">
                <span className="bg-blue-500 textwhite font-semibold rounded-full p-2 w-10 text-center ml-2">
                  {selectUser.username.charAt(0).toUpperCase()}
                </span>
                <span className="px-2">{selectUser.username}</span>
                {onlineUsers.includes(selectUser._id) && (
                  <span className="ml-2 text-xs text-green-400">online</span>
                )}
              </div>

              <div className="flex items-center gap-2 pr-3">
                <button
                  onClick={handleClickCall}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm flex items-center gap-2"
                >
                  📞 <span>Call</span>
                </button>
                <button
                  onClick={() => {
                    setSelectUser(false);
                    setActiveIndex(null);
                  }}
                  className="text-white text-sm px-3 py-1 rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:px-10 text-white">
              {chatMessage.map((msg, idx) => renderMessage(msg))}
              <div ref={lastDiv} />
            </div>

            <div className="p-3 bg-[#111B21] flex flex-col gap-2">
              {filePreviewUrl && (
                <div className="p-2 bg-[#1f2c33] rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {fileToSend.type.startsWith("image/") ? (
                      <img
                        src={filePreviewUrl}
                        alt="preview"
                        className="h-16 object-cover rounded"
                      />
                    ) : fileToSend.type.startsWith("video/") ? (
                      <video src={filePreviewUrl} className="h-16" />
                    ) : (
                      <div className="text-white">{fileToSend.name}</div>
                    )}
                    <div className="text-white text-sm">{fileToSend.name}</div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-sm text-red-400"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <label className=" px-3 py-2 rounded cursor-pointer">
                  <TfiFiles className="text-white text-2xl" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Type..."
                  className="flex-1 px-4 py-2 rounded-lg text-white bg-[#1f2c33] outline-none"
                />

                <button
                  onClick={handleSendMessage}
                  className="bg-blue-500 px-4 py-2 rounded-lg text-white"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {callState.incoming && !callState.inCall && (
        <div className="fixed inset-0 flex items-end md:items-center justify-center p-4 z-50">
          <div className="bg-[#111B21] text-white rounded-lg shadow-lg p-4 w-full max-w-md">
            <p className="mb-3">
              Incoming call from{" "}
              <strong>
                {callState.remoteUser
                  ? callState.remoteUser.username
                  : callState.incoming.fromUserId}
              </strong>
            </p>
            <div className="flex justify-between gap-3">
              <button
                onClick={acceptIncomingCall}
                className="bg-green-600 px-4 py-2 rounded"
              >
                Accept
              </button>
              <button
                onClick={rejectIncomingCall}
                className="bg-red-600 px-4 py-2 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {callState.inCall && (
        <CallScreen
          socket={socket.current}
          isCaller={callState.isCaller}
          localUser={currentUser}
          remoteUser={callState.remoteUser}
          incomingOffer={callState.incoming ? callState.incoming.offer : null}
          incomingFrom={
            callState.incoming ? callState.incoming.fromUserId : null
          }
          onEndCall={endCall}
          setCallState={setCallState}
        />
      )}
    </div>
  );
};

export default ChatDashboard;

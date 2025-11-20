import React, { useEffect, useRef, useState } from "react";

const CallScreen = ({
  socket,
  isCaller,
  localUser,
  remoteUser,
  incomingOffer,
  incomingFrom,
  onEndCall,
  setCallState,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const [status, setStatus] = useState("starting");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);

  const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  const startedRef = useRef(false);

  useEffect(() => {
    if (isCaller && !startedRef.current) {
      startedRef.current = true;
      startLocalStreamAndPeerForCaller();
    }
  }, [isCaller]);

  useEffect(() => {
    if (!isCaller && incomingOffer && !startedRef.current) {
      startedRef.current = true;
      window.__INCOMING_CALL = {
        fromUserId: incomingFrom,
        offer: incomingOffer,
      };
      window.__CALL_INCOMING_FROM = incomingFrom;
      startLocalStreamAndPeerForCallee(incomingOffer, incomingFrom);
    }
  }, [incomingOffer, incomingFrom, isCaller]);

  useEffect(() => {
    const handleAnswer = (e) => {
      const { answer } = e.detail || {};
      if (!pcRef.current) return;
      pcRef.current
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch((err) => console.warn("setRemoteDescription error:", err));
      setStatus("connected");
    };

    const handleIce = (e) => {
      const { candidate } = e.detail || {};
      if (candidate && pcRef.current) {
        pcRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => console.warn("addIceCandidate error:", err));
      }
    };

    const handleCallEnded = () => cleanupAndClose();

    window.addEventListener("webrtc-answer", handleAnswer);
    window.addEventListener("webrtc-ice", handleIce);
    window.addEventListener("webrtc-ended", handleCallEnded);
    window.addEventListener("webrtc-ended-local", handleCallEnded);

    return () => {
      window.removeEventListener("webrtc-answer", handleAnswer);
      window.removeEventListener("webrtc-ice", handleIce);
      window.removeEventListener("webrtc-ended", handleCallEnded);
      window.removeEventListener("webrtc-ended-local", handleCallEnded);
      cleanupAndClose();
    };
  }, []);

  const safeAddTracks = (stream, pc) => {
    if (!stream) return console.log("Stream missing — permission not allowed.");
    const tracks = stream.getTracks();
    if (!tracks || tracks.length === 0)
      return console.log("No media tracks found.");
    tracks.forEach((t) => pc.addTrack(t, stream));
  };

  const startLocalStreamAndPeerForCaller = async () => {
    try {
      setStatus("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      pcRef.current = new RTCPeerConnection(servers);
      safeAddTracks(stream, pcRef.current);

      const remoteStream = new MediaStream();
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStream;
      pcRef.current.ontrack = (e) =>
        e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate && remoteUser?._id) {
          socket.emit("iceCandidate", {
            fromUserId: localUser.userId,
            toUserId: remoteUser._id,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socket.emit("callUser", {
        fromUserId: localUser.userId,
        toUserId: remoteUser._id,
        offer,
      });
      setStatus("ringing");
    } catch (err) {
      console.error("Caller Error:", err);
      handlePermissionError(err);
    }
  };

  const startLocalStreamAndPeerForCallee = async (offer, fromUserId) => {
    try {
      setStatus("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      pcRef.current = new RTCPeerConnection(servers);
      safeAddTracks(stream, pcRef.current);

      const remoteStream = new MediaStream();
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStream;
      pcRef.current.ontrack = (e) =>
        e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            fromUserId: localUser.userId,
            toUserId: fromUserId,
            candidate: event.candidate,
          });
        }
      };

      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answerCall", {
        fromUserId: localUser.userId,
        toUserId: fromUserId,
        answer,
      });
      setStatus("connected");
    } catch (err) {
      console.error("Callee Error:", err);
      handlePermissionError(err);
    }
  };

  const handlePermissionError = (err) => {
    alert(
      err?.name === "NotAllowedError"
        ? "Please allow camera & microphone."
        : "Camera/Mic not available."
    );
    cleanupAndClose();
  };

  const toggleMute = () => {
    const newMuted = !muted;
    localStreamRef.current
      ?.getAudioTracks()
      ?.forEach((t) => (t.enabled = !newMuted));
    setMuted(newMuted);
  };

  const toggleCam = () => {
    const newCamOff = !camOff;
    localStreamRef.current
      ?.getVideoTracks()
      ?.forEach((t) => (t.enabled = !newCamOff));
    setCamOff(newCamOff);
  };

  const startScreenShare = async () => {
    if (!sharingScreen) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = stream;
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track.kind === "video");
        sender.replaceTrack(stream.getVideoTracks()[0]);
        setSharingScreen(true);

        stream.getVideoTracks()[0].onended = () => stopScreenShare();
      } catch (err) {
        console.log("Screen share error:", err);
      }
    } else stopScreenShare();
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track.kind === "video");
      sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setSharingScreen(false);
    }
  };

  const hangUp = () => {
    socket.emit("endCall", {
      fromUserId: localUser.userId,
      toUserId: remoteUser?._id || incomingFrom,
    });
    cleanupAndClose();
    onEndCall?.();
  };

  const cleanupAndClose = () => {
    setStatus("ended");
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    setCallState?.({
      inCall: false,
      isCaller: false,
      remoteUser: null,
      incoming: null,
    });
    window.__INCOMING_CALL = null;
    window.__CALL_INCOMING_FROM = null;
    startedRef.current = false;
    setSharingScreen(false);
  };

 return (
  <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col md:flex-row items-center justify-center p-2">

    <div className="flex-1 relative w-full md:w-[70%] h-[75vh] md:h-[80vh] bg-black rounded-xl overflow-hidden shadow-lg">
      
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover rounded-xl"
      />
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-md shadow">
        {remoteUser?.username || "Remote"}
      </div>

      <div className="absolute bottom-4 right-4 w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden border-2 border-gray-600 shadow-lg cursor-move"
           draggable
           onDragStart={(e) => e.preventDefault()}>
        <video 
          ref={localVideoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover rounded-xl"
        />
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
          You
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/70 text-white px-4 py-1 rounded-full shadow">
        {status === "starting" && "Starting..."}
        {status === "ringing" && "Ringing..."}
        {status === "connected" && "Connected"}
        {status === "ended" && "Call Ended"}
      </div>

    </div>

    <div className="w-full md:w-[28%] h-auto md:h-[80vh] bg-gray-800 text-white rounded-xl shadow-lg flex flex-col justify-between p-4 mt-4 md:mt-0 md:ml-4">
      
      <div>
        <h3 className="text-xl font-semibold mb-1">{remoteUser?.username || "Calling..."}</h3>
        <p className="text-gray-400 text-sm mb-4">You: {localUser?.username}</p>

        <div className="flex flex-col gap-3">
          <button onClick={toggleMute} className="bg-gray-700 hover:bg-gray-600 transition px-4 py-3 rounded-xl shadow hover:scale-105">
            {muted ? "Unmute 🎤" : "Mute 🎤"}
          </button>

          <button onClick={toggleCam} className="bg-gray-700 hover:bg-gray-600 transition px-4 py-3 rounded-xl shadow hover:scale-105">
            {camOff ? "Camera On 📹" : "Camera Off 📹"}
          </button>

          <button onClick={startScreenShare} className="bg-gray-700 hover:bg-gray-600 transition px-4 py-3 rounded-xl shadow hover:scale-105">
            {sharingScreen ? "Stop Screen Share 🖥️" : "Share Screen 🖥️"}
          </button>

          <button onClick={hangUp} className="bg-red-600 hover:bg-red-500 transition px-4 py-3 rounded-xl shadow hover:scale-105">
            End Call
          </button>
        </div>
      </div>

      <div className="mt-6 text-gray-300 text-xs">
        <p className="font-medium mb-1">Tips:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Use Mute/Unmute to control your mic</li>
          <li>Use Camera toggle to show/hide video</li>
          <li>Share your screen for presentations</li>
        </ul>
      </div>
    </div>

  </div>
);

};

export default CallScreen;

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
  const [status, setStatus] = useState("starting");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

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

  // ✅ FIX ADDED HERE
  const safeAddTracks = (stream, pc) => {
    if (!stream) return console.log("Stream missing — permission not allowed.");
    const tracks = stream.getTracks();
    if (!tracks || tracks.length === 0) {
      console.log("No media tracks found.");
      return;
    }
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

      // ✅ FIX usage
      safeAddTracks(stream, pcRef.current);

      const remoteStream = new MediaStream();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

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

      // ✅ FIX usage
      safeAddTracks(stream, pcRef.current);

      const remoteStream = new MediaStream();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

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
    localStreamRef.current?.getAudioTracks()
      ?.forEach((t) => (t.enabled = !newMuted));
    setMuted(newMuted);
  };

  const toggleCam = () => {
    const newCamOff = !camOff;
    localStreamRef.current?.getVideoTracks()
      ?.forEach((t) => (t.enabled = !newCamOff));
    setCamOff(newCamOff);
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

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setCallState?.({
      inCall: false,
      isCaller: false,
      remoteUser: null,
      incoming: null,
    });

    window.__INCOMING_CALL = null;
    window.__CALL_INCOMING_FROM = null;
    startedRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="bg-[#0b1416] w-full max-w-4xl rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row">

        <div className="flex-1 p-3 flex flex-col gap-2">
          {/* Video Section */}
          <div className="flex-1 bg-black rounded overflow-hidden flex flex-col md:flex-row gap-2 p-2">
            <div className="flex-1 rounded overflow-hidden relative min-h-[200px]">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
              <div className="absolute left-2 top-2 text-white text-sm bg-black/40 px-2 py-1 rounded">
                Remote
              </div>
            </div>

            <div className="w-full md:w-48 rounded overflow-hidden relative min-h-[120px]">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover bg-black" />
              <div className="absolute left-2 top-2 text-white text-sm bg-black/40 px-2 py-1 rounded">
                You
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-2">
            <div className="text-white text-sm">
              {status === "starting" && "Starting..."}
              {status === "ringing" && "Ringing..."}
              {status === "connected" && "Connected"}
              {status === "ended" && "Call ended"}
            </div>

            <div className="flex gap-2">
              <button onClick={toggleMute} className="bg-gray-800 px-3 py-2 rounded text-white text-sm">
                {muted ? "Unmute" : "Mute"}
              </button>

              <button onClick={toggleCam} className="bg-gray-800 px-3 py-2 rounded text-white text-sm">
                {camOff ? "Cam On" : "Cam Off"}
              </button>

              <button onClick={hangUp} className="bg-red-600 px-3 py-2 rounded text-white text-sm">
                End
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-64 p-3 bg-[#071014] text-white">
          <h3 className="font-semibold">
            {remoteUser?.username || "Calling..."}
          </h3>
          <p className="text-xs mt-1">You: {localUser?.username}</p>

          <div className="mt-4 text-sm">
            <p>Controls:</p>
            <ul className="list-disc ml-5 mt-2 text-xs">
              <li>Mute / Unmute</li>
              <li>Camera On/Off</li>
              <li>End Call</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CallScreen;

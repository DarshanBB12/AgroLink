import { useRef, useState, useCallback, useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import type { Socket } from "socket.io-client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export const useWebRTC = () => {
  interface IncomingCallData {
    callerId: string;
    callerName?: string;
    offer?: RTCSessionDescriptionInit;
  }

  interface PendingOffer {
    offer: RTCSessionDescriptionInit;
    receiverId: string;
  }

  interface WebRTCSignalPayload {
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }

  type AgroSocket = Socket & { _pendingOffer?: PendingOffer };

  const { socket } = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const endCallRef = useRef<() => void>(() => undefined);

  const [callState, setCallState] = useState<"idle" | "calling" | "incoming" | "connected">("idle");
  const [callInfo, setCallInfo] = useState<IncomingCallData | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const createPeerConnection = useCallback((peerId: string) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc:ice-candidate", {
          peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        endCallRef.current();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Failed to get local stream:", error);
      throw error;
    }
  }, []);

  const startCall = useCallback(
    async (receiverId: string) => {
      try {
        setCallState("calling");
        const stream = await getLocalStream();
        const pc = createPeerConnection(receiverId);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (socket) {
          socket.emit("call:initiate", {
            receiverId,
            callType: "voice",
          });
        }

        (socket as AgroSocket)._pendingOffer = { offer, receiverId };
      } catch (error) {
        console.error("Failed to start call:", error);
        setCallState("idle");
        throw error;
      }
    },
    [getLocalStream, createPeerConnection, socket]
  );

  const acceptCall = useCallback(async () => {
    try {
      if (!callInfo) return;

      setCallState("connected");
      const stream = await getLocalStream();
      const pc = createPeerConnection(callInfo.callerId);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      if (callInfo.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callInfo.offer));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket) {
        socket.emit("call:accept", { callerId: callInfo.callerId });
        socket.emit("webrtc:answer", {
          callerId: callInfo.callerId,
          answer,
        });
      }
    } catch (error) {
      console.error("Failed to accept call:", error);
      setCallState("idle");
      throw error;
    }
  }, [callInfo, getLocalStream, createPeerConnection, socket]);

  const rejectCall = useCallback(() => {
    if (callInfo && socket) {
      socket.emit("call:reject", { callerId: callInfo.callerId });
    }
    setCallState("idle");
    setCallInfo(null);
  }, [callInfo, socket]);

  const endCall = useCallback(() => {
    if (callInfo?.callerId && socket) {
      socket.emit("call:end", { peerId: callInfo.callerId });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setCallState("idle");
    setCallInfo(null);
    setIsMuted(false);
  }, [callInfo?.callerId, socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const isAudioEnabled = localStreamRef.current
        .getAudioTracks()
        .some((track) => track.enabled);

      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioEnabled;
      });

      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", (data: IncomingCallData) => {
      setCallInfo(data);
      setCallState("incoming");
    });

    socket.on("call:accepted", async () => {
      try {
        setCallState("connected");
        if ((socket as AgroSocket)._pendingOffer) {
          const { offer, receiverId } = (socket as AgroSocket)._pendingOffer as PendingOffer;
          socket.emit("webrtc:offer", {
            receiverId,
            offer,
          });
          delete (socket as AgroSocket)._pendingOffer;
        }
      } catch (error) {
        console.error("Error on call accepted:", error);
      }
    });

    socket.on("call:rejected", () => {
      endCall();
    });

    socket.on("call:ended", () => {
      endCall();
    });

    socket.on("call:user-unavailable", () => {
      setCallState("idle");
    });

    socket.on("webrtc:offer", (data: WebRTCSignalPayload) => {
      setCallInfo((prev) => ({
        ...prev,
        offer: data.offer,
      }));
    });

    socket.on("webrtc:answer", async (data: WebRTCSignalPayload) => {
      try {
        if (pcRef.current && data.answer) {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    });

    socket.on("webrtc:ice-candidate", async (data: WebRTCSignalPayload) => {
      try {
        if (pcRef.current && data.candidate) {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
      socket.off("call:user-unavailable");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
    };
  }, [socket, endCall]);

  return {
    callState,
    callInfo,
    isMuted,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
};

import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export default function useSocket(localStream) {
  const [status, setStatus] = useState('idle');
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const partnerIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    socket.on('waiting', () => {
      setStatus('waiting');
    });

    socket.on('matched', async ({ partnerId }) => {
      setStatus('matched');
      partnerIdRef.current = partnerId;

      const pc = new RTCPeerConnection(configuration);
      peerRef.current = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: partnerId, candidate: event.candidate });
        }
      };

      if (socket.id < partnerId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: partnerId, offer });
      }
    });

    socket.on('offer', async ({ from, offer }) => {
      const pc = peerRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = peerRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peerRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('partner-disconnected', () => {
      resetCall();
      toast('Partner disconnected. Finding a new partner...');
      setStatus('waiting');
      socket.emit('join');
    });

    return () => {
      socket.off('waiting');
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('partner-disconnected');
    };
  }, [localStream]);

  const resetCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    partnerIdRef.current = null;
  }, []);

  const attachLocalStream = useCallback(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const startChat = useCallback(() => {
    const socket = socketRef.current;
    if (socket && status === 'idle') {
      socket.emit('join');
      setStatus('waiting');
    }
  }, [status]);

  const next = useCallback(() => {
    const socket = socketRef.current;
    if (socket && status === 'matched') {
      resetCall();
      socket.emit('next');
      setStatus('waiting');
    }
  }, [status, resetCall]);

  const endCall = useCallback(() => {
    const socket = socketRef.current;
    if (socket && status === 'matched') {
      resetCall();
      socket.emit('end');
      setStatus('idle');
    }
  }, [status, resetCall]);

  return {
    status,
    startChat,
    next,
    endCall,
    resetCall,
    localVideoRef,
    remoteVideoRef,
    attachLocalStream,
  };
}

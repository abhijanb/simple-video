import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('idle');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const partnerIdRef = useRef(null);

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch((err) => console.error('Error accessing media devices:', err));

    return () => {
      newSocket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('waiting', () => {
      setStatus('waiting');
    });

    socket.on('matched', async ({ partnerId, roomId }) => {
      setStatus('matched');
      partnerIdRef.current = partnerId;

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
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
      const pc = peerConnectionRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('partner-disconnected', () => {
      resetCall();
      setStatus('idle');
      alert('Partner disconnected. Click Start to find a new partner.');
    });

    return () => {
      socket.off('waiting');
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('partner-disconnected');
    };
  }, [socket, localStream]);

  const startChat = () => {
    if (socket && status === 'idle') {
      socket.emit('join');
      setStatus('waiting');
    }
  };

  const next = () => {
    if (socket && status === 'matched') {
      resetCall();
      socket.emit('next');
      setStatus('waiting');
    }
  };

  const resetCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteStream(null);
    partnerIdRef.current = null;
  };

  const endCall = () => {
    if (socket && status === 'matched') {
      resetCall();
      socket.emit('end');
      setStatus('idle');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Omegle Clone</h1>

      <div className="flex flex-wrap justify-center gap-4 w-full max-w-5xl">
        <div className="relative w-full md:w-1/2 bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            You
          </div>
        </div>

        <div className="relative w-full md:w-1/2 bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            Stranger
          </div>
          {status !== 'matched' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
              {status === 'waiting' ? 'Looking for a stranger...' : 'Click Start to chat'}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-6">
        {status === 'idle' && (
          <button
            onClick={startChat}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full font-semibold"
          >
            Start Chat
          </button>
        )}
        {status === 'waiting' && (
          <button
            disabled
            className="bg-gray-600 px-6 py-2 rounded-full font-semibold cursor-not-allowed"
          >
            Finding Partner...
          </button>
        )}
        {status === 'matched' && (
          <>
            <button
              onClick={next}
              className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-full font-semibold"
            >
              Next
            </button>
            <button
              onClick={endCall}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-semibold"
            >
              End Call
            </button>
            <button
              onClick={toggleMute}
              className={`px-6 py-2 rounded-full font-semibold ${isMuted ? 'bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'
                }`}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`px-6 py-2 rounded-full font-semibold ${isVideoOff ? 'bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
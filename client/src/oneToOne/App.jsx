import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import useMedia from './hooks/useMedia';
import useSocket from './hooks/useSocket';
import VideoPanel from './components/VideoPanel';
import Controls from './components/Controls';

function App() {
  const { localStream, isMuted, isVideoOff, toggleMute, toggleVideo } = useMedia();
  const {
    status,
    startChat,
    next,
    endCall,
    localVideoRef,
    remoteVideoRef,
  } = useSocket(localStream);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
        }}
      />
      <h1 className="text-3xl font-bold mb-4">Omegle Clone</h1>

      <div className="flex flex-wrap justify-center gap-4 w-full max-w-5xl">
        <VideoPanel
          ref={localVideoRef}
          label="You"
          muted
        />
        <VideoPanel
          ref={remoteVideoRef}
          label="Stranger"
          overlayText={
            status !== 'matched'
              ? status === 'waiting'
                ? 'Looking for a stranger...'
                : 'Click Start to chat'
              : null
          }
        />
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <Controls
          status={status}
          onStart={startChat}
          onNext={next}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
        />
      </div>
    </div>
  );
}

export default App;

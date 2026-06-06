export default function Controls({
  status,
  onStart,
  onNext,
  onEnd,
  onToggleMute,
  onToggleVideo,
  isMuted,
  isVideoOff,
}) {
  if (status === 'idle') {
    return (
      <button
        onClick={onStart}
        className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full font-semibold"
      >
        Start Chat
      </button>
    );
  }

  if (status === 'waiting') {
    return (
      <button
        disabled
        className="bg-gray-600 px-6 py-2 rounded-full font-semibold cursor-not-allowed"
      >
        Finding Partner...
      </button>
    );
  }

  return (
    <>
      <button
        onClick={onNext}
        className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-full font-semibold"
      >
        Next
      </button>
      <button
        onClick={onEnd}
        className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-semibold"
      >
        End Call
      </button>
      <button
        onClick={onToggleMute}
        className={`px-6 py-2 rounded-full font-semibold ${isMuted ? 'bg-gray-700' : 'bg-purple-600 hover:bg-purple-700'}`}
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <button
        onClick={onToggleVideo}
        className={`px-6 py-2 rounded-full font-semibold ${isVideoOff ? 'bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
      </button>
    </>
  );
}

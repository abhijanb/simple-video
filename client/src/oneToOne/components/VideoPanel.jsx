import { forwardRef } from 'react';

const VideoPanel = forwardRef(({ label, overlayText, muted = false }, ref) => (
  <div className="relative w-full md:w-1/2 bg-black rounded-lg overflow-hidden aspect-video">
    <video
      ref={ref}
      autoPlay
      muted={muted}
      playsInline
      className="w-full h-full object-cover"
    />
    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
      {label}
    </div>
    {overlayText && (
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
        {overlayText}
      </div>
    )}
  </div>
));

export default VideoPanel;

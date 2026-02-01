import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, Minimize2, Maximize2 } from 'lucide-react';

interface VideoCallModalProps {
  recipientName: string;
  onEndCall: () => void;
  isAiCall: boolean;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({ recipientName, onEndCall, isAiCall }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Initialize Media Stream
    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // SIMULATION: In a real app, WebRTC signaling would connect to a peer.
        // For this demo, we mirror the local stream to the remote video to simulate a connection
        // or show a placeholder if it's an AI call that doesn't generate video yet.
        if (remoteVideoRef.current && !isAiCall) {
           // Simulating a delay for connection
           setTimeout(() => {
             if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream; 
           }, 1000);
        }

      } catch (err) {
        console.error("Error accessing media devices:", err);
        alert("Không thể truy cập Camera hoặc Micro. Vui lòng kiểm tra quyền truy cập.");
        onEndCall();
      }
    };

    startCall();

    return () => {
      // Cleanup tracks on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    onEndCall();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-64 bg-slate-900 rounded-lg shadow-2xl overflow-hidden border border-slate-700">
        <div className="relative h-36 bg-slate-800 flex items-center justify-center">
            {/* Minimal view showing recipient */}
             {!isAiCall ? (
                 <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
             ) : (
                 <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                        <User className="text-white" size={24} />
                    </div>
                 </div>
             )}
             <div className="absolute top-2 right-2 flex space-x-1">
                 <button onClick={() => setIsMinimized(false)} className="p-1 bg-black/50 text-white rounded hover:bg-black/70">
                    <Maximize2 size={14} />
                 </button>
             </div>
             <div className="absolute bottom-2 left-0 right-0 text-center">
                 <span className="text-xs text-white font-medium shadow-black drop-shadow-md">{recipientName}</span>
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
          <div>
              <h2 className="text-white text-xl font-bold">{recipientName}</h2>
              <p className="text-indigo-300 text-sm flex items-center gap-2">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 00:15
              </p>
          </div>
          <button onClick={() => setIsMinimized(true)} className="p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full">
            <Minimize2 size={24} />
          </button>
        </div>

        {/* Main Video Area (Remote) */}
        <div className="flex-1 relative bg-slate-800 flex items-center justify-center">
           {isAiCall ? (
               <div className="flex flex-col items-center animate-pulse">
                   <div className="w-32 h-32 bg-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                        <User size={64} className="text-white" />
                   </div>
                   <p className="mt-6 text-indigo-200 text-lg">AI đang nghe...</p>
               </div>
           ) : (
               /* In a real app, this is the remote stream. Here we mirror local for demo */
               <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                // muted={true} // Muted locally to prevent echo in this loopback demo
                className="w-full h-full object-cover" 
               />
           )}
        </div>

        {/* Local Video (PiP) */}
        <div className="absolute top-20 right-4 w-32 md:w-48 aspect-video bg-black rounded-lg border-2 border-slate-700 overflow-hidden shadow-lg">
             {!isVideoOff ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <User size={24} className="text-slate-500" />
                </div>
             )}
             <div className="absolute bottom-1 left-2 text-[10px] text-white font-medium drop-shadow-md">Bạn</div>
        </div>

        {/* Controls Bar */}
        <div className="h-24 bg-slate-900 flex items-center justify-center space-x-6">
            <button 
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            
            <button 
                onClick={handleEndCall}
                className="p-5 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-all shadow-lg shadow-red-500/30"
            >
                <PhoneOff size={32} />
            </button>

            <button 
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
        </div>

      </div>
    </div>
  );
};

export default VideoCallModal;
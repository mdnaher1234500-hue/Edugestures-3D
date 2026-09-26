'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface VideoGridProps {
  sessionCode: string;
  isTeacher?: boolean;
}

export default function VideoGrid({ sessionCode, isTeacher }: VideoGridProps) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setStreamError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }

      setHasPermission(true);
      setCamOn(true);
      setMicOn(true);
    } catch (err: any) {
      console.warn('Webcam stream error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError') {
        setStreamError('Camera permission denied. Click the camera icon in browser URL bar to allow.');
      } else if (err.name === 'NotFoundError') {
        setStreamError('No camera detected. Connect a webcam.');
      } else if (err.name === 'NotReadableError') {
        setStreamError('Webcam is currently in use by another app.');
      } else {
        setStreamError(err.message || 'Unable to access webcam.');
      }
    }
  };

  useEffect(() => {
    startCamera();

    // Exchange LiveKit token in background if configured
    fetchApi<{ token: string; url: string; configured: boolean }>('/livekit/token', {
      method: 'POST',
      body: JSON.stringify({ room: sessionCode }),
    }).catch((err) => {
      console.debug('LiveKit optional token check:', err);
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [sessionCode]);

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !camOn;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setCamOn(nextState);
      }
    } else {
      startCamera();
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !micOn;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setMicOn(nextState);
      }
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border border-slate-800 p-3 shadow-xl">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200">Live Video Feed</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-full border border-slate-700">
          {camOn ? 'Live Stream' : 'Camera Off'}
        </span>
      </div>

      {/* Primary Video Tile */}
      <div className="relative flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[140px]">
        {/* Real HTML5 Webcam Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 ${
            camOn && hasPermission ? 'block' : 'hidden'
          }`}
        />

        {/* Fallback display if camera paused or error */}
        {(!camOn || !hasPermission) && (
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
            {streamError ? (
              <div className="flex flex-col items-center gap-2 max-w-[200px]">
                <AlertCircle className="w-6 h-6 text-amber-400" />
                <span className="text-[11px] text-slate-300 leading-tight">{streamError}</span>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Camera
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <VideoOff className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400">Camera Paused</span>
              </div>
            )}
          </div>
        )}

        {/* Top Status Badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1.5 border border-white/10">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              camOn && hasPermission ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{isTeacher ? 'Teacher' : 'Student'}</span>
        </div>

        {/* Bottom Floating Media Controls */}
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          <button
            onClick={toggleMic}
            className={`p-1.5 rounded-lg text-xs backdrop-blur-md transition-colors ${
              micOn ? 'bg-slate-800/80 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
            title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`p-1.5 rounded-lg text-xs backdrop-blur-md transition-colors ${
              camOn ? 'bg-slate-800/80 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
            title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

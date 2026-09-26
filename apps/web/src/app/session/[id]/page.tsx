'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Users,
  Lock,
  Unlock,
  LogOut,
  Hand,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  HelpCircle,
  X,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useSessionStore } from '@/stores/sessionStore';
import ThreeDViewer from '@/components/classroom/ThreeDViewer';
import ChatPanel from '@/components/classroom/ChatPanel';
import VideoGrid from '@/components/classroom/VideoGrid';
import { SessionSummary, UserRole } from '@edugesture/shared-types';

export default function LiveClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = (params.id as string).toUpperCase();

  const { user, initAuth } = useAuthStore();
  const {
    transform,
    setTransform,
    participantCount,
    setParticipantCount,
    isLocked,
    setIsLocked,
    gestureStatus,
    setGestureStatus,
  } = useSessionStore();

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [launchingAgent, setLaunchingAgent] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    // 1. Fetch Session Metadata
    fetchApi<SessionSummary>(`/sessions/${sessionCode}`)
      .then((data) => {
        setSession(data);
        setIsLocked(data.isLocked ?? false);
      })
      .catch((err) => {
        console.error('Failed to load session:', err);
      })
      .finally(() => setLoading(false));

    // 2. Connect to Socket.IO and join session
    const token = localStorage.getItem('token') || '';
    const socket = getSocket(token);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('session:join', { sessionCode, token });

    // 3. Listen to authoritative 3D state broadcasts
    socket.on('session:state', (newState) => {
      setTransform(newState);
    });

    socket.on('session:participants', (count) => {
      setParticipantCount(count);
    });

    socket.on('classroom:locked', (locked) => {
      setIsLocked(locked);
    });

    // 4. Listen to Gesture Agent Status notifications
    socket.on('gesture:agent_status' as any, (data: { status: string; connected?: boolean }) => {
      if (data?.status) {
        setGestureStatus(data.status);
      }
    });

    socket.on('session:ended', () => {
      alert('The teacher has ended this classroom session.');
      router.push('/dashboard');
    });

    return () => {
      socket.emit('session:leave', { sessionCode });
      socket.off('session:state');
      socket.off('session:participants');
      socket.off('classroom:locked');
      socket.off('gesture:agent_status' as any);
      socket.off('session:ended');
    };
  }, [sessionCode, router, setTransform, setParticipantCount, setIsLocked, setGestureStatus]);

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTeacher = user?.role === UserRole.TEACHER;

  const handleLaunchAgent = async () => {
    setLaunchingAgent(true);
    try {
      setGestureStatus('Starting Python Agent...');
      const res = await fetchApi<{ success: boolean; message: string }>(
        `/sessions/${sessionCode}/start-agent`,
        { method: 'POST' }
      );
      if (res?.success) {
        setGestureStatus('Active (Python Agent)');
      }
    } catch (err: any) {
      console.warn('Auto launch error:', err);
      setShowGuide(true);
    } finally {
      setLaunchingAgent(false);
    }
  };

  const handleEndClass = async () => {
    if (!session || !confirm('Are you sure you want to end this live class?')) return;
    try {
      await fetchApi(`/sessions/${session.id}/end`, { method: 'PATCH' });
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error ending session');
    }
  };

  const handleToggleLock = () => {
    const socket = getSocket();
    socket.emit('classroom:lock', { sessionCode, locked: !isLocked });
  };

  const isAgentActive =
    gestureStatus.toLowerCase().includes('active') ||
    gestureStatus.toLowerCase().includes('connected');

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090d16] text-slate-100 overflow-hidden select-none relative">
      {/* Top Classroom Bar */}
      <header className="h-14 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between glass-panel z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 hover:scale-105 transition-transform"
          >
            <Box className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white">{session?.title || 'EduGesture 3D Live Classroom'}</h1>
              <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Teacher: {session?.teacherName || 'Host'}</span>
              <span>•</span>
              <span>Model: {session?.modelName || 'Heart Anatomy'}</span>
            </p>
          </div>
        </div>

        {/* Center: Session Code & Gesture Agent Status */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-mono text-cyan-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>CODE: {sessionCode}</span>
          </button>

          {/* Gesture Engine Status Capsule */}
          <div
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs transition-all ${
              isAgentActive
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Gestures:</span>
            <span className="font-semibold flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAgentActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {gestureStatus}
            </span>
          </div>

          {/* Teacher Quick Launch / Controls */}
          {isTeacher && (
            <div className="flex items-center gap-2">
              {!isAgentActive && (
                <button
                  onClick={handleLaunchAgent}
                  disabled={launchingAgent}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all hover:scale-105"
                  title="Launch Python OpenCV MediaPipe desktop tracking agent"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{launchingAgent ? 'Starting...' : 'Launch Gesture Agent'}</span>
                </button>
              )}

              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 px-2.5 py-1.5 rounded-xl text-xs transition-colors"
                title="View Hand Gestures Reference Guide"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Gestures Guide</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{participantCount}</span>
          </div>

          {isTeacher && (
            <button
              onClick={handleToggleLock}
              className={`p-2 rounded-xl text-xs border transition-colors ${
                isLocked
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700'
              }`}
              title={isLocked ? 'Unlock Classroom' : 'Lock Classroom'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          {isTeacher ? (
            <button
              onClick={handleEndClass}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              End Class
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs border border-slate-700 font-medium transition-colors"
            >
              Leave
            </Link>
          )}
        </div>
      </header>

      {/* Main Classroom Layout (Left: 3D Model, Right: Video + Chat) */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left: Interactive 3D Canvas */}
        <div className="flex-1 h-full min-w-0">
          <ThreeDViewer
            modelUrl={session?.modelUrl}
            isTeacher={isTeacher}
          />
        </div>

        {/* Right Sidebar: Video Grid & Real-time Chat */}
        <div className="w-80 lg:w-96 flex flex-col gap-3 h-full shrink-0">
          {/* Top Half: Video Streams */}
          <div className="h-44 shrink-0">
            <VideoGrid sessionCode={sessionCode} isTeacher={isTeacher} />
          </div>

          {/* Bottom Half: Chat */}
          <div className="flex-1 min-h-0">
            <ChatPanel sessionCode={sessionCode} currentUserRole={user?.role} />
          </div>
        </div>
      </div>

      {/* Hand Gesture Modal Guide */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">EduGesture 3D Hand Gestures</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Control the shared 3D model in real time using the Python MediaPipe Desktop Gesture Agent.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">☝️</span>
                  <span className="font-semibold text-sm text-cyan-300">Point & Move</span>
                </div>
                <p className="text-xs text-slate-400">Extend index finger and drag in 2D space to rotate the 3D model.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🤏</span>
                  <span className="font-semibold text-sm text-indigo-300">Pinch & Spread</span>
                </div>
                <p className="text-xs text-slate-400">Bring index & thumb close to zoom in/out smoothly.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🖐</span>
                  <span className="font-semibold text-sm text-emerald-300">Open Palm</span>
                </div>
                <p className="text-xs text-slate-400">Hold open palm towards camera to select or focus on the current mesh.</p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">✊</span>
                  <span className="font-semibold text-sm text-rose-300">Closed Fist</span>
                </div>
                <p className="text-xs text-slate-400">Make a fist to instantly reset camera orientation and zoom.</p>
              </div>
            </div>

            {/* Terminal Command Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Manual Command Line
                </span>
                <span className="text-[11px] text-cyan-400">Session: {sessionCode}</span>
              </div>
              <code className="block text-xs font-mono text-emerald-400 bg-slate-900/90 p-2.5 rounded-lg select-all border border-slate-800">
                python apps/gesture-agent/src/main.py --session {sessionCode}
              </code>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleLaunchAgent();
                  setShowGuide(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Launch Gesture Agent Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

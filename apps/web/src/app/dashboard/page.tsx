'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Plus, LogOut, Play, Users, Sparkles, ArrowRight, Video } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { SessionSummary, ThreeDModelSummary, UserRole } from '@edugesture/shared-types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, initAuth, logout } = useAuthStore();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [models, setModels] = useState<ThreeDModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  // Student join state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!user) return;

    fetchApi<SessionSummary[]>('/sessions/my')
      .then((data) => setSessions(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    if (user.role === UserRole.TEACHER) {
      fetchApi<ThreeDModelSummary[]>('/models')
        .then((data) => {
          setModels(data);
          if (data.length > 0) setSelectedModelId(data[0].id);
        })
        .catch((err) => console.error(err));
    }
  }, [user]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const newSession = await fetchApi<SessionSummary>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ title, modelId: selectedModelId }),
      });

      setShowCreateModal(false);
      setTitle('');
      router.push(`/session/${newSession.code}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create session');
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoinError(null);

    try {
      await fetchApi('/sessions/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.toUpperCase().trim() }),
      });

      router.push(`/session/${joinCode.toUpperCase().trim()}`);
    } catch (err: any) {
      setJoinError(err.message || 'Invalid code or classroom ended');
    }
  };

  const isTeacher = user?.role === UserRole.TEACHER;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 sm:p-10">
      {/* Top Bar */}
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">EduGesture 3D</h1>
            <p className="text-xs text-slate-400">
              Logged in as <span className="text-indigo-400 font-semibold">{user?.name}</span> ({user?.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTeacher && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              New Classroom
            </button>
          )}

          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto mt-8">
        {/* Student Quick Join Banner */}
        {!isTeacher && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 mb-8 max-w-xl mx-auto shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Join Live 3D Classroom
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter the 6-character session code provided by your teacher
            </p>

            {joinError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinSession} className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. DEMO01"
                className="flex-1 uppercase font-mono tracking-wider bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1.5"
              >
                Join <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Sessions Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">
            {isTeacher ? 'My Hosted Classrooms' : 'Recent Joined Classrooms'}
          </h2>
          <span className="text-xs text-slate-400 font-mono">{sessions.length} sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center text-slate-500">
            <Box className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No active classrooms yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              {isTeacher
                ? 'Click "New Classroom" above to launch a 3D session with your students.'
                : 'Enter a classroom session code above to join your teacher live.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                      CODE: {s.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        s.status === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                          : s.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <h3 className="font-semibold text-white text-sm mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                    <Box className="w-3.5 h-3.5 text-cyan-400" />
                    Model: {s.modelName || 'Anatomy 3D'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {s.participantCount} attendees
                  </div>

                  <Link
                    href={`/session/${s.code}`}
                    className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  >
                    Enter <Play className="w-3 h-3 fill-current" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Teacher Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Live Classroom</h3>
            <p className="text-xs text-slate-400 mb-6">
              Select an educational 3D model to control with your gestures
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Classroom Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Human Heart & Circulatory System"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Select 3D Model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {models.length === 0 ? (
                    <option value="">Default Anatomy Model (Built-in)</option>
                  ) : (
                    models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.category})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-medium border border-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                >
                  Launch Classroom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

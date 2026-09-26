import Link from 'next/link';
import { Box, Sparkles, GraduationCap, Users, Shield, Play } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 sm:p-12 relative overflow-hidden bg-gradient-to-b from-[#090d16] via-[#0d1424] to-[#090d16]">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full max-w-6xl flex items-center justify-between z-10 glass-panel px-6 py-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
              EduGesture 3D
            </h1>
            <p className="text-[11px] text-slate-400">Live Virtual 3D Classroom</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800/60"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Portal
          </Link>
          <Link
            href="/login"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl text-center my-auto z-10 py-12 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Powered by Python, OpenCV & MediaPipe
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-white mb-6">
          Teach with <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Gestures</span> in Real-Time 3D
        </h2>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          The teacher controls educational 3D anatomy, molecules, and physics models using hand gestures detected via local OpenCV & MediaPipe. All students see the synchronized state instantly.
        </p>

        {/* Portals Cards */}
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-xl text-left">
          <Link
            href="/login"
            className="group glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Teacher & Student Portal</h3>
            <p className="text-xs text-slate-400">
              Host live classes, invite students, or join with a session code.
            </p>
          </Link>

          <Link
            href="/admin/login"
            className="group glass-panel p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all shadow-xl"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Admin Model Library</h3>
            <p className="text-xs text-slate-400">
              Upload GLB models, manage categories, versioning, and publishing.
            </p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl text-center text-xs text-slate-500 z-10 pt-6 border-t border-slate-800/80">
        EduGesture 3D © 2026 • Server Authoritative 3D Virtual Classroom Architecture
      </footer>
    </div>
  );
}

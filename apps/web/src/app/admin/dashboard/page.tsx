'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Upload, Shield, Users, Layers, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ThreeDModelSummary } from '@edugesture/shared-types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, initAuth, logout } = useAuthStore();
  const [models, setModels] = useState<ThreeDModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    fetchApi<ThreeDModelSummary[]>('/admin/models')
      .then((data) => setModels(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const publishedCount = models.filter((m) => m.status === 'PUBLISHED').length;
  const draftCount = models.filter((m) => m.status === 'DRAFT').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 sm:p-10">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Console</h1>
            <p className="text-xs text-slate-400">EduGesture 3D Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/models/upload"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-600/20"
          >
            <Upload className="w-4 h-4" />
            Upload 3D Model
          </Link>
          <button
            onClick={() => {
              logout();
              router.push('/admin/login');
            }}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Models</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white">{models.length}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Published in Library</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{publishedCount}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Drafts / In Review</span>
            <Box className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400">{draftCount}</div>
        </div>
      </div>

      {/* Models Table */}
      <div className="max-w-6xl mx-auto mt-8 glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">3D Educational Model Library</h2>
          <Link
            href="/admin/models/upload"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            Add New <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Model Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Version</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {models.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No models in library. Click &quot;Upload 3D Model&quot; to add your first asset!
                  </td>
                </tr>
              ) : (
                models.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                      <Box className="w-4 h-4 text-indigo-400" />
                      {m.name}
                    </td>
                    <td className="px-6 py-4">{m.category || 'General'}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">v{m.version}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          m.status === 'PUBLISHED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : m.status === 'DRAFT'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {m.status !== 'PUBLISHED' && (
                          <button
                            onClick={async () => {
                              await fetchApi(`/admin/models/${m.id}/publish`, { method: 'PATCH' });
                              setModels((prev) =>
                                prev.map((item) => (item.id === m.id ? { ...item, status: 'PUBLISHED' as any } : item))
                              );
                            }}
                            className="text-[11px] bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/30 transition-colors"
                          >
                            Publish
                          </button>
                        )}
                        {m.status === 'PUBLISHED' && (
                          <button
                            onClick={async () => {
                              await fetchApi(`/admin/models/${m.id}/unpublish`, { method: 'PATCH' });
                              setModels((prev) =>
                                prev.map((item) => (item.id === m.id ? { ...item, status: 'DRAFT' as any } : item))
                              );
                            }}
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition-colors"
                          >
                            Unpublish
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

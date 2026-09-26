'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, Box, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function ModelUploadPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Anatomy');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('heart, biology, organs');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFile) {
      setError('Please select a 3D model file (.glb or .gltf)');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('tags', tags);
    formData.append('model', modelFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    try {
      await fetchApi('/admin/models', {
        method: 'POST',
        body: formData,
      });

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Console
        </Link>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Upload 3D Educational Model</h1>
              <p className="text-xs text-slate-400">Add a new GLB/GLTF model to the platform</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Model Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Human Heart Anatomy"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Anatomy">Anatomy</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="Astronomy">Astronomy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="cardiology, organs"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Interactive 3D model for medical instruction..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* File Upload Inputs */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  3D Model File (.glb, .gltf) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  required
                  onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">Thumbnail Preview (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? 'Uploading Asset...' : 'Upload and Save Model'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

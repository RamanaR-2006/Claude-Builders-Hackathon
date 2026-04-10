import { useState, useRef } from 'react';
import { Upload, X, FileText, Film, Music } from 'lucide-react';
import api from '../api/axios';

const ACCEPT = '.pdf,.mp3,.wav,.ogg,.mp4,.webm,.mov';

const TYPE_META = {
  pdf: { icon: FileText, color: 'text-ruby-400', bg: 'bg-ruby-500/10' },
  mp3: { icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  wav: { icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ogg: { icon: Music, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  mp4: { icon: Film, color: 'text-gem-400', bg: 'bg-gem-500/10' },
  webm: { icon: Film, color: 'text-gem-400', bg: 'bg-gem-500/10' },
  mov: { icon: Film, color: 'text-gem-400', bg: 'bg-gem-500/10' },
};

export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const ext = file?.name?.split('.').pop().toLowerCase();
  const meta = TYPE_META[ext];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(''); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setError(''); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(0);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onUploaded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const Icon = meta?.icon || FileText;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-800 rounded-2xl shadow-2xl shadow-black/50 border border-surface-600 w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Upload Document</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="text-sm text-ruby-400 bg-ruby-500/10 border border-ruby-500/20 rounded-lg px-4 py-2.5 mb-4">{error}</div>
        )}

        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-surface-500 rounded-xl p-10 text-center cursor-pointer hover:border-gem-500/50 hover:bg-gem-500/5 transition"
          >
            <Upload size={32} className="mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-gray-400">
              Drop a file here or <span className="text-gem-400 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">PDF, MP3, WAV, MP4, WebM, MOV</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 rounded-xl p-4 border border-surface-500 ${meta?.bg || 'bg-surface-700'}`}>
              <Icon size={28} className={meta?.color || 'text-gray-400'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <button onClick={() => setFile(null)} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {uploading && (
              <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
                <div className="h-full bg-gem-500 transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-gem-600 hover:bg-gem-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 cursor-pointer"
            >
              {uploading ? `Uploading… ${progress}%` : 'Upload'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { Upload, X, FileText, Film, Music, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

const ACCEPT = '.pdf,.mp3,.wav,.ogg,.mp4,.webm,.mov';
const MAX_TOTAL_BYTES = 300 * 1024 * 1024; // 300 MB

const TYPE_META = {
  pdf: { icon: FileText, color: 'text-magma-400', bg: 'bg-magma-500/10' },
  mp3: { icon: Music, color: 'text-ember-400', bg: 'bg-ember-500/10' },
  wav: { icon: Music, color: 'text-ember-400', bg: 'bg-ember-500/10' },
  ogg: { icon: Music, color: 'text-ember-400', bg: 'bg-ember-500/10' },
  mp4: { icon: Film, color: 'text-lava-400', bg: 'bg-lava-500/10' },
  webm: { icon: Film, color: 'text-lava-400', bg: 'bg-lava-500/10' },
  mov: { icon: Film, color: 'text-lava-400', bg: 'bg-lava-500/10' },
};

function getExt(name) {
  return name?.split('.').pop().toLowerCase();
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export default function UploadModal({ onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const overCap = totalSize > MAX_TOTAL_BYTES;

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    setFiles(prev => [...prev, ...arr]);
    setError('');
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length || overCap) return;
    setUploading(true);
    setError('');

    for (let i = 0; i < files.length; i++) {
      setUploadIndex(i);
      setProgress(0);
      const form = new FormData();
      form.append('file', files[i]);
      try {
        const res = await api.post('/documents/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
          },
        });
        onUploaded(res.data);
      } catch (err) {
        setError(`Failed to upload "${files[i].name}": ${err.response?.data?.error || 'Unknown error'}`);
        setUploading(false);
        return;
      }
    }
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-800 rounded-2xl shadow-2xl shadow-black/50 border border-surface-600 w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Upload Documents</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="text-sm text-magma-400 bg-magma-500/10 border border-magma-500/20 rounded-lg px-4 py-2.5 mb-4">{error}</div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-surface-500 rounded-xl p-8 text-center cursor-pointer hover:border-lava-500/50 hover:bg-lava-500/5 transition mb-4"
        >
          <Upload size={28} className="mx-auto text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">
            Drop files here or <span className="text-lava-400 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-600 mt-1">PDF, MP3, WAV, MP4, WebM, MOV &middot; 300 MB max per upload</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={e => { if (e.target.files.length) addFiles(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {files.map((file, i) => {
              const ext = getExt(file.name);
              const meta = TYPE_META[ext];
              const Icon = meta?.icon || FileText;
              return (
                <div key={i} className={`flex items-center gap-3 rounded-lg p-3 border border-surface-500 ${meta?.bg || 'bg-surface-700'}`}>
                  <Icon size={20} className={meta?.color || 'text-gray-400'} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                  </div>
                  {!uploading && (
                    <button onClick={() => removeFile(i)} className="p-0.5 text-gray-500 hover:text-gray-300 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Over-cap warning */}
        {overCap && (
          <div className="flex items-center gap-2 text-sm text-magma-400 bg-magma-500/10 border border-magma-500/20 rounded-lg px-4 py-2.5 mb-4">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Total size ({formatSize(totalSize)}) exceeds the 300 MB limit. Remove some files.</span>
          </div>
        )}

        {/* Total size indicator */}
        {files.length > 0 && !overCap && (
          <p className="text-xs text-gray-500 mb-4">
            {files.length} file{files.length !== 1 ? 's' : ''} &middot; {formatSize(totalSize)} total
          </p>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Uploading {uploadIndex + 1} of {files.length}…</p>
            <div className="w-full h-1.5 bg-surface-600 rounded-full overflow-hidden">
              <div className="h-full bg-lava-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Upload button */}
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading || overCap}
            className="w-full bg-lava-600 hover:bg-lava-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {uploading ? `Uploading… ${progress}%` : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  );
}

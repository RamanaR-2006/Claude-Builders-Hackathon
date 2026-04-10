import { X, Download, FileText, Music } from 'lucide-react';

export default function DocumentViewer({ doc, onClose }) {
  const fileUrl = `/api/documents/${doc.id}/file`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-800 rounded-2xl shadow-2xl shadow-black/50 border border-surface-600 w-full max-w-3xl max-h-[85vh] mx-4 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-600 shrink-0">
          <h2 className="text-sm font-semibold text-white truncate mr-4">{doc.original_name}</h2>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={doc.original_name}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gem-400 hover:bg-surface-600 transition cursor-pointer"
              title="Download"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-600 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0">
          {doc.file_type === 'pdf' && (
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[70vh]"
              title={doc.original_name}
            />
          )}

          {doc.file_type === 'video' && (
            <div className="flex items-center justify-center p-6 bg-black">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-[70vh] rounded"
              >
                Your browser does not support the video element.
              </video>
            </div>
          )}

          {doc.file_type === 'audio' && (
            <div className="flex flex-col items-center justify-center p-12 gap-6">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Music size={40} className="text-emerald-400" />
              </div>
              <p className="text-sm text-gray-400">{doc.original_name}</p>
              <audio src={fileUrl} controls autoPlay className="w-full max-w-md">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {!['pdf', 'video', 'audio'].includes(doc.file_type) && (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
              <FileText size={48} className="text-gray-500" />
              <p className="text-sm text-gray-400">Preview not available for this file type.</p>
              <a
                href={fileUrl}
                download={doc.original_name}
                className="text-sm text-gem-400 hover:text-gem-400/80 font-medium"
              >
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function FeedbackModal({ onClose, onToast }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [liked, setLiked] = useState('');
  const [improved, setImproved] = useState('');
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      onToast?.('Please select a rating', 'error');
      return;
    }

    const body = [
      `Rating: ${rating}/5`,
      '---',
      'What did you like most?',
      liked.trim() || '(no response)',
      '---',
      'What could be improved?',
      improved.trim() || '(no response)',
      '---',
      'Additional comments:',
      comments.trim() || '(no response)',
    ].join('\n');

    const subject = `Lattice Feedback from ${user?.email || 'a user'}`;
    const mailto = `mailto:ramanar2@illinois.edu,mais.krishvardhan@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
    onToast?.('Email client opened -- please send to submit your feedback', 'success');
    onClose();
  };

  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600 shrink-0">
          <h2 className="text-base font-semibold text-white">Feedback Survey</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <p className="text-xs text-gray-500">We'd love to hear about your experience with Lattice. Your feedback helps us improve!</p>

          {/* Star rating */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Overall Rating *</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${
                      n <= activeRating
                        ? 'text-lava-400 fill-lava-400'
                        : 'text-surface-500'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Liked */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">What did you like most?</label>
            <textarea
              value={liked}
              onChange={e => setLiked(e.target.value)}
              rows={3}
              placeholder="Tell us what worked well…"
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-none"
            />
          </div>

          {/* Improved */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">What could be improved?</label>
            <textarea
              value={improved}
              onChange={e => setImproved(e.target.value)}
              rows={3}
              placeholder="Any pain points or suggestions…"
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-none"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Any other comments?</label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              placeholder="Anything else you'd like to share…"
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-700 border border-surface-500 text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-lg bg-lava-600 hover:bg-lava-500 text-white text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}

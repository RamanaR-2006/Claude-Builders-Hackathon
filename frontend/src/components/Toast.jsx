import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const ICONS = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const COLORS = {
  error: 'border-magma-500/30 bg-magma-500/10 text-magma-400',
  success: 'border-ember-500/30 bg-ember-500/10 text-ember-400',
  info: 'border-lava-500/30 bg-lava-500/10 text-lava-400',
};

export default function Toast({ message, type = 'error', onDismiss, duration = 4000 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onDismiss, 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const Icon = ICONS[type] || Info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-lg shadow-black/30 ${COLORS[type]} ${leaving ? 'animate-toast-out' : 'animate-toast-in'}`}>
      <Icon size={16} className="shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={() => { setLeaving(true); setTimeout(onDismiss, 250); }} className="p-0.5 hover:opacity-70 cursor-pointer">
        <X size={14} />
      </button>
    </div>
  );
}

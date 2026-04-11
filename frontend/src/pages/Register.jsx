import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check, X } from 'lucide-react';

function PasswordRule({ met, label }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${met ? 'text-ember-400' : 'text-gray-500'}`}>
      {met ? <Check size={12} /> : <X size={12} />}
      {label}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const rules = useMemo(() => ({
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const allMet = rules.length && rules.letter && rules.number && rules.symbol;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allMet) {
      setError('Password does not meet all requirements');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lattice</h1>
          <p className="mt-1 text-sm text-gray-400">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-2xl border border-surface-600 p-8 space-y-5 shadow-lg shadow-black/30">
          {error && (
            <div className="text-sm text-magma-400 bg-magma-500/10 border border-magma-500/20 rounded-lg px-4 py-2.5">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-lava-500 focus:ring-2 focus:ring-lava-500/20 transition"
              placeholder="••••••••"
            />
            {password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                <PasswordRule met={rules.length} label="8+ characters" />
                <PasswordRule met={rules.letter} label="A letter" />
                <PasswordRule met={rules.number} label="A number" />
                <PasswordRule met={rules.symbol} label="A symbol" />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className={`w-full rounded-lg border bg-surface-700 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:ring-2 transition ${
                confirm && confirm !== password
                  ? 'border-magma-500 focus:border-magma-500 focus:ring-magma-500/20'
                  : 'border-surface-500 focus:border-lava-500 focus:ring-lava-500/20'
              }`}
              placeholder="••••••••"
            />
            {confirm && confirm !== password && (
              <p className="text-xs text-magma-400 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allMet}
            className="w-full bg-lava-600 hover:bg-lava-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-lava-400 hover:text-lava-400/80 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

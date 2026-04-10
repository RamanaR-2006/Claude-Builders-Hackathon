import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Lattice</h1>
          <p className="mt-1 text-sm text-gray-400">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-800 rounded-2xl border border-surface-600 p-8 space-y-5 shadow-lg shadow-black/30">
          {error && (
            <div className="text-sm text-ruby-400 bg-ruby-500/10 border border-ruby-500/20 rounded-lg px-4 py-2.5">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gem-500 focus:ring-2 focus:ring-gem-500/20 transition"
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
              className="w-full rounded-lg border border-surface-500 bg-surface-700 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gem-500 focus:ring-2 focus:ring-gem-500/20 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gem-600 hover:bg-gem-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-gem-400 hover:text-gem-400/80 font-medium">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

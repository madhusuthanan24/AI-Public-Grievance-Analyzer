import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('All fields are required');
    }

    try {
      setLoading(true);
      const user = await login(email, password);
      // Route based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'officer') {
        navigate('/officer/dashboard');
      } else {
        navigate('/complaints');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 font-sans">Grievance Portal</h2>
          <p className="mt-2 text-sm text-slate-500 font-light">
            Sign in to submit, resolve, or manage tickets
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-655 mb-1">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full rounded-lg border border-slate-350 px-3 py-2 text-slate-900 placeholder-slate-400 focus:z-10 focus:border-violet-500 focus:outline-none focus:ring-violet-500 sm:text-sm"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-655 mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-lg border border-slate-350 px-3 py-2 text-slate-900 placeholder-slate-400 focus:z-10 focus:border-violet-500 focus:outline-none focus:ring-violet-500 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-violet-650 hover:bg-violet-700 active:bg-violet-850 px-4 py-3 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm font-light text-slate-500 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-violet-600 hover:text-violet-500">
            Sign up as citizen
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium text-center mb-2">Quick Demo Credentials:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setEmail('admin@grievance.gov'); setPassword('Admin@123456'); }}
              className="px-2 py-1.5 text-xs font-medium rounded border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 text-slate-700 transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail('road.officer@grievance.gov'); setPassword('Officer@123'); }}
              className="px-2 py-1.5 text-xs font-medium rounded border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 transition"
            >
              Officer
            </button>
            <button
              type="button"
              onClick={() => { setEmail('citizen@temp.com'); setPassword('Citizen@123'); }}
              className="px-2 py-1.5 text-xs font-medium rounded border border-slate-200 bg-slate-50 hover:bg-green-50 hover:text-green-700 text-slate-700 transition"
            >
              Citizen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

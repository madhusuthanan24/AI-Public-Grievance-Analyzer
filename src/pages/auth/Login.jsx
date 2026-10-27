import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      return setError('Please enter both email and password.');
    }

    try {
      setLoading(true);
      const user = await login(email, password);

      const destination = location.state?.from?.pathname;
      if (destination && !destination.startsWith('/login') && !destination.startsWith('/register')) {
        navigate(destination, { replace: true });
        return;
      }

      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'officer') {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (!err.response || err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('Unable to connect to the server. Please check your network connection or try again shortly.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xs border border-slate-200/80">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 mb-3">
              <LogIn className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-xs text-slate-500 font-light">
              Access the grievance tracking and review portal
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-100 mb-6">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2" size="md">
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have a citizen account?{' '}
            <Link to="/register" className="font-semibold text-violet-600 hover:text-violet-700">
              Create an account
            </Link>
          </div>

          {/* Quick Demo Credentials for Viva / Evaluation */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider text-center mb-2.5">
              Quick Demo Logins (Viva Evaluation)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@grievance.gov');
                  setPassword('Admin@123456');
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:text-violet-700 text-slate-700 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('road.officer@grievance.gov');
                  setPassword('Officer@123');
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 text-slate-700 transition-colors"
              >
                Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('citizen@temp.com');
                  setPassword('Citizen@123');
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors"
              >
                Citizen
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BrainCircuit, Lock, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-slate-900 p-4">
      <div className="max-w-md w-full p-8 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-600 rounded-2xl text-white shadow-xl shadow-brand-500/40">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome to EngageAI</h2>
          <p className="text-sm text-gray-400">Customer Feedback Intelligence Platform</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-300 uppercase">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 absolute left-3 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full py-3">
            Sign In to Platform <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-white/10 space-y-2">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Create an Account
            </Link>
          </p>
          <div>
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Back to Landing Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

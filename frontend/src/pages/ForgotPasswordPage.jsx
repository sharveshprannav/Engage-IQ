import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { BrainCircuit, Lock, Mail, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/auth/forgot-password', {
        email,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Password reset failed';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-slate-900 p-4">
      <div className="max-w-md w-full p-8 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-brand-600 rounded-2xl text-white shadow-xl shadow-brand-500/40">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Your Password</h2>
          <p className="text-sm text-gray-400">
            Enter your registered email and choose a new secure password
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-5 text-center py-4">
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
              <h3 className="font-bold text-base text-white">Password Updated!</h3>
              <p className="text-xs text-emerald-200">
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => navigate('/login')}
              className="w-full py-3"
            >
              Back to Sign In <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Account Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@engageai.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full py-3">
              Reset Password <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center text-xs text-gray-400 hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

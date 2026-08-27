import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/authStore';
import {
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  Globe,
  FileText,
  CheckCircle2,
  Sparkles,
  Save,
  LogOut
} from 'lucide-react';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Editable Profile fields state
  const [name, setName] = useState(user?.full_name || 'Admin User');
  const [email] = useState(user?.email || 'admin@engageai.io');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '+91 98765 43210');
  const [jobTitle, setJobTitle] = useState('Product Lead & Customer Intelligence');
  const [department, setDepartment] = useState('Customer Experience & Triage');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [necessaryDetails, setNecessaryDetails] = useState(
    'Primary point of contact for customer feedback triage, ML model evaluations, and executive sentiment reporting.'
  );

  // Load any previously saved profile from localStorage
  useEffect(() => {
    const cachedProfile = localStorage.getItem('engageai_user_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        if (parsed.name) setName(parsed.name);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.necessaryDetails) setNecessaryDetails(parsed.necessaryDetails);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const profileData = {
      name,
      email,
      phoneNumber,
      jobTitle,
      department,
      timezone,
      necessaryDetails,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem('engageai_user_profile', JSON.stringify(profileData));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-600 rounded-2xl text-white shadow-lg shadow-brand-500/30">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Profile
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your personal identification, Indian contact details, and workspace preferences
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-full flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Profile Active
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {saved && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center space-x-2 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Profile details updated and saved successfully!</span>
          </div>
        )}

        {/* Profile Form Card */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-sm space-y-6">
            {/* User Avatar & Header Summary */}
            <div className="flex items-center space-x-4 border-b border-gray-200 dark:border-dark-border pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-brand-500/25">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                  {jobTitle}
                </span>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-brand-500" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>

              {/* Field 2: Email Address (NOT CHANGEABLE / READ-ONLY) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-500" />
                    <span>Email Address</span>
                  </label>
                  <span className="text-[10px] text-amber-500 font-semibold flex items-center">
                    Locked (Read-Only)
                  </span>
                </div>
                <input
                  type="email"
                  disabled
                  value={email}
                  readOnly
                  title="Email ID cannot be changed"
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-hover/40 border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed select-none outline-none font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Email is permanently linked to your account</p>
              </div>

              {/* Field 3: Phone Number in Indian Format */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-500" />
                  <span>Phone Number (India Format)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  pattern="(\+91[\-\s]?)?[6789]\d{9}"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">Sample: +91 98765 43210</p>
              </div>

              {/* Field 4: Job Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-brand-500" />
                  <span>Job Title / Role</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Manager"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>

              {/* Field 5: Department */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-brand-500" />
                  <span>Department / Organization</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Customer Success"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                />
              </div>

              {/* Field 6: Timezone */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-brand-500" />
                  <span>Preferred Timezone</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                >
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                  <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  <option value="Asia/Tokyo (JST)">Asia/Tokyo (JST)</option>
                </select>
              </div>
            </div>

            {/* Field 7: Necessary Details & Notes */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span>Necessary Details & Workspace Notes</span>
              </label>
              <textarea
                rows={3}
                value={necessaryDetails}
                onChange={(e) => setNecessaryDetails(e.target.value)}
                placeholder="Add necessary profile notes, notification preferences, or team responsibilities..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-dark-hover border border-gray-200 dark:border-dark-border rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Save Button & Actions */}
            <div className="pt-4 border-t border-gray-200 dark:border-dark-border flex justify-end">
              <Button type="submit" variant="primary" className="px-6 py-3">
                <Save className="w-4 h-4 mr-2" /> Save Profile Details
              </Button>
            </div>
          </div>
        </form>

        {/* ── LOG OUT SECTION AT BOTTOM OF SETTINGS ────────────────────────── */}
        <div className="p-6 bg-red-500/5 dark:bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-500/15 text-red-600 dark:text-red-400 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account Session & Logout</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                End your active authenticated session on this browser
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 px-5 py-2.5 font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" /> Log Out of EngageAI
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}



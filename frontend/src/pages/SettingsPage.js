/**
 * SkillForge AI - Settings Page
 * User preferences and account settings
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiClock, HiGlobe, HiShieldCheck,
  HiTrash, HiLogout, HiExclamation, HiCheck
} from 'react-icons/hi';
import useAuthStore from '../store/authStore';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updatePreferences, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('security');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);


  useEffect(() => {
  }, [user]);


  const handleChangePassword = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      await userAPI.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully!');
      e.target.reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      toast.success('Account deleted');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleExportData = async () => {
    try {
      setSaving(true);
      const response = await userAPI.exportData();
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'learnsphere-user-data.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: HiShieldCheck }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-48 flex lg:flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Change Password */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
                {user?.authProvider === 'local' ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        required
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        minLength={6}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        minLength={6}
                        className="input"
                      />
                    </div>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                ) : (
                  <p className="text-muted-foreground">
                    You signed in with {user?.authProvider}. Password management is handled by your provider.
                  </p>
                )}
              </div>

              {/* Connected Accounts */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Connected Accounts</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <HiGlobe className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Google</p>
                        <p className="text-muted-foreground text-sm">
                          {user?.authProvider === 'google' ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {user?.authProvider === 'google' && (
                      <span className="badge badge-accent">Primary</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <HiGlobe className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">GitHub</p>
                        <p className="text-muted-foreground text-sm">
                          {user?.authProvider === 'github' ? 'Connected' : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {user?.authProvider === 'github' && (
                      <span className="badge badge-accent">Primary</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Export */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Data Export</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Download a copy of your account data.
                </p>
                <button onClick={handleExportData} disabled={saving} className="btn-secondary">
                  {saving ? 'Preparing...' : 'Export My Data'}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="card p-6 border-2 border-red-500/30">
                <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <HiExclamation className="w-5 h-5" />
                  Danger Zone
                </h2>
                <p className="text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <HiTrash className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold text-foreground mb-4">Delete Account?</h3>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone. All your data, progress, and achievements will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn bg-destructive hover:bg-destructive/90 text-destructive-foreground flex-1"
              >
                Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Toggle Component
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
}

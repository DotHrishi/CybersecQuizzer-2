'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, Key, Lock, Plus, Trash2, Edit3,
  CheckCircle2, XCircle, Search, RefreshCw, Eye, EyeOff,
  UserCheck, UserX, Copy, Check, LogOut, ArrowRight,
  Sparkles, Users, Activity, AlertTriangle, X, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminAccount {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'cybersec_superadmin_token';

/* ─── Password generator helper ──────────────────────────── */
function generateStrongPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function SuperAdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  /* Admins data */
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  /* Modals */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [copiedNewCreds, setCopiedNewCreds] = useState(false);

  /* Password Reset Modal */
  const [resetModalAdmin, setResetModalAdmin] = useState<AdminAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  /* Delete Confirmation Modal */
  const [deleteModalAdmin, setDeleteModalAdmin] = useState<AdminAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── Check stored session on mount ── */
  useEffect(() => {
    const savedToken = sessionStorage.getItem(STORAGE_KEY);
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
    setAuthLoading(false);
  }, []);

  /* ── Fetch Admins List ── */
  const fetchAdmins = useCallback(async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/superadmin/admins', {
        headers: {
          'x-superadmin-token': activeToken,
        },
      });

      if (res.status === 401) {
        toast.error('Super Admin session expired. Please log in again.');
        sessionStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setIsAuthenticated(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins || []);
      } else {
        toast.error(data.message || 'Failed to load admin accounts.');
      }
    } catch {
      toast.error('Network error loading admin accounts.');
    } finally {
      setLoadingAdmins(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAdmins(token);
    }
  }, [isAuthenticated, token, fetchAdmins]);

  /* ── Login Handler ── */
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) {
      toast.error('Please enter the Super Admin master key.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        toast.success('Super Admin authenticated!');
        sessionStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        setMasterPassword('');
        fetchAdmins(data.token);
      } else {
        toast.error(data.message || 'Invalid Super Admin key.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ── Logout Handler ── */
  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setIsAuthenticated(false);
    toast.success('Super Admin logged out.');
  };

  /* ── Create Admin Handler ── */
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error('Admin email is required.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsSavingAdmin(true);
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined,
          password: newPassword,
          active: newActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Admin account created for ${newEmail}!`);
        setAddModalOpen(false);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewActive(true);
        fetchAdmins();
      } else {
        toast.error(data.message || 'Failed to create admin.');
      }
    } catch {
      toast.error('Failed to create admin.');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  /* ── Toggle Admin Active Status ── */
  const handleToggleActive = async (admin: AdminAccount) => {
    const updatedStatus = !admin.active;
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          id: admin.id,
          active: updatedStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Admin ${admin.email} is now ${updatedStatus ? 'active' : 'disabled'}.`);
        setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, active: updatedStatus } : a));
      } else {
        toast.error(data.message || 'Failed to update admin status.');
      }
    } catch {
      toast.error('Failed to toggle admin status.');
    }
  };

  /* ── Reset Admin Password ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalAdmin) return;
    if (!resetPassword.trim() || resetPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          id: resetModalAdmin.id,
          password: resetPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Password reset for ${resetModalAdmin.email}!`);
        setResetModalAdmin(null);
        setResetPassword('');
      } else {
        toast.error(data.message || 'Failed to reset password.');
      }
    } catch {
      toast.error('Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  /* ── Confirm Delete Admin ── */
  const handleDeleteAdmin = async () => {
    if (!deleteModalAdmin) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/admins?id=${deleteModalAdmin.id}`, {
        method: 'DELETE',
        headers: {
          'x-superadmin-token': token || '',
        },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Admin ${deleteModalAdmin.email} deleted.`);
        setAdmins(prev => prev.filter(a => a.id !== deleteModalAdmin.id));
        setDeleteModalAdmin(null);
      } else {
        toast.error(data.message || 'Failed to delete admin.');
      }
    } catch {
      toast.error('Failed to delete admin.');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Filtered Admins ── */
  const filteredAdmins = admins.filter(a => {
    const matchesSearch =
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'active' && !a.active) return false;
    if (statusFilter === 'disabled' && a.active) return false;
    return true;
  });

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.active).length;
  const disabledAdmins = totalAdmins - activeAdmins;

  /* ── 1. Loading state ── */
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700 dark:text-slate-300" />
        <p className="text-xs text-slate-500 font-medium">Verifying super admin security token...</p>
      </div>
    );
  }

  /* ── 2. Login Screen ── */
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-14 px-4">
        <div className="card p-8 border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 text-center space-y-6 relative overflow-hidden">
          {/* Subtle glowing accent */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Superadmin Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
            <Key className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
              <ShieldAlert className="w-3 h-3" />
              Direct Access Portal
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Super Admin Gateway
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Enter master key to manage administrator credentials and question bank access.
            </p>
          </div>

          <form onSubmit={handleSuperAdminLogin} className="space-y-4 text-left">
            <div>
              <label className="field-label flex items-center justify-between">
                <span>Super Admin Master Key</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showMasterPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={e => setMasterPassword(e.target.value)}
                  placeholder="Enter master key password..."
                  autoFocus
                  className="field-input pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !masterPassword.trim()}
              className="btn btn-primary btn-md w-full justify-center gap-2 mt-2 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Master Key...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authenticate Super Admin
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
            This route is private. Master key is managed via system configuration.
          </div>
        </div>
      </div>
    );
  }

  /* ── 3. Authenticated Super Admin Dashboard ── */
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              SUPER ADMIN CONSOLE
            </span>
            <span className="text-xs text-slate-400">/superadmin</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Admin Credential Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Provision email and password accounts for administrators who manage questions and access reports at <span className="font-semibold text-slate-700 dark:text-slate-300">/admin</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setNewEmail('');
              setNewName('');
              setNewPassword(generateStrongPassword());
              setNewActive(true);
              setCopiedNewCreds(false);
              setAddModalOpen(true);
            }}
            className="btn btn-primary btn-md gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Admin</span>
          </button>

          <button
            onClick={handleLogout}
            title="Log out of Super Admin"
            className="btn btn-secondary btn-md gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Admins</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAdmins}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Provisioned in database</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between border-emerald-200/60 dark:border-emerald-900/40">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Admins</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeAdmins}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Can login to /admin</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disabled Admins</p>
            <p className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1">{disabledAdmins}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Access temporarily revoked</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <UserX className="w-6 h-6 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Admin List Table Card */}
      <div className="card overflow-hidden">
        {/* Table Header & Search Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Authorized Admin Accounts</h2>
            <span className="text-xs text-slate-400">({filteredAdmins.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search email or name..."
                className="field-input pl-8 py-1.5 text-xs w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Pill */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="field-input py-1.5 px-2 text-xs w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAdmins()}
              disabled={loadingAdmins}
              title="Refresh list"
              className="btn btn-secondary btn-sm px-2.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAdmins ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Admin Username / Email</th>
                <th className="table-th">Name / Label</th>

                <th className="table-th text-center">Status</th>
                <th className="table-th">Created Date</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingAdmins && admins.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
                    <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-44" /></td>
                    <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28" /></td>
                    <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 mx-auto" /></td>
                    <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" /></td>
                    <td className="table-td text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {searchTerm ? 'No admins matching filter.' : 'No admin credentials registered yet.'}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Click &quot;Add New Admin&quot; to provision email and password credentials for your quiz questions administrators.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map(admin => (
                  <tr key={admin.id} className="table-row">
                    <td className="table-td font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                          {admin.email.charAt(0).toUpperCase()}
                        </span>
                        <span>{admin.email}</span>
                      </div>
                    </td>

                    <td className="table-td text-slate-600 dark:text-slate-400">
                      {admin.name || <span className="text-slate-400 italic">Not set</span>}
                    </td>

                    <td className="table-td text-center">
                      <button
                        onClick={() => handleToggleActive(admin)}
                        title={`Click to ${admin.active ? 'disable' : 'activate'} this admin`}
                        className={`badge cursor-pointer transition-all hover:scale-105 ${
                          admin.active ? 'badge-green' : 'badge-red'
                        }`}
                      >
                        {admin.active ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Disabled
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="table-td text-xs text-slate-500">
                      {new Date(admin.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="table-td text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setResetModalAdmin(admin);
                            setResetPassword(generateStrongPassword());
                            setShowResetPassword(true);
                          }}
                          title="Reset Password"
                          className="btn-icon text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteModalAdmin(admin)}
                          title="Delete Admin Account"
                          className="btn-icon text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructional Card */}
      <div className="card p-5 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Security & Administration Guidelines</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500">
          <li>Admins can access the Question Bank, Reports, Analytics, and Student Leaderboards by visiting <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">/admin</code>.</li>
          <li>Super Admin access is granted only by typing <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">/superadmin</code> directly in the browser address bar.</li>
          <li>Disabling an admin takes effect immediately, preventing their active sessions from making further changes.</li>
        </ul>
      </div>

      {/* ── Modal: Add New Admin ── */}
      {addModalOpen && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setAddModalOpen(false); }}
        >
          <div className="modal-panel max-w-[500px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Key className="w-4 h-4 text-slate-800 dark:text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Admin Account</h3>
                  <p className="text-[11px] text-slate-500">Provision credentials for quiz question management</p>
                </div>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="field-label">Admin Username / Email <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. admin or admin@school.edu"
                  className="field-input"
                  required
                  autoFocus
                />
              </div>


              <div>
                <label className="field-label">Name / Label (Optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Cyber Safety Coordinator - Alex"
                  className="field-input"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label mb-0">Password <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateStrongPassword();
                      setNewPassword(gen);
                      setShowNewPassword(true);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Strong
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter or generate password..."
                    className="field-input pr-10 font-mono text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                      {newEmail || 'admin@...'} : {newPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`Email: ${newEmail || 'N/A'}\nPassword: ${newPassword}`);
                        setCopiedNewCreds(true);
                        toast.success('Credentials copied to clipboard!');
                        setTimeout(() => setCopiedNewCreds(false), 2500);
                      }}
                      className="btn btn-secondary btn-xs gap-1"
                    >
                      {copiedNewCreds ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedNewCreds ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newActive}
                    onChange={e => setNewActive(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 dark:text-slate-100 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Account Active immediately
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdmin || !newEmail.trim() || !newPassword.trim()}
                    className="btn btn-primary btn-sm gap-1.5"
                  >
                    {isSavingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Admin</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ── */}
      {resetModalAdmin && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setResetModalAdmin(null); }}
        >
          <div className="modal-panel max-w-[440px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Reset Admin Password
              </h3>
              <button onClick={() => setResetModalAdmin(null)} className="btn-icon">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Admin Account</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{resetModalAdmin.email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label mb-0">New Password <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateStrongPassword();
                      setResetPassword(gen);
                      setShowResetPassword(true);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Strong
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="field-input pr-10 font-mono text-xs"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetModalAdmin(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetPassword.trim()}
                  className="btn btn-primary btn-sm gap-1.5"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Delete ── */}
      {deleteModalAdmin && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setDeleteModalAdmin(null); }}
        >
          <div className="modal-panel max-w-[420px]">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Admin Account?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to permanently delete admin <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteModalAdmin.email}</span>?
                  They will lose all access to question bank and reporting tools.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalAdmin(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAdmin}
                  disabled={isDeleting}
                  className="btn btn-destructive btn-sm gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

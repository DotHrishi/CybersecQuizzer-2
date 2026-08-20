'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, ShieldCheck, Key, Lock, Plus, Trash2,
  CheckCircle2, XCircle, Search, RefreshCw, Eye, EyeOff,
  UserCheck, UserX, Copy, Check, LogOut, ArrowLeft,
  Sparkles, Users, AlertTriangle, X, Loader2, Sun, Moon,
  User, Building2, Edit3, School, GraduationCap, KeyRound, Layers,
  ExternalLink, ChevronRight, Tag
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import toast from 'react-hot-toast';

interface CollegeDepartmentSummary {
  id: number;
  departmentName: string;
  registrationKey: string;
}

interface CollegeItem {
  id: number;
  name: string;
  identifier: string;
  createdAt: string;
  updatedAt: string;
  departments?: CollegeDepartmentSummary[];
  departmentCount?: number;
  studentCount?: number;
  adminCount?: number;
  _count?: {
    admins: number;
    students: number;
    departments?: number;
  };
}

interface DepartmentItem {
  id: number;
  collegeId: number;
  departmentName: string;
  registrationKey: string;
  createdAt: string;
  updatedAt: string;
  college?: {
    id: number;
    name: string;
    identifier: string;
  };
  _count?: {
    admins: number;
    students: number;
  };
}

interface AdminAccount {
  id: number;
  email: string;
  name: string | null;
  collegeId: number | null;
  collegeDepartmentId: number | null;
  collegeDepartment?: {
    id: number;
    departmentName: string;
    registrationKey: string;
  } | null;
  college?: {
    id: number;
    name: string;
    identifier: string;
  } | null;
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
  const { theme, toggle } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  /* Active view tab */
  const [activeTab, setActiveTab] = useState<'colleges' | 'departments' | 'admins'>('colleges');

  /* Colleges data */
  const [colleges, setColleges] = useState<CollegeItem[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState('');

  /* College Modals */
  const [addCollegeModalOpen, setAddCollegeModalOpen] = useState(false);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeIdentifier, setNewCollegeIdentifier] = useState('');
  const [newInitialDeptName, setNewInitialDeptName] = useState('');
  const [newInitialRegKey, setNewInitialRegKey] = useState('');
  const [isSavingCollege, setIsSavingCollege] = useState(false);

  const [editCollegeModal, setEditCollegeModal] = useState<CollegeItem | null>(null);
  const [editCollegeName, setEditCollegeName] = useState('');
  const [editCollegeIdentifier, setEditCollegeIdentifier] = useState('');
  const [isUpdatingCollege, setIsUpdatingCollege] = useState(false);

  const [deleteCollegeModal, setDeleteCollegeModal] = useState<CollegeItem | null>(null);
  const [isDeletingCollege, setIsDeletingCollege] = useState(false);

  /* Departments data */
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [deptCollegeFilter, setDeptCollegeFilter] = useState<string>('all');

  /* Department Modals */
  const [addDepartmentModalOpen, setAddDepartmentModalOpen] = useState(false);
  const [newDeptCollegeId, setNewDeptCollegeId] = useState<number | ''>('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptRegKey, setNewDeptRegKey] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  const [editDeptModal, setEditDeptModal] = useState<DepartmentItem | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptRegKey, setEditDeptRegKey] = useState('');
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);

  const [deleteDeptModal, setDeleteDeptModal] = useState<DepartmentItem | null>(null);
  const [isDeletingDept, setIsDeletingDept] = useState(false);

  /* Admins data */
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [collegeFilter, setCollegeFilter] = useState<string>('all');

  /* Admin Modals */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminCollegeId, setNewAdminCollegeId] = useState<number | ''>('');
  const [newAdminDeptId, setNewAdminDeptId] = useState<number | ''>('');
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

  /* ── Fetch Colleges List ── */
  const fetchColleges = useCallback(async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingColleges(true);
    try {
      const res = await fetch('/api/superadmin/colleges', {
        headers: { 'x-superadmin-token': activeToken },
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
        setColleges(data.colleges || []);
      } else {
        toast.error(data.message || 'Failed to load colleges.');
      }
    } catch {
      toast.error('Network error loading colleges.');
    } finally {
      setLoadingColleges(false);
    }
  }, [token]);

  /* ── Fetch Departments List ── */
  const fetchDepartments = useCallback(async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingDepartments(true);
    try {
      const res = await fetch('/api/superadmin/departments', {
        headers: { 'x-superadmin-token': activeToken },
      });

      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments || []);
      } else {
        toast.error(data.message || 'Failed to load departments.');
      }
    } catch {
      toast.error('Network error loading departments.');
    } finally {
      setLoadingDepartments(false);
    }
  }, [token]);

  /* ── Fetch Admins List ── */
  const fetchAdmins = useCallback(async (authToken?: string) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingAdmins(true);
    try {
      const res = await fetch('/api/superadmin/admins', {
        headers: { 'x-superadmin-token': activeToken },
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
      fetchColleges(token);
      fetchDepartments(token);
      fetchAdmins(token);
    }
  }, [isAuthenticated, token, fetchColleges, fetchDepartments, fetchAdmins]);

  /* ── Super Admin Login ── */
  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) return;

    setLoginLoading(true);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        sessionStorage.setItem(STORAGE_KEY, data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        setMasterPassword('');
        toast.success('Super Admin authenticated successfully.');
        fetchColleges(data.token);
        fetchDepartments(data.token);
        fetchAdmins(data.token);
      } else {
        toast.error(data.message || 'Invalid Master Password.');
      }
    } catch {
      toast.error('Authentication failed due to network error.');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setIsAuthenticated(false);
    toast.success('Super Admin logged out.');
  };

  /* ── Create College ── */
  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim() || !newCollegeIdentifier.trim()) {
      toast.error('Both Official Name and Identifier Code are required.');
      return;
    }

    setIsSavingCollege(true);
    try {
      const res = await fetch('/api/superadmin/colleges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          name: newCollegeName.trim(),
          identifier: newCollegeIdentifier.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const createdCollege = data.college;
        toast.success(`College "${createdCollege.name}" created successfully!`);

        // If optional initial department & registration key provided, create it immediately
        if (newInitialDeptName.trim() && newInitialRegKey.trim()) {
          try {
            const deptRes = await fetch('/api/superadmin/departments', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-superadmin-token': token || '',
              },
              body: JSON.stringify({
                collegeId: createdCollege.id,
                departmentName: newInitialDeptName.trim(),
                registrationKey: newInitialRegKey.trim(),
              }),
            });
            const deptData = await deptRes.json();
            if (deptData.success) {
              toast.success(`Initial department "${newInitialDeptName}" & key "${newInitialRegKey}" created!`);
            } else {
              toast.error(deptData.message || 'Could not create initial department.');
            }
          } catch {
            toast.error('Failed to create initial department key.');
          }
        }

        setAddCollegeModalOpen(false);
        setNewCollegeName('');
        setNewCollegeIdentifier('');
        setNewInitialDeptName('');
        setNewInitialRegKey('');
        fetchColleges();
        fetchDepartments();
      } else {
        toast.error(data.message || 'Failed to create college.');
      }
    } catch {
      toast.error('Network error creating college.');
    } finally {
      setIsSavingCollege(false);
    }
  };

  /* ── Update College ── */
  const handleUpdateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCollegeModal) return;

    setIsUpdatingCollege(true);
    try {
      const res = await fetch('/api/superadmin/colleges', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          id: editCollegeModal.id,
          name: editCollegeName.trim(),
          identifier: editCollegeIdentifier.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('College updated successfully!');
        setEditCollegeModal(null);
        fetchColleges();
        fetchDepartments();
      } else {
        toast.error(data.message || 'Failed to update college.');
      }
    } catch {
      toast.error('Network error updating college.');
    } finally {
      setIsUpdatingCollege(false);
    }
  };

  /* ── Delete College ── */
  const handleDeleteCollege = async () => {
    if (!deleteCollegeModal) return;

    setIsDeletingCollege(true);
    try {
      const res = await fetch(`/api/superadmin/colleges?id=${deleteCollegeModal.id}`, {
        method: 'DELETE',
        headers: { 'x-superadmin-token': token || '' },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`College "${deleteCollegeModal.name}" deleted.`);
        setDeleteCollegeModal(null);
        fetchColleges();
        fetchDepartments();
      } else {
        toast.error(data.message || 'Failed to delete college.');
      }
    } catch {
      toast.error('Network error deleting college.');
    } finally {
      setIsDeletingCollege(false);
    }
  };

  /* ── Create Department ── */
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCollegeId || !newDeptName.trim() || !newDeptRegKey.trim()) {
      toast.error('College, Department Name, and Registration Key are required.');
      return;
    }

    setIsSavingDept(true);
    try {
      const res = await fetch('/api/superadmin/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          collegeId: Number(newDeptCollegeId),
          departmentName: newDeptName.trim(),
          registrationKey: newDeptRegKey.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Department "${data.department.departmentName}" created with key "${data.department.registrationKey}"!`);
        setAddDepartmentModalOpen(false);
        setNewDeptName('');
        setNewDeptRegKey('');
        fetchDepartments();
        fetchColleges();
      } else {
        toast.error(data.message || 'Failed to create department.');
      }
    } catch {
      toast.error('Network error creating department.');
    } finally {
      setIsSavingDept(false);
    }
  };

  /* ── Update Department ── */
  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeptModal) return;

    setIsUpdatingDept(true);
    try {
      const res = await fetch('/api/superadmin/departments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token || '',
        },
        body: JSON.stringify({
          id: editDeptModal.id,
          departmentName: editDeptName.trim(),
          registrationKey: editDeptRegKey.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Department updated successfully!');
        setEditDeptModal(null);
        fetchDepartments();
        fetchColleges();
      } else {
        toast.error(data.message || 'Failed to update department.');
      }
    } catch {
      toast.error('Network error updating department.');
    } finally {
      setIsUpdatingDept(false);
    }
  };

  /* ── Delete Department ── */
  const handleDeleteDepartment = async () => {
    if (!deleteDeptModal) return;

    setIsDeletingDept(true);
    try {
      const res = await fetch(`/api/superadmin/departments?id=${deleteDeptModal.id}`, {
        method: 'DELETE',
        headers: { 'x-superadmin-token': token || '' },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Department "${deleteDeptModal.departmentName}" deleted.`);
        setDeleteDeptModal(null);
        fetchDepartments();
        fetchColleges();
      } else {
        toast.error(data.message || 'Failed to delete department.');
      }
    } catch {
      toast.error('Network error deleting department.');
    } finally {
      setIsDeletingDept(false);
    }
  };

  /* ── Create Admin ── */
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim() || !newAdminCollegeId) {
      toast.error('Email, College selection, and Password are all required.');
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
          email: newEmail.trim().toLowerCase(),
          name: newAdminName.trim() || undefined,
          collegeId: Number(newAdminCollegeId),
          collegeDepartmentId: newAdminDeptId ? Number(newAdminDeptId) : undefined,
          password: newPassword,
          active: newActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Admin account created for "${newEmail}"!`);
        setAddModalOpen(false);
        setNewEmail('');
        setNewAdminName('');
        setNewAdminCollegeId('');
        setNewAdminDeptId('');
        setNewPassword('');
        setNewActive(true);
        fetchAdmins();
        fetchColleges();
        fetchDepartments();
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
        toast.success(`Admin "${admin.email}" is now ${updatedStatus ? 'active' : 'disabled'}.`);
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
        toast.success(`Password updated for "${resetModalAdmin.email}"!`);
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
        headers: { 'x-superadmin-token': token || '' },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Admin "${deleteModalAdmin.email}" deleted.`);
        setAdmins(prev => prev.filter(a => a.id !== deleteModalAdmin.id));
        setDeleteModalAdmin(null);
        fetchColleges();
        fetchDepartments();
      } else {
        toast.error(data.message || 'Failed to delete admin.');
      }
    } catch {
      toast.error('Failed to delete admin.');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Filters ── */
  const nonDummyColleges = colleges.filter(c => c.identifier !== 'DUMMY' && c.name !== 'Enter-your-college');

  const filteredColleges = colleges.filter(c => {
    if (!collegeSearch.trim()) return true;
    const q = collegeSearch.toLowerCase();
    const matchesNameOrId = c.name.toLowerCase().includes(q) || c.identifier.toLowerCase().includes(q);
    const matchesDepts = c.departments?.some(
      d => d.departmentName.toLowerCase().includes(q) || d.registrationKey.toLowerCase().includes(q)
    );
    return matchesNameOrId || Boolean(matchesDepts);
  });

  const filteredDepartments = departments.filter(d => {
    if (deptCollegeFilter !== 'all' && d.collegeId !== Number(deptCollegeFilter)) return false;
    if (!departmentSearch.trim()) return true;
    const q = departmentSearch.toLowerCase();
    return (
      d.departmentName.toLowerCase().includes(q) ||
      d.registrationKey.toLowerCase().includes(q) ||
      (d.college?.name && d.college.name.toLowerCase().includes(q))
    );
  });

  const filteredAdmins = admins.filter(a => {
    const matchesSearch =
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.college?.name && a.college.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.collegeDepartment?.departmentName && a.collegeDepartment.departmentName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'active' && !a.active) return false;
    if (statusFilter === 'disabled' && a.active) return false;
    if (collegeFilter !== 'all') {
      if (a.collegeId !== Number(collegeFilter)) return false;
    }
    return true;
  });

  const availableDeptsForNewAdmin = newAdminCollegeId
    ? departments.filter(d => d.collegeId === Number(newAdminCollegeId))
    : [];

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.active).length;
  const totalConfiguredColleges = nonDummyColleges.length;
  const totalDepartments = departments.length;

  /* ── Top Header Component for SuperAdmin Portal ── */
  const SuperAdminHeader = () => (
    <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0 z-30 mb-8 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-inner">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Super Admin Console
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Cybersecurity Awareness &amp; Digital Safety Programme
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="btn btn-secondary btn-xs sm:btn-sm gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to Admin</span>
            <span className="sm:hidden">Admin</span>
          </Link>

          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              title="Log out of Super Admin"
              className="btn btn-secondary btn-xs sm:btn-sm gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );

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
      <div className="min-h-[85vh] flex flex-col justify-between">
        <SuperAdminHeader />

        <div className="max-w-md mx-auto my-8 px-4 w-full">
          <div className="card p-8 border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Key className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
                <ShieldAlert className="w-3 h-3" />
                Super Admin Access Only
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Super Admin Gateway
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Enter your master password to configure colleges, departments, registration keys, and administrators.
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

            <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
              <Link href="/admin" className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Go to normal Admin Login (/admin)
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 pb-4">
          Cybersecurity Awareness &amp; Digital Safety Programme • Super Admin Portal
        </div>
      </div>
    );
  }

  /* ── 3. Authenticated Super Admin Dashboard ── */
  return (
    <div className="min-h-screen pb-12">
      <SuperAdminHeader />

      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Institution &amp; Admin Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure colleges, departments, registration keys, and provision scoped admin credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'colleges' && (
              <button
                onClick={() => {
                  setNewCollegeName('');
                  setNewCollegeIdentifier('');
                  setNewInitialDeptName('');
                  setNewInitialRegKey('');
                  setAddCollegeModalOpen(true);
                }}
                className="btn btn-primary btn-md gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Configure College</span>
              </button>
            )}

            {activeTab === 'departments' && (
              <button
                onClick={() => {
                  setNewDeptCollegeId(nonDummyColleges.length > 0 ? nonDummyColleges[0].id : '');
                  setNewDeptName('');
                  setNewDeptRegKey('');
                  setAddDepartmentModalOpen(true);
                }}
                className="btn btn-primary btn-md gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department &amp; Key</span>
              </button>
            )}

            {activeTab === 'admins' && (
              <button
                onClick={() => {
                  setNewEmail('');
                  setNewAdminName('');
                  setNewAdminCollegeId(nonDummyColleges.length > 0 ? nonDummyColleges[0].id : '');
                  setNewAdminDeptId('');
                  setNewPassword('');
                  setNewActive(true);
                  setCopiedNewCreds(false);
                  setShowNewPassword(false);
                  setAddModalOpen(true);
                }}
                className="btn btn-primary btn-md gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab('colleges')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'colleges'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Colleges &amp; Schools</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              {totalConfiguredColleges}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'departments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Departments &amp; Keys</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {totalDepartments}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'admins'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Admin Accounts</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {totalAdmins}
            </span>
          </button>
        </div>

        {/* Clickable KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('colleges')}
            className={`card p-5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'colleges'
                ? 'ring-2 ring-amber-500 border-amber-300 dark:border-amber-700 shadow-md'
                : 'border-amber-200/60 dark:border-amber-900/40 hover:border-amber-400'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Colleges</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{totalConfiguredColleges}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active institutions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
              <School className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('departments')}
            className={`card p-5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'departments'
                ? 'ring-2 ring-blue-500 border-blue-300 dark:border-blue-700 shadow-md'
                : 'border-blue-200/60 dark:border-blue-900/40 hover:border-blue-400'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Departments &amp; Keys</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totalDepartments}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active registration keys</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('admins')}
            className={`card p-5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              activeTab === 'admins'
                ? 'ring-2 ring-slate-400 dark:ring-slate-600 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Admins</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAdmins}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Provisioned accounts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('admins')}
            className={`card p-5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-400`}
          >
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Admins</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeAdmins}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Enabled administrators</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* ── TAB 1: Colleges & Schools ── */}
        {activeTab === 'colleges' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Configured Colleges &amp; Schools</h2>
                <span className="text-xs text-slate-400">({filteredColleges.length})</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={collegeSearch}
                    onChange={e => setCollegeSearch(e.target.value)}
                    placeholder="Search college, dept or key..."
                    className="field-input pl-8 py-1.5 text-xs w-full"
                  />
                  {collegeSearch && (
                    <button onClick={() => setCollegeSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    fetchColleges();
                    fetchDepartments();
                  }}
                  disabled={loadingColleges}
                  title="Refresh colleges"
                  className="btn btn-secondary btn-sm px-2.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingColleges ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Official College &amp; Active Keys</th>
                    <th className="table-th">Identifier Code</th>
                    <th className="table-th text-center">Departments</th>
                    <th className="table-th text-center">Admins</th>
                    <th className="table-th text-center">Enrolled Students</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingColleges && colleges.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
                        <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" /></td>
                        <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" /></td>
                        <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" /></td>
                        <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" /></td>
                        <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" /></td>
                        <td className="table-td text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredColleges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <School className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {collegeSearch ? 'No colleges match your search.' : 'No colleges configured yet.'}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Click &quot;Configure College&quot; to add participating institutions.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredColleges.map(c => {
                      const isDummy = c.identifier === 'DUMMY' || c.name === 'Enter-your-college';
                      const collegeDepts = c.departments || [];
                      return (
                        <tr key={c.id} className="table-row">
                          <td className="table-td font-semibold text-slate-900 dark:text-white">
                            <div>
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>{c.name}</span>
                                {isDummy && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    Default Placeholder
                                  </span>
                                )}
                              </div>

                              {/* Associated Departments & Registration Keys Badges */}
                              {!isDummy && collegeDepts.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-6">
                                  {collegeDepts.map(d => (
                                    <span
                                      key={d.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200"
                                    >
                                      <Tag className="w-3 h-3 text-blue-500" />
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.departmentName}:</span>
                                      <code className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/60 px-1 rounded">{d.registrationKey}</code>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(d.registrationKey);
                                          toast.success(`Key "${d.registrationKey}" copied!`);
                                        }}
                                        title="Copy registration key"
                                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 ml-0.5 p-0.5"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewDeptCollegeId(c.id);
                                      setNewDeptName('');
                                      setNewDeptRegKey('');
                                      setAddDepartmentModalOpen(true);
                                    }}
                                    title="Add another department & key to this college"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                  >
                                    <Plus className="w-3 h-3" /> Add Key
                                  </button>
                                </div>
                              )}

                              {!isDummy && collegeDepts.length === 0 && (
                                <div className="mt-1.5 pl-6">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewDeptCollegeId(c.id);
                                      setNewDeptName('');
                                      setNewDeptRegKey('');
                                      setAddDepartmentModalOpen(true);
                                    }}
                                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <KeyRound className="w-3 h-3" /> + Add Department &amp; Registration Key
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="table-td font-mono text-xs text-slate-700 dark:text-slate-300">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
                              {c.identifier}
                            </span>
                          </td>

                          <td className="table-td text-center text-xs font-bold text-blue-600 dark:text-blue-400">
                            <button
                              onClick={() => {
                                setDeptCollegeFilter(String(c.id));
                                setActiveTab('departments');
                              }}
                              className="hover:underline inline-flex items-center gap-1 cursor-pointer"
                              title="View departments in Departments tab"
                            >
                              <span>{collegeDepts.length}</span>
                              <ChevronRight className="w-3 h-3 text-slate-400" />
                            </button>
                          </td>

                          <td className="table-td text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                            {c._count?.admins ?? 0}
                          </td>

                          <td className="table-td text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {c._count?.students ?? 0}
                          </td>

                          <td className="table-td text-right">
                            {isDummy ? (
                              <span className="text-[11px] text-slate-400 italic">System Managed</span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setNewDeptCollegeId(c.id);
                                    setNewDeptName('');
                                    setNewDeptRegKey('');
                                    setAddDepartmentModalOpen(true);
                                  }}
                                  title="Add Department & Key"
                                  className="btn-icon text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setEditCollegeModal(c);
                                    setEditCollegeName(c.name);
                                    setEditCollegeIdentifier(c.identifier);
                                  }}
                                  title="Edit College"
                                  className="btn-icon text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setDeleteCollegeModal(c)}
                                  title="Delete College"
                                  className="btn-icon text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: Departments & Keys ── */}
        {activeTab === 'departments' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Departments &amp; Registration Keys</h2>
                <span className="text-xs text-slate-400">({filteredDepartments.length})</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={departmentSearch}
                    onChange={e => setDepartmentSearch(e.target.value)}
                    placeholder="Search department, key or college..."
                    className="field-input pl-8 py-1.5 text-xs w-full"
                  />
                  {departmentSearch && (
                    <button onClick={() => setDepartmentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={deptCollegeFilter}
                  onChange={e => setDeptCollegeFilter(e.target.value)}
                  className="field-input py-1.5 px-2 text-xs w-auto"
                >
                  <option value="all">All Colleges</option>
                  {nonDummyColleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    fetchDepartments();
                    fetchColleges();
                  }}
                  disabled={loadingDepartments}
                  title="Refresh list"
                  className="btn btn-secondary btn-sm px-2.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDepartments ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">College / Institution</th>
                    <th className="table-th">Department Name</th>
                    <th className="table-th">Active Registration Key</th>
                    <th className="table-th text-center">Admins</th>
                    <th className="table-th text-center">Enrolled Students</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDepartments && departments.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
                        <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40" /></td>
                        <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" /></td>
                        <td className="table-td"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" /></td>
                        <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" /></td>
                        <td className="table-td text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 mx-auto" /></td>
                        <td className="table-td text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Layers className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {departmentSearch ? 'No departments matching search.' : 'No departments configured yet.'}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Click &quot;Add Department &amp; Key&quot; to set up department registration keys.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map(dept => (
                      <tr key={dept.id} className="table-row">
                        <td className="table-td font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{dept.college?.name || 'Unknown College'}</span>
                          </div>
                        </td>

                        <td className="table-td font-bold text-slate-900 dark:text-white">
                          {dept.departmentName}
                        </td>

                        <td className="table-td font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 font-black text-blue-700 dark:text-blue-300 shadow-xs">
                              {dept.registrationKey}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(dept.registrationKey);
                                toast.success(`Key "${dept.registrationKey}" copied!`);
                              }}
                              title="Copy registration key"
                              className="btn-icon w-6 h-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="table-td text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                          {dept._count?.admins ?? 0}
                        </td>

                        <td className="table-td text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {dept._count?.students ?? 0}
                        </td>

                        <td className="table-td text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditDeptModal(dept);
                                setEditDeptName(dept.departmentName);
                                setEditDeptRegKey(dept.registrationKey);
                              }}
                              title="Edit Department / Key"
                              className="btn-icon text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeleteDeptModal(dept)}
                              title="Delete Department"
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
        )}

        {/* ── TAB 3: Admin Accounts List ── */}
        {activeTab === 'admins' && (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Admin Accounts List</h2>
                <span className="text-xs text-slate-400">({filteredAdmins.length})</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search admin email, college, department..."
                    className="field-input pl-8 py-1.5 text-xs w-full"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={collegeFilter}
                  onChange={e => setCollegeFilter(e.target.value)}
                  className="field-input py-1.5 px-2 text-xs w-auto"
                >
                  <option value="all">All Colleges</option>
                  {nonDummyColleges.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="field-input py-1.5 px-2 text-xs w-auto"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>

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

            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Admin Email</th>
                    <th className="table-th">College &amp; Department Scope</th>
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
                            Click &quot;Add New Admin&quot; to provision an admin for a college/department.
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
                            <div>
                              <span className="font-mono text-xs">{admin.email}</span>
                              {admin.name && (
                                <p className="text-[11px] text-slate-400 font-normal">{admin.name}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="table-td text-slate-800 dark:text-slate-200 font-medium">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{admin.college?.name || <span className="text-slate-400 italic">Unassigned (Global)</span>}</span>
                            </div>
                            {admin.collegeDepartment && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                                Department: <strong className="text-slate-700 dark:text-slate-300">{admin.collegeDepartment.departmentName}</strong> (Key: <code className="font-mono">{admin.collegeDepartment.registrationKey}</code>)
                              </p>
                            )}
                          </div>
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
                                setResetPassword('');
                                setShowResetPassword(false);
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
        )}

        {/* ── Modal: Add New College ── */}
        {addCollegeModalOpen && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAddCollegeModalOpen(false); }}>
            <div className="modal-panel max-w-[520px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <School className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure New College / School</h3>
                    <p className="text-[11px] text-slate-500">Add an official institution and optional initial registration key</p>
                  </div>
                </div>
                <button onClick={() => setAddCollegeModalOpen(false)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCollege} className="p-6 space-y-4">
                <div>
                  <label className="field-label">Official College Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={newCollegeName}
                    onChange={e => setNewCollegeName(e.target.value)}
                    placeholder="e.g. MIT - WPU University Pune"
                    className="field-input"
                    required
                    autoFocus
                  />
                  <p className="field-helper mt-1 text-[11px]">
                    This is the official institution name.
                  </p>
                </div>

                <div>
                  <label className="field-label">Unique Identifier Code <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={newCollegeIdentifier}
                    onChange={e => setNewCollegeIdentifier(e.target.value.toUpperCase())}
                    placeholder="e.g. MITWPU-PUNE"
                    className="field-input font-mono uppercase"
                    required
                  />
                  <p className="field-helper mt-1 text-[11px]">
                    Short code for reports and certificate serializing.
                  </p>
                </div>

                {/* Optional Initial Department & Registration Key */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Initial Department &amp; Registration Key (Optional)</span>
                  </div>

                  <div>
                    <label className="field-label text-[11px] mb-1">Department Name</label>
                    <input
                      type="text"
                      value={newInitialDeptName}
                      onChange={e => setNewInitialDeptName(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="field-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="field-label text-[11px] mb-1">Registration Key</label>
                    <input
                      type="text"
                      value={newInitialRegKey}
                      onChange={e => setNewInitialRegKey(e.target.value)}
                      placeholder="e.g. MITCSE2026"
                      className="field-input text-xs font-mono"
                    />
                    <p className="field-helper text-[10px] mt-0.5">
                      You can also create more departments and keys later in the &quot;Departments &amp; Keys&quot; tab.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setAddCollegeModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSavingCollege || !newCollegeName.trim() || !newCollegeIdentifier.trim()} className="btn btn-primary btn-sm gap-1.5">
                    {isSavingCollege ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save College</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Edit College ── */}
        {editCollegeModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditCollegeModal(null); }}>
            <div className="modal-panel max-w-[500px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit College</h3>
                <button onClick={() => setEditCollegeModal(null)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateCollege} className="p-6 space-y-4">
                <div>
                  <label className="field-label">Official College Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editCollegeName}
                    onChange={e => setEditCollegeName(e.target.value)}
                    className="field-input"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="field-label">Identifier Code <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editCollegeIdentifier}
                    onChange={e => setEditCollegeIdentifier(e.target.value.toUpperCase())}
                    className="field-input font-mono uppercase"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setEditCollegeModal(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdatingCollege || !editCollegeName.trim() || !editCollegeIdentifier.trim()} className="btn btn-primary btn-sm gap-1.5">
                    {isUpdatingCollege ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update College</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Confirm Delete College ── */}
        {deleteCollegeModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteCollegeModal(null); }}>
            <div className="modal-panel max-w-[420px]">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete College?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteCollegeModal.name}</span>?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button type="button" onClick={() => setDeleteCollegeModal(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeleteCollege} disabled={isDeletingCollege} className="btn btn-destructive btn-sm gap-1.5">
                    {isDeletingCollege ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Add New Department ── */}
        {addDepartmentModalOpen && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAddDepartmentModalOpen(false); }}>
            <div className="modal-panel max-w-[500px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Department &amp; Registration Key</h3>
                    <p className="text-[11px] text-slate-500">Create a department under a college and set its registration key</p>
                  </div>
                </div>
                <button onClick={() => setAddDepartmentModalOpen(false)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateDepartment} className="p-6 space-y-4">
                <div>
                  <label className="field-label">College / Institution <span className="text-rose-500">*</span></label>
                  <select
                    value={newDeptCollegeId}
                    onChange={e => setNewDeptCollegeId(Number(e.target.value))}
                    className="field-input text-xs"
                    required
                  >
                    <option value="" disabled>Select parent college...</option>
                    {nonDummyColleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.identifier})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Department Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="field-input"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">Registration Key <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={newDeptRegKey}
                    onChange={e => setNewDeptRegKey(e.target.value)}
                    placeholder="e.g. MITCSE2026 or CSE-MIT"
                    className="field-input font-mono"
                    required
                  />
                  <p className="field-helper mt-1 text-[11px]">
                    Any identifier/invitation key. No minimum length or password complexity rules.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setAddDepartmentModalOpen(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSavingDept || !newDeptCollegeId || !newDeptName.trim() || !newDeptRegKey.trim()} className="btn btn-primary btn-sm gap-1.5">
                    {isSavingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Department</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Edit Department ── */}
        {editDeptModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditDeptModal(null); }}>
            <div className="modal-panel max-w-[500px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Department &amp; Key</h3>
                <button onClick={() => setEditDeptModal(null)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateDepartment} className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">College: <strong className="text-slate-800 dark:text-slate-200">{editDeptModal.college?.name}</strong></p>
                </div>

                <div>
                  <label className="field-label">Department Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editDeptName}
                    onChange={e => setEditDeptName(e.target.value)}
                    className="field-input"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="field-label">Registration Key <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editDeptRegKey}
                    onChange={e => setEditDeptRegKey(e.target.value)}
                    className="field-input font-mono"
                    required
                  />
                  <p className="field-helper mt-1 text-[11px]">
                    Changing the registration key only affects new registrations. Existing registered students remain permanently associated.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setEditDeptModal(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdatingDept || !editDeptName.trim() || !editDeptRegKey.trim()} className="btn btn-primary btn-sm gap-1.5">
                    {isUpdatingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update Department</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Confirm Delete Department ── */}
        {deleteDeptModal && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteDeptModal(null); }}>
            <div className="modal-panel max-w-[420px]">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Department?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteDeptModal.departmentName}</span>?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button type="button" onClick={() => setDeleteDeptModal(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeleteDepartment} disabled={isDeletingDept} className="btn btn-destructive btn-sm gap-1.5">
                    {isDeletingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Add New Admin ── */}
        {addModalOpen && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAddModalOpen(false); }}>
            <div className="modal-panel max-w-[500px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New School Admin Account</h3>
                    <p className="text-[11px] text-slate-500">Assign an administrator to a college and department</p>
                  </div>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                <div>
                  <label className="field-label">Admin Email Address <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="e.g. admin@mitwpu.edu.in or prof.sharma@gmail.com"
                    className="field-input font-mono text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="field-label">Assigned College / School <span className="text-rose-500">*</span></label>
                  <select
                    value={newAdminCollegeId}
                    onChange={e => {
                      setNewAdminCollegeId(Number(e.target.value));
                      setNewAdminDeptId('');
                    }}
                    className="field-input text-xs"
                    required
                  >
                    <option value="" disabled>Select a configured college...</option>
                    {nonDummyColleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.identifier})</option>
                    ))}
                  </select>
                </div>

                {newAdminCollegeId && (
                  <div>
                    <label className="field-label">Assigned Department (Optional)</label>
                    <select
                      value={newAdminDeptId}
                      onChange={e => setNewAdminDeptId(e.target.value ? Number(e.target.value) : '')}
                      className="field-input text-xs"
                    >
                      <option value="">All Departments (College-Wide)</option>
                      {availableDeptsForNewAdmin.map(d => (
                        <option key={d.id} value={d.id}>{d.departmentName} (Key: {d.registrationKey})</option>
                      ))}
                    </select>
                    <p className="field-helper mt-1 text-[11px]">
                      Leave as All Departments or scope this admin to a specific department.
                    </p>
                  </div>
                )}

                <div>
                  <label className="field-label">Admin Full Name / Title (Optional)</label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma"
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
                      placeholder="Enter password (min. 6 characters)..."
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

                  {newPassword.trim() && (
                    <div className="mt-2 flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                        {newEmail || 'email'} : {newPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const col = nonDummyColleges.find(c => c.id === Number(newAdminCollegeId));
                          navigator.clipboard.writeText(`College: ${col?.name || 'N/A'}\nEmail: ${newEmail || 'N/A'}\nPassword: ${newPassword}`);
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
                      Active immediately
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary btn-sm">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAdmin || !newEmail.trim() || !newAdminCollegeId || !newPassword.trim()}
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
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setResetModalAdmin(null); }}>
            <div className="modal-panel max-w-[440px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reset Admin Password</h3>
                <button onClick={() => setResetModalAdmin(null)} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Admin Email</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">{resetModalAdmin.email}</p>
                  {resetModalAdmin.college && (
                    <p className="text-xs text-slate-400 mt-0.5">College: {resetModalAdmin.college.name}</p>
                  )}
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
                      placeholder="Enter new password (min. 6 characters)..."
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
                  <button type="button" onClick={() => setResetModalAdmin(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isResetting || !resetPassword.trim()} className="btn btn-primary btn-sm gap-1.5">
                    {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Confirm Delete Admin ── */}
        {deleteModalAdmin && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteModalAdmin(null); }}>
            <div className="modal-panel max-w-[420px]">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Admin Account?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to permanently delete admin account <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">{deleteModalAdmin.email}</span>?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button type="button" onClick={() => setDeleteModalAdmin(null)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="button" onClick={handleDeleteAdmin} disabled={isDeleting} className="btn btn-destructive btn-sm gap-1.5">
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

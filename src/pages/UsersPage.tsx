import { useEffect, useState } from 'react';
import { Search, AlertCircle, UserCog, UserPlus, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDateTime, getRoleLabel } from '../lib/utils';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Profile, UserRole } from '../lib/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'eo_admin', label: 'EO Admin' },
  { value: 'exhibitor', label: 'Exhibitor' },
  { value: 'contractor', label: 'Contractor' },
];

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  eo_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  exhibitor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  contractor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [form, setForm] = useState({ name: '', role: 'exhibitor' as UserRole, company: '', phone: '' });
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'exhibitor' as UserRole, company: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setForm({ name: user.name, role: user.role as UserRole, company: user.company ?? '', phone: user.phone ?? '' });
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true);
    await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editUser.id);
    setSaving(false);
    setEditUser(null);
    loadUsers();
  }

  async function handleCreate() {
    if (!createForm.name || !createForm.email) { setError('Name and email are required.'); return; }
    setCreating(true);
    setError('');
    const tempPassword = generateTempPassword();
    try {
      const { error: authErr } = await supabase.auth.signUp({
        email: createForm.email,
        password: tempPassword,
        options: {
          data: {
            name: createForm.name,
            role: createForm.role,
          },
        },
      });
      if (authErr) throw authErr;
      setCreatedCreds({ email: createForm.email, password: tempPassword });
      setShowCreate(false);
      setCreateForm({ name: '', email: '', role: 'exhibitor', company: '', phone: '' });
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || (u.company ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = ROLES.map((r) => ({ ...r, count: users.filter((u) => u.role === r.value).length }));

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.value} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}s</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['User', 'Role', 'Company', 'Phone', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role] ?? 'bg-gray-100 text-gray-800'}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(user)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                      >
                        <UserCog size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New User">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company</label>
              <input
                value={createForm.company}
                onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            A temporary password will be generated. Share it with the user so they can log in.
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={creating} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2">
              {creating && <LoadingSpinner size="sm" />}
              Create User
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!createdCreds} onClose={() => setCreatedCreds(null)} title="User Created Successfully">
        {createdCreds && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-sm text-green-700 dark:text-green-300">
              User account created. Share these credentials with the user.
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-mono text-gray-900 dark:text-white">{createdCreds.email}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Temporary Password</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-mono text-gray-900 dark:text-white">{createdCreds.password}</span>
                  <button
                    onClick={() => copyToClipboard(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">The user should change their password after first login.</p>
            <button onClick={() => setCreatedCreds(null)} className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">Done</button>
          </div>
        )}
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm">
        {editUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2">
                {saving && <LoadingSpinner size="sm" />}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

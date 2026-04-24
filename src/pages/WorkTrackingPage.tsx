import { useEffect, useState, useRef } from 'react';
import { Search, AlertCircle, Wrench, Camera, CheckCircle, RefreshCw, RotateCcw, Loader, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Assignment, WorkLog, Order, Profile, Service } from '../lib/types';
import type { WorkStatus } from '../lib/types';

const WORK_STATUSES: { value: WorkStatus; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { value: 'instruction_received', label: 'Instruction Received', icon: <AlertCircle size={14} />, color: 'text-sky-600', desc: 'Job received, preparing to start' },
  { value: 'in_progress', label: 'In Progress', icon: <Loader size={14} />, color: 'text-amber-600', desc: 'Work is currently underway' },
  { value: 'complete', label: 'Complete', icon: <CheckCircle size={14} />, color: 'text-green-600', desc: 'Work has been completed' },
  { value: 'need_revision', label: 'Need Revision', icon: <RotateCcw size={14} />, color: 'text-rose-600', desc: 'Revision requested by admin' },
];

interface AssignmentWithLog extends Assignment {
  latest_log?: WorkLog;
}

export default function WorkTrackingPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithLog[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updateTarget, setUpdateTarget] = useState<AssignmentWithLog | null>(null);
  const [viewLogsTarget, setViewLogsTarget] = useState<AssignmentWithLog | null>(null);
  const [form, setForm] = useState<{ status: WorkStatus; notes: string; photo: File | null }>({ status: 'instruction_received', notes: '', photo: null });
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isContractor = profile?.role === 'contractor';
  const isAdmin = profile?.role === 'eo_admin' || profile?.role === 'super_admin';

  useEffect(() => { loadAssignments(); }, [profile]);

  async function loadAssignments() {
  setLoading(true);

  type MiniService = {
    id: string;
    name: string;
    category: string;
  };

  type MiniBooth = {
    id: string;
    number: string;
  };

  type MiniEvent = {
    id: string;
    name: string;
  };

  type MiniOrder = {
    id: string;
    invoice_number: string;
    service?: MiniService | null;
    booth?: MiniBooth | null;
    event?: MiniEvent | null;
  };

  type MiniProfile = {
    id: string;
    full_name: string | null;
    company: string | null;
  };

  type AssignmentRow = Assignment & {
    order?: MiniOrder | null;
    contractor?: MiniProfile | null;
    latest_log?: WorkLog;
  };

  let query = supabase
    .from('assignments')
    .select(`
      *,
      order:orders(
        id,
        invoice_number,
        service:services(id,name,category),
        booth:booths(id,number),
        event:events(id,name)
      ),
      contractor:profiles!assignments_contractor_id_fkey(
        id,
        full_name,
        company
      )
    `)
    .order('created_at', { ascending: false });

  if (isContractor) {
    query = query.eq('contractor_id', profile!.id);
  }

  const { data } = await query;

  const list = (data as unknown as AssignmentRow[]) ?? [];

  const ids = list.map((a) => a.id);

  const logsMap: Record<string, WorkLog> = {};

  if (ids.length > 0) {
    const { data: logs } = await supabase
      .from('work_logs')
      .select(`
        *,
        updater:profiles!work_logs_updated_by_fkey(
          id,
          full_name
        )
      `)
      .in('assignment_id', ids)
      .order('created_at', { ascending: false });

    (logs ?? []).forEach((log) => {
      const item = log as unknown as WorkLog;

      if (item.assignment_id && !logsMap[item.assignment_id]) {
        logsMap[item.assignment_id] = item;
      }
    });
  }

  setAssignments(
    list.map((a) => ({
      ...a,
      latest_log: logsMap[a.id],
    }))
  );

  setLoading(false);
}

 async function loadWorkLogs(assignmentId: string) {
  const { data } = await supabase
    .from('work_logs')
    .select(`
      *,
      updater:profiles!work_logs_updated_by_fkey(
        id,
        full_name
      )
    `)
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false });

  setWorkLogs((data as unknown as WorkLog[]) ?? []);
}

  function openUpdate(assignment: AssignmentWithLog) {
    const currentStatus = (assignment.latest_log?.status as WorkStatus) ?? 'instruction_received';
    setUpdateTarget(assignment);
    setForm({ status: currentStatus, notes: '', photo: null });
    setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((f) => ({ ...f, photo: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpdate() {
    if (!updateTarget) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;
      if (form.photo) {
        const ext = form.photo.name.split('.').pop();
        const path = `work-photos/${updateTarget.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('work-photos').upload(path, form.photo);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('work-photos').getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      await supabase.from('work_logs').insert({
        assignment_id: updateTarget.id,
        status: form.status,
        notes: form.notes || null,
        photo_url: photoUrl,
        updated_by: profile!.id,
      });

      if (form.status === 'complete') {
        await supabase.from('orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', updateTarget.order_id!);
      } else if (form.status === 'in_progress') {
        await supabase.from('orders').update({ status: 'on_progress', updated_at: new Date().toISOString() }).eq('id', updateTarget.order_id!);
      }

      setUpdateTarget(null);
      setPhotoPreview(null);
      loadAssignments();
    } finally {
      setSaving(false);
    }
  }

  async function openViewLogs(assignment: AssignmentWithLog) {
    setViewLogsTarget(assignment);
    await loadWorkLogs(assignment.id);
  }

  const filtered = assignments.filter((a) => {
    const order = a.order as unknown as Order;
    const contractor = a.contractor as unknown as Profile;
    const latestStatus = a.latest_log?.status ?? 'instruction_received';
    const matchSearch =
      (order as unknown as { invoice_number?: string })?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      (order?.service as unknown as Service)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      contractor?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || latestStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = WORK_STATUSES.map((s) => ({
    ...s,
    count: assignments.filter((a) => (a.latest_log?.status ?? 'instruction_received') === s.value).length,
  }));

  const canUpdate = (latestStatus: WorkStatus) => {
    if (isContractor) {
      return latestStatus === 'instruction_received' || latestStatus === 'in_progress' || latestStatus === 'need_revision';
    }
    return isAdmin;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusCounts.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? 'all' : s.value)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === s.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-sm'
            }`}
          >
            <div className={`flex items-center gap-2 mb-1 ${s.color}`}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.count}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice, service, contractor..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {WORK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Wrench size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No work assignments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const order = a.order as unknown as Order;
            const contractor = a.contractor as unknown as Profile;
            const service = order?.service as unknown as Service;
            const latestStatus = (a.latest_log?.status ?? 'instruction_received') as WorkStatus;
            const statusInfo = WORK_STATUSES.find((s) => s.value === latestStatus);
            const isRevision = latestStatus === 'need_revision';
            return (
              <div key={a.id} className={`bg-white dark:bg-gray-900 rounded-2xl border transition-shadow hover:shadow-md ${isRevision ? 'border-rose-200 dark:border-rose-800' : 'border-gray-200 dark:border-gray-800'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                        {(order as unknown as { invoice_number?: string })?.invoice_number ?? '-'}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 truncate">{service?.name ?? '-'}</p>
                    </div>
                    <StatusBadge status={latestStatus} size="sm" />
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 mb-4">
                    {!isContractor && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Contractor:</span>
                        <span>{contractor?.full_name ?? '-'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Event:</span>
                      <span className="truncate">{(order?.event as unknown as { name?: string })?.name ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Booth:</span>
                      <span>{(order?.booth as unknown as { number?: string })?.number ?? '-'}</span>
                    </div>
                    {a.latest_log?.notes && (
                      <p className={`line-clamp-2 italic ${isRevision ? 'text-rose-600 dark:text-rose-400' : ''}`}>"{a.latest_log.notes}"</p>
                    )}
                  </div>

                  {a.latest_log?.photo_url && (
                    <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                      <img src={a.latest_log.photo_url} alt="Work photo" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className={`flex gap-2 px-5 py-3 border-t ${isRevision ? 'border-rose-100 dark:border-rose-900/30' : 'border-gray-100 dark:border-gray-800'}`}>
                  <button
                    onClick={() => openViewLogs(a)}
                    className="flex-1 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    View History
                  </button>
                  {canUpdate(latestStatus) && (
                    <button
                      onClick={() => openUpdate(a)}
                      className={`flex-1 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${isRevision ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {isRevision ? 'Address Revision' : 'Update Status'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!updateTarget} onClose={() => { setUpdateTarget(null); setPhotoPreview(null); }} title="Update Work Status">
        {updateTarget && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Order</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                {((updateTarget.order as unknown as Order) as unknown as { invoice_number?: string })?.invoice_number ?? '-'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {((updateTarget.order as unknown as Order)?.service as unknown as Service)?.name ?? '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Status</label>
              <div className="space-y-2">
                {WORK_STATUSES.filter((s) => {
                  if (isAdmin) return true;
                  return s.value !== 'need_revision';
                }).map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      form.status === s.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className={`mt-0.5 ${s.color}`}>{s.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${form.status === s.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{s.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder={form.status === 'need_revision' ? 'Describe what needs to be revised...' : 'Describe the work done...'}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {(form.status === 'in_progress' || form.status === 'complete') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5"><Camera size={14} /> Work Photo{form.status === 'complete' ? ' *' : ' (optional)'}</span>
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => { setPhotoPreview(null); setForm((f) => ({ ...f, photo: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-900 rounded-full shadow text-gray-600 hover:text-red-600 transition-colors">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                    <Upload size={18} className="text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Upload work photo</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setUpdateTarget(null); setPhotoPreview(null); }} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={handleUpdate}
                disabled={saving || (form.status === 'complete' && !form.photo)}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving && <LoadingSpinner size="sm" />}
                Update
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewLogsTarget} onClose={() => setViewLogsTarget(null)} title="Work History">
        {viewLogsTarget && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-mono">
              {((viewLogsTarget.order as unknown as Order) as unknown as { invoice_number?: string })?.invoice_number ?? '-'}
            </p>
            {workLogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No work logs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workLogs.map((log, i) => {
                  const statusInfo = WORK_STATUSES.find((s) => s.value === log.status);
                  const dotColor = log.status === 'complete' ? 'bg-green-500' : log.status === 'in_progress' ? 'bg-amber-500' : log.status === 'need_revision' ? 'bg-rose-500' : 'bg-sky-400';
                  return (
                    <div key={log.id} className={`relative pl-6 ${i < workLogs.length - 1 ? 'pb-4 border-l-2 border-gray-100 dark:border-gray-800 ml-1' : ''}`}>
                      <div className={`absolute left-0 top-1 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${dotColor}`} />
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center gap-1 text-xs font-medium ${statusInfo?.color ?? ''}`}>
                          {statusInfo?.icon}{statusInfo?.label}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                      </div>
                      {log.notes && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{log.notes}</p>}
                      {log.photo_url && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 mb-2 max-w-xs">
                          <img src={log.photo_url} alt="Work photo" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-xs text-gray-400">by {(log.updater as unknown as Profile)?.full_name ?? 'Unknown'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

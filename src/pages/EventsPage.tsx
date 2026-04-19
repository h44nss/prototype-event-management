import { useEffect, useState } from 'react';
import { Plus, Search, Calendar, MapPin, ChevronRight, Pencil, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EventDetailPage from './EventDetailPage';
import type { Event, EventStatus } from '../lib/types';

const STATUS_OPTIONS: EventStatus[] = ['draft', 'published', 'active', 'closed', 'cancelled'];

function EventForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Event>;
  onSave: (data: Partial<Event>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    start_date: initial?.start_date?.slice(0, 10) ?? '',
    end_date: initial?.end_date?.slice(0, 10) ?? '',
    status: (initial?.status ?? 'draft') as EventStatus,
  });
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event Name *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tech Expo 2026" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Jakarta Convention Center" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Date *</label>
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date *</label>
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"><X size={14} />Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.start_date || !form.end_date} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center justify-center gap-1.5">
          {saving ? <LoadingSpinner size="sm" /> : <Save size={14} />}Save Event
        </button>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'eo_admin';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    setLoading(true);
    const { data } = await supabase.from('events').select('*, organizer:profiles!events_organizer_id_fkey(id, name)').order('start_date', { ascending: false });
    setEvents((data as Event[]) ?? []);
    setLoading(false);
  }

  async function handleSave(formData: Partial<Event>) {
    setSaving(true);
    if (editTarget) {
      const { organizer, ...updateData } = formData;
      const { data } = await supabase.from('events').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', editTarget.id).select().maybeSingle();
      if (data) setEvents((prev) => prev.map((e) => e.id === editTarget.id ? (data as Event) : e));
    } else {
      const insertData = {
        name: formData.name!,
        description: formData.description,
        location: formData.location,
        start_date: formData.start_date!,
        end_date: formData.end_date!,
        status: formData.status!,
        organizer_id: profile!.id
      };
      const { data } = await supabase.from('events').insert(insertData).select().maybeSingle();
      if (data) setEvents((prev) => [data as Event, ...prev]);
    }
    setShowModal(false);
    setEditTarget(null);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('events').delete().eq('id', deleteTarget.id);
    setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const filtered = events.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || (e.location ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onEventUpdate={(updated) => {
          setSelectedEvent(updated);
          setEvents((prev) => prev.map((e) => e.id === updated.id ? updated : e));
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex-shrink-0">
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Calendar size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-1">No events found</p>
          {isAdmin && <p className="text-sm text-gray-400">Click "New Event" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{event.name}</h3>
                    {event.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>}
                  </div>
                  <StatusBadge status={event.status} size="sm" />
                </div>
                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {event.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="flex-shrink-0" />
                    <span>{formatDate(event.start_date)} — {formatDate(event.end_date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 dark:text-gray-500">Click to manage</span>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditTarget(event); setShowModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(event); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditTarget(null); }} title={editTarget ? 'Edit Event' : 'Create New Event'}>
        <EventForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditTarget(null); }}
          saving={saving}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Event"
        message={`Delete "${deleteTarget?.name}"? This will also remove all halls, booths, and associated data.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

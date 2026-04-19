import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, AlertCircle, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, getCategoryLabel } from '../lib/utils';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Service, ServiceCategory } from '../lib/types';

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'internet', label: 'Internet' },
  { value: 'booth_support', label: 'Booth Support' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'av_equipment', label: 'AV Equipment' },
  { value: 'general', label: 'General' },
];

const UNITS = ['unit', 'day', 'hour', 'meter', 'set', 'connection', 'session', 'package'];

const catColors: Record<string, string> = {
  electricity: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  internet: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  booth_support: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  furniture: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  av_equipment: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const EMPTY_FORM = { name: '', description: '', category: 'electricity' as ServiceCategory, price: '', unit: 'unit', image_url: '', is_active: true };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('category').order('name');
    setServices((data as Service[]) ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditService(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Service) {
    setEditService(s);
    setForm({ name: s.name, description: s.description ?? '', category: s.category, price: String(s.price), unit: s.unit, image_url: s.image_url ?? '', is_active: s.is_active });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) { setError('Name and price are required.'); return; }
    setSaving(true);
    setError('');
    const payload = { name: form.name, description: form.description, category: form.category, price: parseFloat(form.price), unit: form.unit, image_url: form.image_url, is_active: form.is_active, updated_at: new Date().toISOString() };
    try {
      if (editService) {
        const { error } = await supabase.from('services').update(payload).eq('id', editService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert(payload);
        if (error) throw error;
      }
      setShowModal(false);
      loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('services').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    loadServices();
  }

  async function toggleActive(s: Service) {
    await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id);
    loadServices();
  }

  const filtered = services.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: filtered.filter((s) => s.category === cat.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> Add Service
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800">
        <span className="font-medium text-gray-900 dark:text-white">{services.length}</span> total services
        <span className="font-medium text-green-600 dark:text-green-400">{services.filter((s) => s.is_active).length}</span> active
        <span className="font-medium text-gray-500">{services.filter((s) => !s.is_active).length}</span> inactive
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Package size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No services found</p>
          <button onClick={openCreate} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline">Add your first service</button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.value}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${catColors[group.value]}`}>{group.label}</span>
                <span className="text-xs text-gray-400">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.items.map((service) => (
                  <div key={service.id} className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 transition-shadow hover:shadow-md ${service.is_active ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800/50 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{service.name}</h3>
                        {service.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{service.description}</p>}
                      </div>
                      <button onClick={() => toggleActive(service)} className="ml-2 flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors">
                        {service.is_active ? <ToggleRight size={22} className="text-blue-500" /> : <ToggleLeft size={22} />}
                      </button>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(service.price)}</p>
                        <p className="text-xs text-gray-400">per {service.unit}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(service)} className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(service)} className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editService ? 'Edit Service' : 'Add Service'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard Electricity 900W" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Describe the service..." className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (IDR) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" min="0" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible in marketplace)</span>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving && <LoadingSpinner size="sm" />}
              {editService ? 'Save Changes' : 'Add Service'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="Delete Service" message={`Delete "${deleteTarget?.name}"? Orders referencing this service may be affected.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

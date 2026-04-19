import { useEffect, useState } from 'react';
import { ShoppingBag, Search, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, generateInvoiceNumber, getCategoryLabel } from '../lib/utils';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Service, Booth, Event, ServiceCategory } from '../lib/types';

const catColors: Record<string, string> = {
  electricity: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  internet: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  booth_support: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  furniture: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  av_equipment: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const catBg: Record<string, string> = {
  electricity: 'from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10',
  internet: 'from-blue-50 to-sky-50 dark:from-blue-900/10 dark:to-sky-900/10',
  booth_support: 'from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10',
  furniture: 'from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10',
  av_equipment: 'from-cyan-50 to-teal-50 dark:from-cyan-900/10 dark:to-teal-900/10',
  general: 'from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50',
};

export default function MarketplacePage() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [orderService, setOrderService] = useState<Service | null>(null);
  const [form, setForm] = useState({ booth_id: '', quantity: '1', notes: '' });
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const categories = Array.from(new Set(services.map((s) => s.category))) as ServiceCategory[];

  useEffect(() => { loadAll(); }, [profile]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadServices(), loadBooths()]);
    setLoading(false);
  }

  async function loadServices() {
    const { data } = await supabase.from('services').select('*').eq('is_active', true).order('category').order('name');
    setServices((data as Service[]) ?? []);
  }

  async function loadBooths() {
    const { data } = await supabase
      .from('booths')
      .select('*, hall:halls(id, name, event:events(id, name))')
      .eq('exhibitor_id', profile!.id);
    setBooths((data as Booth[]) ?? []);
  }

  async function placeOrder() {
    if (!orderService || !form.booth_id) { setError('Please select a booth.'); return; }
    const qty = parseInt(form.quantity) || 1;
    const total = orderService.price * qty;
    setPlacing(true); setError('');
    try {
      const booth = booths.find((b) => b.id === form.booth_id);
      const { error: orderErr } = await supabase.from('orders').insert({
        invoice_number: generateInvoiceNumber(),
        event_id: (booth?.hall as unknown as { event: Event })?.event?.id ?? null,
        booth_id: form.booth_id,
        exhibitor_id: profile!.id,
        service_id: orderService.id,
        quantity: qty,
        unit_price: orderService.price,
        total_price: total,
        notes: form.notes,
        status: 'pending_payment',
      });
      if (orderErr) throw orderErr;
      setSuccess(`Order placed! Invoice will be generated. Proceed to Payments to upload proof.`);
      setOrderService(null);
      setForm({ booth_id: '', quantity: '1', notes: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  const filtered = services.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-5">
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Order Placed Successfully!</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>All</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <ShoppingBag size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No services available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((service) => (
            <div key={service.id} className={`bg-gradient-to-br ${catBg[service.category]} rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColors[service.category]}`}>
                  {getCategoryLabel(service.category)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{service.name}</h3>
              {service.description && <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 mb-3 line-clamp-3">{service.description}</p>}
              <div className="mt-auto">
                <div className="mb-3">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(service.price)}</p>
                  <p className="text-xs text-gray-400">per {service.unit}</p>
                </div>
                <button
                  onClick={() => { setOrderService(service); setForm({ booth_id: booths[0]?.id ?? '', quantity: '1', notes: '' }); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  <Plus size={14} /> Order Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!orderService} onClose={() => setOrderService(null)} title="Place Order" size="sm">
        {orderService && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{orderService.name}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-bold mt-0.5">{formatCurrency(orderService.price)} / {orderService.unit}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Booth *</label>
              <select value={form.booth_id} onChange={(e) => setForm({ ...form, booth_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select your booth...</option>
                {booths.map((b) => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
              </select>
              {booths.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No booth assigned. Contact your organizer.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(orderService.price * (parseInt(form.quantity) || 1))}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Special requirements..." className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setOrderService(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
              <button onClick={placeOrder} disabled={placing || booths.length === 0} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">
                {placing && <LoadingSpinner size="sm" />} Place Order
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

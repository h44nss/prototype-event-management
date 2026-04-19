import { useEffect, useState, useRef } from 'react';
import { Plus, Search, AlertCircle, CheckCircle, XCircle, ExternalLink, Zap, Upload, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../lib/utils';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Payment, Order, Service, Profile } from '../lib/types';

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Credit Card', 'QRIS', 'Virtual Account'];

async function autoDispatchContractor(orderId: string, serviceId: string, assignedBy: string): Promise<string | null> {
  const { data: contractorServices } = await supabase
    .from('contractors_services')
    .select('contractor_id')
    .eq('service_id', serviceId);

  if (!contractorServices || contractorServices.length === 0) return null;
  const contractorIds = contractorServices.map((cs) => cs.contractor_id as string);

  const { data: activeAssignments } = await supabase
    .from('assignments')
    .select('contractor_id')
    .in('contractor_id', contractorIds)
    .not('order_id', 'is', null);

  const counts: Record<string, number> = {};
  contractorIds.forEach((id) => (counts[id] = 0));
  (activeAssignments ?? []).forEach((a) => {
    if (a.contractor_id) counts[a.contractor_id] = (counts[a.contractor_id] ?? 0) + 1;
  });

  const bestContractorId = contractorIds.reduce((best, id) => (counts[id] < counts[best] ? id : best), contractorIds[0]);

  const { error: assignErr } = await supabase.from('assignments').insert({
    order_id: orderId,
    contractor_id: bestContractorId,
    assigned_by: assignedBy,
    notes: 'Auto-dispatched after payment verification',
  });
  if (assignErr) return null;

  await supabase.from('work_logs').insert({
    order_id: orderId,
    status: 'waiting',
    notes: 'Job created, awaiting contractor pickup',
    updated_by: assignedBy,
  });

  await supabase.from('notifications').insert({
    user_id: bestContractorId,
    title: 'New Job Assigned',
    message: `You have been assigned a new service job. Please check your job list.`,
    type: 'info',
    related_id: orderId,
  });

  return bestContractorId;
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [reviewPayment, setReviewPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({ order_id: '', payment_method: 'Bank Transfer' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dispatchResult, setDispatchResult] = useState('');

  const isExhibitor = profile?.role === 'exhibitor';
  const canReview = profile?.role === 'eo_admin' || profile?.role === 'super_admin';

  useEffect(() => { loadPayments(); if (isExhibitor) loadPendingOrders(); }, [profile]);

  async function loadPayments() {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, order:orders(id, invoice_number, total_price, status, service_id, service:services(id, name), exhibitor:profiles!orders_exhibitor_id_fkey(id, name))')
      .order('created_at', { ascending: false });
    setPayments((data as Payment[]) ?? []);
    setLoading(false);
  }

  async function loadPendingOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(id, name)')
      .eq('exhibitor_id', profile!.id)
      .eq('status', 'pending_payment');
    setPendingOrders((data as Order[]) ?? []);
  }

  function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!form.order_id || !form.payment_method) { setError('Order and payment method are required.'); return; }
    setSaving(true); setError('');
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split('.').pop();
        const path = `payment-proofs/${form.order_id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, proofFile);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
          proofUrl = urlData.publicUrl;
        }
      }
      const { error: payErr } = await supabase.from('payments').insert({
        order_id: form.order_id,
        payment_method: form.payment_method,
        proof_url: proofUrl,
        status: 'pending_verification',
      });
      if (payErr) throw payErr;
      setShowModal(false);
      setForm({ order_id: '', payment_method: 'Bank Transfer' });
      setProofFile(null);
      setProofPreview(null);
      loadPayments();
      loadPendingOrders();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit payment');
    } finally { setSaving(false); }
  }

  async function handleReview(status: 'approved' | 'rejected') {
    if (!reviewPayment) return;
    setSaving(true);
    try {
      await supabase.from('payments').update({ status, notes: reviewNotes, verified_by: profile!.id, updated_at: new Date().toISOString() }).eq('id', reviewPayment.id);

      if (status === 'approved' && reviewPayment.order_id) {
        const order = reviewPayment.order as unknown as Order;
        const serviceId = order?.service_id ?? (order?.service as unknown as Service)?.id;
        await supabase.from('orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', reviewPayment.order_id);

        if (serviceId) {
          const contractorId = await autoDispatchContractor(reviewPayment.order_id, serviceId, profile!.id);
          if (contractorId) {
            await supabase.from('orders').update({ status: 'assigned', updated_at: new Date().toISOString() }).eq('id', reviewPayment.order_id);
            setDispatchResult('Payment approved and contractor auto-dispatched!');
          } else {
            setDispatchResult('Payment approved. No contractor available for this service — please assign manually.');
          }
        }
      } else if (status === 'rejected' && reviewPayment.order_id) {
        await supabase.from('orders').update({ status: 'pending_payment', updated_at: new Date().toISOString() }).eq('id', reviewPayment.order_id);
      }

      setReviewPayment(null);
      setReviewNotes('');
      loadPayments();
    } finally { setSaving(false); }
  }

  const filtered = payments.filter((p) => {
    const order = p.order as unknown as Order;
    const matchSearch =
      order?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.payment_method.toLowerCase().includes(search.toLowerCase()) ||
      (order?.exhibitor as unknown as Profile)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-5">
      {dispatchResult && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Zap size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">{dispatchResult}</p>
          <button onClick={() => setDispatchResult('')} className="ml-auto text-blue-400 text-lg leading-none">&times;</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payments..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {['all', 'pending_verification', 'approved', 'rejected'].map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        {isExhibitor && (
          <button onClick={() => { setShowModal(true); setError(''); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            <Plus size={16} /> Upload Payment
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Invoice', 'Service', canReview ? 'Exhibitor' : null, 'Method', 'Amount', 'Proof', 'Date', 'Status', canReview ? 'Actions' : null].filter(Boolean).map((h) => (
                    <th key={h!} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((payment) => {
                  const order = payment.order as unknown as Order;
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{order?.invoice_number ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[130px] truncate">{(order?.service as unknown as Service)?.name ?? '-'}</td>
                      {canReview && <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{(order?.exhibitor as unknown as Profile)?.name ?? '-'}</td>}
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{payment.payment_method}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatCurrency(order?.total_price ?? null)}</td>
                      <td className="px-4 py-3">
                        {payment.proof_url ? (
                          <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
                            <ExternalLink size={12} /> View
                          </a>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatDateTime(payment.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={payment.status} size="sm" /></td>
                      {canReview && (
                        <td className="px-4 py-3">
                          {payment.status === 'pending_verification' && (
                            <button onClick={() => { setReviewPayment(payment); setReviewNotes(''); }} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                              Review
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Upload Payment Proof">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Order *</label>
            <select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select order...</option>
              {pendingOrders.map((o) => <option key={o.id} value={o.id}>{o.invoice_number} — {(o.service as unknown as Service)?.name} ({formatCurrency(o.total_price)})</option>)}
            </select>
            {pendingOrders.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No pending orders. Place an order in the Marketplace first.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Payment Method *</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="flex items-center gap-1.5"><Image size={14} /> Payment Proof *</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleProofChange}
              className="hidden"
            />
            {proofPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={proofPreview} alt="Payment proof" className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-800" />
                <button
                  type="button"
                  onClick={() => { setProofFile(null); setProofPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-900 rounded-full shadow text-gray-600 hover:text-red-600 transition-colors"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <Upload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload proof of payment</span>
                <span className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</span>
              </button>
            )}
            {!proofFile && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Upload required before submitting.</p>}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl flex items-center justify-center gap-2">
              {saving && <LoadingSpinner size="sm" />} Submit
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewPayment} onClose={() => setReviewPayment(null)} title="Review Payment">
        {reviewPayment && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-500 uppercase tracking-wide">Invoice</p><p className="font-medium text-gray-900 dark:text-white">{(reviewPayment.order as unknown as Order)?.invoice_number}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p><p className="font-medium text-gray-900 dark:text-white">{formatCurrency((reviewPayment.order as unknown as Order)?.total_price)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wide">Method</p><p className="font-medium text-gray-900 dark:text-white">{reviewPayment.payment_method}</p></div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Proof</p>
                  {reviewPayment.proof_url ? <a href={reviewPayment.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 flex items-center gap-1"><ExternalLink size={12} /> View</a> : <p className="text-sm text-gray-400">None</p>}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-start gap-2">
              <Zap size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">Approving will automatically dispatch an available contractor for this service.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Review Notes</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} placeholder="Add review notes..." className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setReviewPayment(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
              <button onClick={() => handleReview('rejected')} disabled={saving} className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-xl">
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => handleReview('approved')} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl">
                {saving && <LoadingSpinner size="sm" />}
                <CheckCircle size={15} /> Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

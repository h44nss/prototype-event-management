import { useEffect, useState, useRef } from 'react';
import { Globe, Image, Plus, Trash2, Save, ExternalLink, Package, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import type { Showcase, ShowcaseProduct, Event, Booth } from '../lib/types';

interface EventParticipantRow {
  event_id: string;
  booth_id: string | null;
  event: Event;
  booth: Booth | null;
}

export default function ShowcasePage() {
  const { profile } = useAuth();
  const [participantEvents, setParticipantEvents] = useState<EventParticipantRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    description: '',
    website_url: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [keyVisualFile, setKeyVisualFile] = useState<File | null>(null);
  const [keyVisualPreview, setKeyVisualPreview] = useState<string | null>(null);

  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<ShowcaseProduct>({ id: '', name: '', description: '', image_url: '', price: null });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

  const logoRef = useRef<HTMLInputElement>(null);
  const keyVisualRef = useRef<HTMLInputElement>(null);
  const productImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadParticipantEvents(); }, [profile]);
  useEffect(() => { if (selectedEventId) loadShowcase(); }, [selectedEventId]);

  async function loadParticipantEvents() {
    setLoading(true);
    const { data } = await supabase
      .from('event_participants')
      .select('event_id, booth_id, event:events(id, name, status), booth:booths(id, number)')
      .eq('exhibitor_id', profile!.id)
      .order('created_at', { ascending: false });
    const rows = (data as EventParticipantRow[]) ?? [];
    setParticipantEvents(rows);
    if (rows.length > 0) setSelectedEventId(rows[0].event_id);
    setLoading(false);
  }

  async function loadShowcase() {
    const { data } = await supabase
      .from('showcase')
      .select('*')
      .eq('exhibitor_id', profile!.id)
      .eq('event_id', selectedEventId)
      .maybeSingle();

    if (data) {
      const s = data as unknown as Showcase;
      setShowcase(s);
      setForm({ description: s.description ?? '', website_url: s.website_url ?? '' });
      setLogoPreview(s.logo_url ?? null);
      setKeyVisualPreview(s.key_visual_url ?? null);
      setProducts(s.products ?? []);
    } else {
      setShowcase(null);
      setForm({ description: '', website_url: '' });
      setLogoPreview(null);
      setKeyVisualPreview(null);
      setProducts([]);
    }
  }

  async function uploadImage(file: File, path: string): Promise<string | null> {
    const ext = file.name.split('.').pop();
    const fullPath = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('showcase-assets').upload(fullPath, file, { upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('showcase-assets').getPublicUrl(fullPath);
    return urlData.publicUrl;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ep = participantEvents.find((p) => p.event_id === selectedEventId);
      let logoUrl = showcase?.logo_url ?? null;
      let keyVisualUrl = showcase?.key_visual_url ?? null;

      if (logoFile) logoUrl = await uploadImage(logoFile, `logos/${profile!.id}`);
      if (keyVisualFile) keyVisualUrl = await uploadImage(keyVisualFile, `key-visuals/${profile!.id}`);

      const payload = {
        exhibitor_id: profile!.id,
        event_id: selectedEventId,
        booth_id: ep?.booth_id ?? null,
        description: form.description,
        website_url: form.website_url,
        logo_url: logoUrl,
        key_visual_url: keyVisualUrl,
        products: products as any,
        updated_at: new Date().toISOString(),
      };

      if (showcase) {
        await supabase.from('showcase').update(payload).eq('id', showcase.id);
      } else {
        await supabase.from('showcase').insert(payload);
      }

      setLogoFile(null);
      setKeyVisualFile(null);
      await loadShowcase();
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(file: File | null, setFile: (f: File | null) => void, setPreview: (s: string | null) => void) {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function openAddProduct() {
    if (products.length >= 3) return;
    setProductForm({ id: crypto.randomUUID(), name: '', description: '', image_url: '', price: null });
    setProductImageFile(null);
    setProductImagePreview(null);
    setShowProductModal(true);
  }

  async function saveProduct() {
    let imageUrl = productForm.image_url;
    if (productImageFile) {
      const url = await uploadImage(productImageFile, `products/${profile!.id}`);
      if (url) imageUrl = url;
    }
    const updated = products.find((p) => p.id === productForm.id)
      ? products.map((p) => p.id === productForm.id ? { ...productForm, image_url: imageUrl } : p)
      : [...products, { ...productForm, image_url: imageUrl }];
    setProducts(updated);
    setShowProductModal(false);
  }

  function removeProduct(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function editProduct(product: ShowcaseProduct) {
    setProductForm(product);
    setProductImagePreview(product.image_url || null);
    setProductImageFile(null);
    setShowProductModal(true);
  }

  const selectedEvent = participantEvents.find((p) => p.event_id === selectedEventId);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  if (participantEvents.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 mx-6 mt-6">
        <Package size={40} className="text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">You are not assigned to any events yet.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Contact your event organizer to get access.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Event selector */}
      {participantEvents.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Event</label>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {participantEvents.map((p) => (
              <option key={p.event_id} value={p.event_id}>{(p.event as unknown as { name: string })?.name ?? p.event_id}{p.booth_id ? ` — Booth #${(p.booth as unknown as { number: string })?.number}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {selectedEventId && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Digital Showcase</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(selectedEvent?.event as unknown as { name: string })?.name}
                {selectedEvent?.booth_id && ` — Booth #${(selectedEvent?.booth as unknown as { number: string })?.number}`}
              </p>
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors">
              {saving ? <LoadingSpinner size="sm" /> : <Save size={14} />}Save Showcase
            </button>
          </div>

          {/* Logo + Key Visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Company Logo</p>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, setLogoFile, setLogoPreview)} />
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="w-full h-32 object-contain bg-gray-50 dark:bg-gray-800 rounded-xl" />
                  <button onClick={() => logoRef.current?.click()} className="mt-2 w-full text-xs text-blue-600 dark:text-blue-400 hover:underline">Change</button>
                </div>
              ) : (
                <button onClick={() => logoRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                  <Image size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Upload logo</span>
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Key Visual</p>
              <input ref={keyVisualRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, setKeyVisualFile, setKeyVisualPreview)} />
              {keyVisualPreview ? (
                <div className="relative">
                  <img src={keyVisualPreview} alt="Key Visual" className="w-full h-32 object-cover bg-gray-50 dark:bg-gray-800 rounded-xl" />
                  <button onClick={() => keyVisualRef.current?.click()} className="mt-2 w-full text-xs text-blue-600 dark:text-blue-400 hover:underline">Change</button>
                </div>
              ) : (
                <button onClick={() => keyVisualRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Upload key visual</span>
                </button>
              )}
            </div>
          </div>

          {/* Description + Website */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Company Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your company, products, and what you offer..." className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5"><Globe size={13} />Website URL</label>
              <input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://yourcompany.com" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Products</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Max 3 products</p>
              </div>
              <button onClick={openAddProduct} disabled={products.length >= 3} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-xl transition-colors">
                <Plus size={14} /> Add Product
              </button>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <Package size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400">No products added yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden group relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-28 object-cover bg-gray-50 dark:bg-gray-800" />
                    ) : (
                      <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Package size={24} className="text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                      {product.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{product.description}</p>}
                    </div>
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      <button onClick={() => editProduct(product)} className="p-1 bg-white dark:bg-gray-900 rounded-full shadow text-gray-600 hover:text-blue-600"><ExternalLink size={12} /></button>
                      <button onClick={() => removeProduct(product.id)} className="p-1 bg-white dark:bg-gray-900 rounded-full shadow text-gray-600 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Product Modal */}
      <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title={products.find((p) => p.id === productForm.id) ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Image</label>
            <input ref={productImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, setProductImageFile, setProductImagePreview)} />
            {productImagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={productImagePreview} alt="Product" className="w-full h-36 object-cover bg-gray-100 dark:bg-gray-800" />
                <button onClick={() => productImageRef.current?.click()} className="absolute bottom-2 right-2 px-2 py-1 bg-white dark:bg-gray-900 rounded-lg shadow text-xs text-gray-600 hover:text-blue-600">Change</button>
              </div>
            ) : (
              <button onClick={() => productImageRef.current?.click()} className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                <Image size={20} className="text-gray-400" />
                <span className="text-xs text-gray-500">Upload product image</span>
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name *</label>
            <input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Smart Display Unit" className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowProductModal(false)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
            <button onClick={saveProduct} disabled={!productForm.name} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl">Save Product</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

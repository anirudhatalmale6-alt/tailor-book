'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { addProjectItem, updateProjectItem, useProjectItem } from '@/hooks/useProjects';
import { useMeasurementFields, addMeasurementField } from '@/hooks/useMeasurements';
import { fileToBase64 } from '@/lib/utils';

export default function NewProjectItemPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div></div>}>
      <NewProjectItemForm />
    </Suspense>
  );
}

function NewProjectItemForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const editId = searchParams.get('edit');
  const existingItem = useProjectItem(editId || '');
  const measurementFields = useMeasurementFields();
  const isEdit = !!editId;

  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState<'inches' | 'cm'>('inches');
  const [form, setForm] = useState({
    name: '',
    fabricType: '',
    styleDescription: '',
    styleImages: [] as string[],
    price: '',
    deliveryDate: '',
    status: 'pending' as 'pending' | 'in_progress' | 'ready' | 'delivered',
    notes: '',
  });
  const [measurements, setMeasurements] = useState<Record<string, string | number>>({});

  // Load existing item for editing
  useEffect(() => {
    if (existingItem) {
      setForm({
        name: existingItem.name,
        fabricType: existingItem.fabricType,
        styleDescription: existingItem.styleDescription,
        styleImages: existingItem.styleImages || [],
        price: existingItem.price ? existingItem.price.toString() : '',
        deliveryDate: existingItem.deliveryDate,
        status: existingItem.status,
        notes: existingItem.notes,
      });
      if (existingItem.measurements) {
        setMeasurements(existingItem.measurements);
      }
    }
  }, [existingItem]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleMeasurementChange(fieldName: string, value: string) {
    setMeasurements((prev) => ({ ...prev, [fieldName]: value }));
  }

  async function handleStyleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const images: string[] = [...form.styleImages];
    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      images.push(base64);
    }
    setForm((prev) => ({ ...prev, styleImages: images }));
  }

  function removeStyleImage(index: number) {
    setForm((prev) => ({
      ...prev,
      styleImages: prev.styleImages.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert('Please enter the sub-client name');
      return;
    }

    setSaving(true);
    try {
      // Filter out empty measurements
      const filteredMeasurements: Record<string, string | number> = {};
      Object.entries(measurements).forEach(([key, val]) => {
        if (val !== '' && val !== 0) {
          filteredMeasurements[key] = val;
        }
      });

      const data = {
        projectId,
        name: form.name.trim(),
        measurements: filteredMeasurements,
        fabricType: form.fabricType,
        styleDescription: form.styleDescription,
        styleImages: form.styleImages,
        price: form.price ? parseFloat(form.price) : 0,
        status: form.status,
        deliveryDate: form.deliveryDate,
        notes: form.notes,
      };

      if (isEdit && editId) {
        await updateProjectItem(editId, data);
      } else {
        await addProjectItem(data);
      }

      router.back();
    } catch (err) {
      console.error('Failed to save sub-client:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFieldInline() {
    if (!newFieldName.trim()) return;
    const maxSort = measurementFields
      ? Math.max(0, ...measurementFields.map((f) => f.sortOrder))
      : 0;
    await addMeasurementField({
      name: newFieldName.trim(),
      unit: newFieldUnit,
      category: 'Custom',
      sortOrder: maxSort + 1,
    });
    setNewFieldName('');
    setShowAddField(false);
  }

  // Group measurement fields by category
  const groupedFields = measurementFields
    ? measurementFields.reduce<Record<string, typeof measurementFields>>((groups, field) => {
        const cat = field.category || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(field);
        return groups;
      }, {})
    : {};

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-royal-light">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">
          {isEdit ? 'Edit Sub-Client' : 'Add Sub-Client'}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Name / Alias *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="e.g., Bestman - Chidi"
          />
        </div>

        {/* Measurements Section */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Measurements</label>
          <div className="bg-royal-card rounded-xl border border-royal-border p-3 space-y-3">
            {measurementFields && measurementFields.length > 0 && (
              <>
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-royal-light uppercase tracking-wide mb-2">{category}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {fields.map((field) => (
                        <div key={field.id}>
                          <label className="block text-xs text-royal-light mb-0.5">
                            {field.name} ({field.unit})
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={measurements[field.name] ?? ''}
                            onChange={(e) => handleMeasurementChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Inline Add New Measurement Field */}
            {showAddField ? (
              <div className="border-t border-royal-border pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Field name (e.g., Thigh)"
                    autoFocus
                  />
                  <select
                    value={newFieldUnit}
                    onChange={(e) => setNewFieldUnit(e.target.value as 'inches' | 'cm')}
                    className="px-2 py-2 bg-royal-bg rounded-lg border border-royal-border text-sm text-white"
                  >
                    <option value="inches">in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddFieldInline}
                    className="flex-1 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-xs font-medium"
                  >
                    Add Field
                  </button>
                  <button
                    onClick={() => { setShowAddField(false); setNewFieldName(''); }}
                    className="py-2 px-3 bg-royal-hover text-royal-light rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddField(true)}
                className="w-full py-2 border border-dashed border-indigo-300 text-gold rounded-lg text-xs font-medium hover:bg-gold-bg transition-colors"
              >
                + Add New Measurement Field
              </button>
            )}
          </div>
        </div>

        {/* Fabric Type */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Fabric Type</label>
          <input
            type="text"
            value={form.fabricType}
            onChange={(e) => handleChange('fabricType', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="e.g., Senator, Ankara, Lace..."
          />
        </div>

        {/* Style Description */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Style Description</label>
          <textarea
            value={form.styleDescription}
            onChange={(e) => handleChange('styleDescription', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={3}
            placeholder="Describe the style, design details..."
          />
        </div>

        {/* Style Images */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Style Reference Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.styleImages.map((img, i) => (
              <div key={i} className="relative w-20 h-20">
                <img src={img} alt={`Style ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => removeStyleImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center text-xs"
                >
                  X
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-royal-hover rounded-lg text-sm text-royal-light cursor-pointer hover:bg-gray-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Images
            <input type="file" accept="image/*" multiple onChange={handleStyleImages} className="hidden" />
          </label>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Price</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="0"
          />
        </div>

        {/* Delivery Date */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Delivery Date</label>
          <input
            type="date"
            value={form.deliveryDate}
            onChange={(e) => handleChange('deliveryDate', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {(['pending', 'in_progress', 'ready', 'delivered'] as const).map((s) => {
              const labels: Record<string, string> = {
                pending: 'Pending',
                in_progress: 'In Progress',
                ready: 'Ready',
                delivered: 'Delivered',
              };
              const colors: Record<string, string> = {
                pending: form.status === s ? 'bg-yellow-400/10 border-yellow-300 text-yellow-400' : '',
                in_progress: form.status === s ? 'bg-blue-400/10 border-blue-300 text-blue-400' : '',
                ready: form.status === s ? 'bg-green-400/10 border-green-300 text-green-400' : '',
                delivered: form.status === s ? 'bg-royal-hover border-gray-400 text-gray-200' : '',
              };
              return (
                <button
                  key={s}
                  onClick={() => setForm((p) => ({ ...p, status: s }))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    form.status === s ? colors[s] : 'bg-royal-card border-royal-border text-royal-light'
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="w-full px-4 py-3 bg-royal-card rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="Additional notes..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Sub-Client' : 'Add Sub-Client'}
        </button>
      </div>
    </div>
  );
}

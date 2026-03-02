'use client';

import { useState, useRef } from 'react';
import {
  useMeasurementFields,
  addMeasurementField,
  updateMeasurementField,
  deleteMeasurementField,
} from '@/hooks/useMeasurements';
import { useBusinessName, useCurrency, useTaxRate, setSetting } from '@/hooks/useSettings';
import { db, type MeasurementField } from '@/lib/db';
import Modal from '@/components/Modal';

export default function SettingsPage() {
  const fields = useMeasurementFields();
  const businessName = useBusinessName();
  const currency = useCurrency();
  const taxRate = useTaxRate();

  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<MeasurementField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    unit: 'inches' as 'inches' | 'cm',
    category: 'General',
  });
  const [saving, setSaving] = useState(false);
  const [bizName, setBizName] = useState('');
  const [curr, setCurr] = useState('');
  const [tax, setTax] = useState('');
  const [bizNameInit, setBizNameInit] = useState(false);
  const [currInit, setCurrInit] = useState(false);
  const [taxInit, setTaxInit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (businessName && !bizNameInit) {
    setBizName(businessName);
    setBizNameInit(true);
  }
  if (currency && !currInit) {
    setCurr(currency);
    setCurrInit(true);
  }
  if (!taxInit && taxRate !== undefined) {
    setTax(taxRate.toString());
    setTaxInit(true);
  }

  function openAddField() {
    setEditingField(null);
    setFieldForm({ name: '', unit: 'inches', category: 'General' });
    setShowFieldModal(true);
  }

  function openEditField(field: MeasurementField) {
    setEditingField(field);
    setFieldForm({ name: field.name, unit: field.unit, category: field.category });
    setShowFieldModal(true);
  }

  async function handleSaveField() {
    if (!fieldForm.name.trim()) {
      alert('Please enter a field name');
      return;
    }
    setSaving(true);
    try {
      if (editingField) {
        await updateMeasurementField(editingField.id, {
          name: fieldForm.name,
          unit: fieldForm.unit,
          category: fieldForm.category,
        });
      } else {
        const maxSort = fields ? Math.max(0, ...fields.map((f) => f.sortOrder)) : 0;
        await addMeasurementField({
          name: fieldForm.name,
          unit: fieldForm.unit,
          category: fieldForm.category,
          sortOrder: maxSort + 1,
        });
      }
      setShowFieldModal(false);
    } catch (err) {
      console.error('Failed to save field:', err);
      alert('Failed to save field');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(field: MeasurementField) {
    if (confirm(`Delete "${field.name}" measurement field?`)) {
      await deleteMeasurementField(field.id);
    }
  }

  async function handleMoveField(field: MeasurementField, direction: 'up' | 'down') {
    if (!fields) return;
    const idx = fields.findIndex((f) => f.id === field.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;
    const other = fields[swapIdx];
    await updateMeasurementField(field.id, { sortOrder: other.sortOrder });
    await updateMeasurementField(other.id, { sortOrder: field.sortOrder });
  }

  async function handleSaveBusinessName() {
    await setSetting('businessName', bizName);
    alert('Business name saved');
  }

  async function handleSaveCurrency() {
    await setSetting('currency', curr);
    alert('Currency saved');
  }

  async function handleSaveTaxRate() {
    const rate = parseFloat(tax) || 0;
    await setSetting('taxRate', rate.toString());
    alert('Tax rate saved');
  }

  async function handleExport() {
    try {
      const data = {
        customers: await db.customers.toArray(),
        measurementFields: await db.measurementFields.toArray(),
        measurements: await db.measurements.toArray(),
        orders: await db.orders.toArray(),
        payments: await db.payments.toArray(),
        expenses: await db.expenses.toArray(),
        invoices: await db.invoices.toArray(),
        settings: await db.settings.toArray(),
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailorbook-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.customers) {
        alert('Invalid backup file');
        return;
      }
      if (!confirm('This will replace ALL your current data. Are you sure?')) return;

      await db.customers.clear();
      await db.measurementFields.clear();
      await db.measurements.clear();
      await db.orders.clear();
      await db.payments.clear();
      await db.expenses.clear();
      await db.invoices.clear();
      await db.settings.clear();

      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.measurementFields?.length) await db.measurementFields.bulkAdd(data.measurementFields);
      if (data.measurements?.length) await db.measurements.bulkAdd(data.measurements);
      if (data.orders?.length) await db.orders.bulkAdd(data.orders);
      if (data.payments?.length) await db.payments.bulkAdd(data.payments);
      if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
      if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);

      alert('Data imported successfully! The page will reload.');
      window.location.reload();
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import data. Make sure the file is a valid TailorBook backup.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const categories = fields
    ? Array.from(new Set(fields.map((f) => f.category)))
    : ['Upper Body', 'Lower Body', 'General'];

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>

      {/* Business Settings */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Business</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Business Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your business name"
              />
              <button
                onClick={handleSaveBusinessName}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Default Currency</label>
            <div className="flex gap-2">
              <select
                value={curr}
                onChange={(e) => setCurr(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GHS">GHS - Ghanaian Cedi</option>
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="ZAR">ZAR - South African Rand</option>
                <option value="XOF">XOF - CFA Franc</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
              <button
                onClick={handleSaveCurrency}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tax Rate (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
                min="0"
                max="100"
                step="0.1"
              />
              <button
                onClick={handleSaveTaxRate}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Applied to invoices. Set to 0 for no tax.</p>
          </div>
        </div>
      </div>

      {/* Measurement Fields Manager */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Measurement Fields</h2>
          <button
            onClick={openAddField}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
          >
            + Add Field
          </button>
        </div>

        {fields === undefined ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveField(field, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveField(field, 'down')}
                    disabled={idx === fields.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{field.name}</p>
                  <p className="text-[10px] text-gray-400">{field.category} - {field.unit}</p>
                </div>
                <button
                  onClick={() => openEditField(field)}
                  className="p-1 text-gray-400 hover:text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteField(field)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Data Management</h2>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data (JSON)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Data (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* App Info */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">TailorBook v1.0</p>
        <p className="text-xs text-gray-400">All data stored locally on your device</p>
      </div>

      {/* Measurement Field Modal */}
      <Modal
        isOpen={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        title={editingField ? 'Edit Measurement Field' : 'Add Measurement Field'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
            <input
              type="text"
              value={fieldForm.name}
              onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Thigh, Wrist..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <div className="flex gap-2">
              {(['inches', 'cm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setFieldForm((p) => ({ ...p, unit: u }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    fieldForm.unit === u
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={fieldForm.category}
              onChange={(e) => setFieldForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Upper Body">Upper Body</option>
              <option value="Lower Body">Lower Body</option>
              <option value="General">General</option>
            </select>
          </div>
          <button
            onClick={handleSaveField}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : editingField ? 'Update Field' : 'Add Field'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, type Customer } from '@/lib/db';
import { addProject, updateProject, useProject } from '@/hooks/useProjects';

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <NewProjectForm />
    </Suspense>
  );
}

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const preselectedCustomerId = searchParams.get('customerId');
  const existingProject = useProject(editId || '');
  const isEdit = !!editId;

  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [form, setForm] = useState({
    name: '',
    notes: '',
    status: 'active' as 'active' | 'completed' | 'cancelled',
  });

  useEffect(() => {
    db.customers.orderBy('name').toArray().then(setCustomers);
  }, []);

  // Pre-select customer if customerId passed
  useEffect(() => {
    if (preselectedCustomerId && customers.length > 0 && !isEdit) {
      const c = customers.find((c) => c.id === preselectedCustomerId);
      if (c) {
        setSelectedCustomer(c);
        setCustomerSearch(c.name);
      }
    }
  }, [preselectedCustomerId, customers, isEdit]);

  // Load existing project for editing
  useEffect(() => {
    if (existingProject && customers.length > 0) {
      setForm({
        name: existingProject.name,
        notes: existingProject.notes,
        status: existingProject.status,
      });
      const c = customers.find((c) => c.id === existingProject.customerId);
      if (c) {
        setSelectedCustomer(c);
        setCustomerSearch(c.name);
      }
    }
  }, [existingProject, customers]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  async function handleSave() {
    if (!selectedCustomer) {
      alert('Please select a client');
      return;
    }
    if (!form.name.trim()) {
      alert('Please enter a project name');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && editId) {
        await updateProject(editId, {
          name: form.name.trim(),
          customerId: selectedCustomer.id,
          notes: form.notes,
          status: form.status,
        });
        router.replace(`/projects/${editId}`);
      } else {
        const id = await addProject({
          name: form.name.trim(),
          customerId: selectedCustomer.id,
          notes: form.notes,
          status: form.status,
        });
        router.replace(`/projects/${id}`);
      }
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Edit Project' : 'New Project'}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Ade's Wedding Party"
          />
        </div>

        {/* Client Selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setShowCustomerDropdown(true);
              if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                setSelectedCustomer(null);
              }
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            className={`w-full px-4 py-3 bg-white rounded-xl border text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              selectedCustomer ? 'border-green-300' : 'border-gray-200'
            }`}
            placeholder="Search client..."
          />
          {showCustomerDropdown && !selectedCustomer && customerSearch && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch(c.name);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-900"
                  >
                    {c.name} {c.phone ? `- ${c.phone}` : ''}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No clients found</div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <div className="flex gap-2">
            {(['active', 'completed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setForm((p) => ({ ...p, status: s }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  form.status === s
                    ? s === 'active'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : s === 'completed'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {s === 'active' ? 'Active' : s === 'completed' ? 'Completed' : 'Cancelled'}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={3}
            placeholder="Any notes about this project..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

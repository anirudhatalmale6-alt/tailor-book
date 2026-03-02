'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject, useProjectItems, useProjectExpenses, deleteProject, deleteProjectItem } from '@/hooks/useProjects';
import { addExpense } from '@/hooks/useExpenses';
import { useCustomer } from '@/hooks/useCustomers';
import { useCurrency } from '@/hooks/useSettings';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const items = useProjectItems(projectId);
  const expenses = useProjectExpenses(projectId);
  const customer = useCustomer(project?.customerId || '');
  const currency = useCurrency();

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteItemConfirm, setShowDeleteItemConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    projectItemId: '',
  });

  const totalPrice = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [items]);

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const completedCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((i) => i.status === 'delivered' || i.status === 'ready').length;
  }, [items]);

  function getProjectStatusColor(status: string) {
    switch (status) {
      case 'active': return getStatusColor('in_progress');
      case 'completed': return getStatusColor('delivered');
      case 'cancelled': return getStatusColor('cancelled');
      default: return getStatusColor('pending');
    }
  }

  async function handleAddExpense() {
    if (!expenseForm.description.trim() || !expenseForm.amount) {
      alert('Please fill in description and amount');
      return;
    }
    setSaving(true);
    try {
      await addExpense({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category || 'Project Materials',
        expenseType: 'sewing',
        projectId: projectId,
        projectItemId: expenseForm.projectItemId || undefined,
        date: expenseForm.date,
      });
      setShowExpenseModal(false);
      setExpenseForm({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        projectItemId: '',
      });
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('Failed to add expense');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    try {
      await deleteProject(projectId);
      router.replace('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deleteProjectItem(itemId);
      setShowDeleteItemConfirm(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item');
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = getProjectStatusColor(project.status);

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{project.name}</h1>
          <p className="text-sm text-gray-500">{customer?.name || 'Loading...'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
          {project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'Cancelled'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => router.push(`/projects/new?edit=${project.id}`)}
          className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Edit Project
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="py-2 px-4 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{project.notes}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Sub-Clients</p>
          <p className="text-lg font-bold text-gray-900">
            {completedCount}/{items?.length || 0}
            <span className="text-xs font-normal text-gray-400 ml-1">done</span>
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Total Price</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalPrice, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-400 mb-1">Net</p>
          <p className={`text-lg font-bold ${(totalPrice - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalPrice - totalExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Sub-Clients Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Sub-Clients</h2>
          <button
            onClick={() => router.push(`/projects/${projectId}/items/new`)}
            className="text-xs text-indigo-600 font-medium"
          >
            + Add Sub-Client
          </button>
        </div>

        {items === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No sub-clients yet"
            description="Add the people whose clothes you're making in this project"
            action={
              <button
                onClick={() => router.push(`/projects/${projectId}/items/new`)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium"
              >
                Add First Sub-Client
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isExpanded = expandedItem === item.id;
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full p-4 text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.fabricType && (
                            <span className="text-xs text-gray-400">{item.fabricType}</span>
                          )}
                          <span className="text-xs font-medium text-gray-900">
                            {formatCurrency(item.price || 0, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      {/* Measurements */}
                      {item.measurements && Object.keys(item.measurements).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Measurements</p>
                          <div className="grid grid-cols-2 gap-1">
                            {Object.entries(item.measurements).map(([key, val]) => (
                              <div key={key} className="flex justify-between text-xs py-0.5">
                                <span className="text-gray-500">{key}</span>
                                <span className="text-gray-900 font-medium">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Style Description */}
                      {item.styleDescription && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Style</p>
                          <p className="text-xs text-gray-700">{item.styleDescription}</p>
                        </div>
                      )}

                      {/* Style Images */}
                      {item.styleImages && item.styleImages.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Style Images</p>
                          <div className="flex gap-2 overflow-x-auto">
                            {item.styleImages.map((img, i) => (
                              <img key={i} src={img} alt={`Style ${i + 1}`} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Delivery Date */}
                      {item.deliveryDate && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-gray-500">Delivery:</span>
                          <span className="text-gray-900 font-medium">{formatDate(item.deliveryDate)}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                          <p className="text-xs text-gray-700">{item.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => router.push(`/projects/${projectId}/items/new?edit=${item.id}`)}
                          className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteItemConfirm(item.id)}
                          className="py-2 px-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">Sewing Expenses</h2>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="text-xs text-indigo-600 font-medium"
          >
            + Add Expense
          </button>
        </div>

        {expenses && expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-400">
                    {e.category || 'General'} &middot; {formatDate(e.date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  -{formatCurrency(e.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">No sewing expenses recorded for this project</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Add Sewing Expense"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Fabric purchase, Thread..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Fabric, Thread, Buttons..."
            />
          </div>
          {items && items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">For Sub-Client (optional)</label>
              <select
                value={expenseForm.projectItemId}
                onChange={(e) => setExpenseForm((p) => ({ ...p, projectItemId: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Whole project</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAddExpense}
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </Modal>

      {/* Delete Project Confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Project"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete &ldquo;{project.name}&rdquo;? This will also delete all sub-clients and linked expenses. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Item Confirmation */}
      <Modal
        isOpen={!!showDeleteItemConfirm}
        onClose={() => setShowDeleteItemConfirm(null)}
        title="Delete Sub-Client"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this sub-client? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteItemConfirm(null)}
              className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteItemConfirm && handleDeleteItem(showDeleteItemConfirm)}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProject, useProjectItems, useProjectExpenses, deleteProject, deleteProjectItem } from '@/hooks/useProjects';
import { addExpense } from '@/hooks/useExpenses';
import { useProjectInvoice } from '@/hooks/useInvoices';
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
  const existingInvoice = useProjectInvoice(projectId);

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
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = getProjectStatusColor(project.status);

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
          <p className="text-sm text-white">{customer?.name || 'Loading...'}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
          {project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'Cancelled'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => router.push(`/projects/new?edit=${project.id}`)}
          className="flex-1 py-2 bg-royal-card border border-royal-border text-white rounded-xl text-sm font-medium hover:bg-royal-hover transition-colors"
        >
          Edit Project
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="py-2 px-4 bg-royal-card border border-red-400/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-400/10 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Invoice Button */}
      <div className="mb-4">
        {existingInvoice ? (
          <button
            onClick={() => router.push(`/invoices/${existingInvoice.id}`)}
            className="w-full py-2.5 bg-green-400/10 border border-green-200 text-green-400 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Invoice ({existingInvoice.invoiceNumber})
          </button>
        ) : (
          <button
            onClick={() => router.push(`/invoices/new?projectId=${projectId}`)}
            className="w-full py-2.5 bg-gold-bg border border-indigo-200 text-gold-dim rounded-xl text-sm font-medium hover:bg-royal-hover transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Invoice
          </button>
        )}
      </div>

      {/* Notes */}
      {project.notes && (
        <div className="bg-royal-bg rounded-xl p-3 mb-4">
          <p className="text-xs text-white mb-1">Notes</p>
          <p className="text-sm text-white">{project.notes}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Sub-Clients</p>
          <p className="text-lg font-bold text-white">
            {completedCount}/{items?.length || 0}
            <span className="text-xs font-normal text-white/60 ml-1">done</span>
          </p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Total Price</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(totalPrice, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Total Expenses</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="bg-royal-card rounded-xl shadow-none p-3">
          <p className="text-xs text-white/60 mb-1">Net</p>
          <p className={`text-lg font-bold ${(totalPrice - totalExpenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(totalPrice - totalExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Sub-Clients Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Sub-Clients</h2>
          <button
            onClick={() => router.push(`/projects/${projectId}/items/new`)}
            className="text-xs text-gold font-medium"
          >
            + Add Sub-Client
          </button>
        </div>

        {items === undefined ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No sub-clients yet"
            description="Add the people whose clothes you're making in this project"
            action={
              <button
                onClick={() => router.push(`/projects/${projectId}/items/new`)}
                className="px-4 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl text-sm font-medium"
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
                <div key={item.id} className="bg-royal-card rounded-xl shadow-none overflow-hidden">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full p-4 text-left active:bg-royal-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.fabricType && (
                            <span className="text-xs text-white/60">{item.fabricType}</span>
                          )}
                          <span className="text-xs font-medium text-white">
                            {formatCurrency(item.price || 0, currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <svg
                          className={`w-4 h-4 text-white/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                    <div className="px-4 pb-4 border-t border-royal-border pt-3 space-y-3">
                      {/* Measurements */}
                      {item.measurements && Object.keys(item.measurements).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-white mb-1">Measurements</p>
                          <div className="grid grid-cols-2 gap-1">
                            {Object.entries(item.measurements).map(([key, val]) => (
                              <div key={key} className="flex justify-between text-xs py-0.5">
                                <span className="text-white">{key}</span>
                                <span className="text-white font-medium">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Style Description */}
                      {item.styleDescription && (
                        <div>
                          <p className="text-xs font-medium text-white mb-1">Style</p>
                          <p className="text-xs text-white">{item.styleDescription}</p>
                        </div>
                      )}

                      {/* Style Images */}
                      {item.styleImages && item.styleImages.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-white mb-1">Style Images</p>
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
                          <span className="text-white">Delivery:</span>
                          <span className="text-white font-medium">{formatDate(item.deliveryDate)}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <div>
                          <p className="text-xs font-medium text-white mb-1">Notes</p>
                          <p className="text-xs text-white">{item.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => router.push(`/projects/${projectId}/items/new?edit=${item.id}`)}
                          className="flex-1 py-2 bg-gold-bg text-gold rounded-lg text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteItemConfirm(item.id)}
                          className="py-2 px-3 bg-red-400/10 text-red-400 rounded-lg text-xs font-medium"
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
          <h2 className="text-sm font-semibold text-white">Sewing Expenses</h2>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="text-xs text-gold font-medium"
          >
            + Add Expense
          </button>
        </div>

        {expenses && expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-royal-card rounded-xl shadow-none p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{e.description}</p>
                  <p className="text-xs text-white/60">
                    {e.category || 'General'} &middot; {formatDate(e.date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-400">
                  -{formatCurrency(e.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-royal-card rounded-xl shadow-none p-4 text-center">
            <p className="text-xs text-white/60">No sewing expenses recorded for this project</p>
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
            <label className="block text-sm font-medium text-white mb-1">Description *</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Fabric purchase, Thread..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Amount *</label>
            <input
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Category</label>
            <input
              type="text"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="e.g., Fabric, Thread, Buttons..."
            />
          </div>
          {items && items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-1">For Sub-Client (optional)</label>
              <select
                value={expenseForm.projectItemId}
                onChange={(e) => setExpenseForm((p) => ({ ...p, projectItemId: e.target.value }))}
                className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="">Whole project</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Date</label>
            <input
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <button
            onClick={handleAddExpense}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim disabled:opacity-50 transition-colors"
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
          <p className="text-sm text-white">
            Are you sure you want to delete &ldquo;{project.name}&rdquo;? This will also delete all sub-clients and linked expenses. This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 bg-royal-card border border-royal-border text-white rounded-xl text-sm font-medium"
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
          <p className="text-sm text-white">
            Are you sure you want to delete this sub-client? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteItemConfirm(null)}
              className="flex-1 py-2.5 bg-royal-card border border-royal-border text-white rounded-xl text-sm font-medium"
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

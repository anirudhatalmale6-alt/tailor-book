'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCustomer } from '@/hooks/useCustomers';
import { useMeasurementFields, useCustomerMeasurements, addMeasurement, addMeasurementField } from '@/hooks/useMeasurements';
import { useCustomerOrders } from '@/hooks/useOrders';
import { useCustomerPayments } from '@/hooks/usePayments';
import { useCurrency } from '@/hooks/useSettings';
import { getInitials, getWhatsAppLink, getPhoneLink, formatDate, formatCurrency } from '@/lib/utils';
import OrderCard from '@/components/OrderCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';

type TabType = 'measurements' | 'orders' | 'balance';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const customer = useCustomer(id);
  const fields = useMeasurementFields();
  const measurements = useCustomerMeasurements(id);
  const orders = useCustomerOrders(id);
  const payments = useCustomerPayments(id);
  const currency = useCurrency();

  const [activeTab, setActiveTab] = useState<TabType>('measurements');
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState<'inches' | 'cm'>('inches');
  const [addingField, setAddingField] = useState(false);

  const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null;

  const totalBilled = orders
    ? orders.reduce((sum, o) => (o.status !== 'cancelled' ? sum + o.totalAmount : sum), 0)
    : 0;
  const totalPaid = payments
    ? payments.reduce((sum, p) => (p.type === 'refund' ? sum - p.amount : sum + p.amount), 0)
    : 0;
  const outstanding = totalBilled - totalPaid;

  const initMeasurementForm = useCallback(() => {
    if (latestMeasurement && fields) {
      const vals: Record<string, string> = {};
      fields.forEach((f) => {
        const existing = latestMeasurement.fields[f.id];
        vals[f.id] = existing !== undefined ? String(existing) : '';
      });
      setMeasurementValues(vals);
    } else {
      setMeasurementValues({});
    }
    setMeasurementNotes('');
  }, [latestMeasurement, fields]);

  async function handleSaveMeasurement() {
    setSaving(true);
    try {
      const fieldValues: Record<string, number | string> = {};
      Object.entries(measurementValues).forEach(([key, val]) => {
        if (val.trim()) {
          const num = parseFloat(val);
          fieldValues[key] = isNaN(num) ? val : num;
        }
      });
      await addMeasurement(id, fieldValues, measurementNotes);
      setShowMeasurementModal(false);
    } catch (err) {
      console.error('Failed to save measurement:', err);
      alert('Failed to save measurement');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFieldInline() {
    if (!newFieldName.trim()) return;
    setAddingField(true);
    try {
      const maxSort = fields ? Math.max(0, ...fields.map((f) => f.sortOrder)) : 0;
      await addMeasurementField({
        name: newFieldName.trim(),
        unit: newFieldUnit,
        category: 'General',
        sortOrder: maxSort + 1,
      });
      setNewFieldName('');
      setShowAddField(false);
    } catch (err) {
      console.error('Failed to add field:', err);
      alert('Failed to add measurement field');
    } finally {
      setAddingField(false);
    }
  }

  if (customer === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (customer === null) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Customer not found" description="This customer may have been deleted." />
      </div>
    );
  }

  const groupedFields: Record<string, typeof fields> = {};
  if (fields) {
    fields.forEach((f) => {
      if (!groupedFields[f.category]) groupedFields[f.category] = [];
      groupedFields[f.category]!.push(f);
    });
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{customer.name}</h1>
        <button
          onClick={() => router.push(`/customers/new?edit=${id}`)}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          {customer.photo ? (
            <img src={customer.photo} alt={customer.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-600 font-bold text-xl">{getInitials(customer.name)}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{customer.name}</h2>
            {customer.phone && (
              <a href={getPhoneLink(customer.phone)} className="text-sm text-indigo-600 block">{customer.phone}</a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {customer.whatsapp && (
            <a
              href={getWhatsAppLink(customer.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-green-700 text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-blue-700 text-sm font-medium truncate">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{customer.email}</span>
            </a>
          )}
        </div>

        {customer.address && (
          <p className="text-sm text-gray-500 mt-2">{customer.address}</p>
        )}
        {customer.stylePreferences && (
          <div className="mt-2">
            <span className="text-xs font-medium text-gray-400 uppercase">Style Preferences</span>
            <p className="text-sm text-gray-600">{customer.stylePreferences}</p>
          </div>
        )}
        {customer.notes && (
          <div className="mt-2">
            <span className="text-xs font-medium text-gray-400 uppercase">Notes</span>
            <p className="text-sm text-gray-600">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        {(['measurements', 'orders', 'balance'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-gray-500 border-b-2 border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'measurements' && (
        <div>
          {latestMeasurement && fields ? (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 uppercase">
                  Latest - {formatDate(latestMeasurement.createdAt)}
                </span>
              </div>
              {Object.entries(groupedFields).map(([category, catFields]) => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {catFields!.map((f) => {
                      const val = latestMeasurement.fields[f.id];
                      return (
                        <div key={f.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-600">{f.name}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {val !== undefined ? `${val} ${f.unit}` : '--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {latestMeasurement.notes && (
                <p className="text-sm text-gray-500 mt-2">{latestMeasurement.notes}</p>
              )}
            </div>
          ) : (
            <EmptyState
              title="No measurements yet"
              description="Take your first measurement for this customer"
            />
          )}

          <button
            onClick={() => {
              initMeasurementForm();
              setShowMeasurementModal(true);
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors mb-4"
          >
            Take New Measurements
          </button>

          {/* Measurement History */}
          {measurements && measurements.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Measurement History</h3>
              <div className="space-y-2">
                {measurements.slice(1).map((m) => (
                  <div key={m.id} className="bg-white rounded-xl shadow-sm p-3">
                    <button
                      onClick={() => setShowHistoryId(showHistoryId === m.id ? null : m.id)}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-600">{formatDate(m.createdAt)}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showHistoryId === m.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showHistoryId === m.id && fields && (
                      <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1">
                        {fields.map((f) => {
                          const val = m.fields[f.id];
                          if (val === undefined) return null;
                          return (
                            <div key={f.id} className="flex justify-between text-xs px-2 py-1">
                              <span className="text-gray-500">{f.name}</span>
                              <span className="font-medium text-gray-700">{val} {f.unit}</span>
                            </div>
                          );
                        })}
                        {m.notes && <p className="col-span-2 text-xs text-gray-400 mt-1">{m.notes}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} customer={customer} currency={currency} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No orders yet"
              description="Create an order for this customer"
              action={
                <button
                  onClick={() => router.push(`/orders/new?customerId=${id}`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                >
                  New Order
                </button>
              }
            />
          )}
        </div>
      )}

      {activeTab === 'balance' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Billed</p>
              <p className="font-semibold text-gray-900 text-sm">{formatCurrency(totalBilled, currency)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Paid</p>
              <p className="font-semibold text-green-600 text-sm">{formatCurrency(totalPaid, currency)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Balance</p>
              <p className={`font-semibold text-sm ${outstanding > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(outstanding, currency)}
              </p>
            </div>
          </div>

          {orders && orders.filter((o) => o.status !== 'cancelled').length > 0 ? (
            <div className="space-y-2">
              {orders
                .filter((o) => o.status !== 'cancelled')
                .map((order) => {
                  const orderPayments = payments?.filter((p) => p.orderId === order.id) || [];
                  const orderPaid = orderPayments.reduce(
                    (s, p) => (p.type === 'refund' ? s - p.amount : s + p.amount),
                    0
                  );
                  const orderBalance = order.totalAmount - orderPaid;
                  return (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{order.fabricType || 'Order'}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Total: {formatCurrency(order.totalAmount, currency)}</span>
                        <span className={orderBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {orderBalance > 0 ? `Owes: ${formatCurrency(orderBalance, currency)}` : 'Paid'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <EmptyState title="No orders" description="Create an order to track payments" />
          )}
        </div>
      )}

      {/* Measurement Modal */}
      <Modal
        isOpen={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        title="Take Measurements"
      >
        {fields && Object.entries(groupedFields).map(([category, catFields]) => (
          <div key={category} className="mb-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">{category}</h4>
            <div className="space-y-2">
              {catFields!.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-28 flex-shrink-0">{f.name}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementValues[f.id] || ''}
                    onChange={(e) =>
                      setMeasurementValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={f.unit}
                  />
                  <span className="text-xs text-gray-400 w-10">{f.unit}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* Add New Field Inline */}
        <div className="mb-4">
          {!showAddField ? (
            <button
              onClick={() => setShowAddField(true)}
              className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Measurement Field
            </button>
          ) : (
            <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Field name (e.g., Thigh, Calf...)"
                autoFocus
              />
              <div className="flex gap-2">
                {(['inches', 'cm'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setNewFieldUnit(u)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      newFieldUnit === u
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddField(false); setNewFieldName(''); }}
                  className="flex-1 py-2 bg-white text-gray-600 rounded-lg text-sm font-medium border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFieldInline}
                  disabled={addingField || !newFieldName.trim()}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addingField ? 'Adding...' : 'Add Field'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Notes</label>
          <textarea
            value={measurementNotes}
            onChange={(e) => setMeasurementNotes(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
            placeholder="Any notes about these measurements..."
          />
        </div>
        <button
          onClick={handleSaveMeasurement}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Measurements'}
        </button>
      </Modal>
    </div>
  );
}

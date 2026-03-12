'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useOrder, updateOrder } from '@/hooks/useOrders';
import { useOrderPayments, addPayment } from '@/hooks/usePayments';
import { useOrderInvoice } from '@/hooks/useInvoices';
import { useCustomerMeasurements, useMeasurementFields } from '@/hooks/useMeasurements';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer } from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PaymentCard from '@/components/PaymentCard';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { fileToBase64 } from '@/lib/utils';

const STATUS_FLOW: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'ready',
  ready: 'delivered',
};

const STATUS_ACTIONS: Record<string, string> = {
  pending: 'Start Work',
  in_progress: 'Mark Ready',
  ready: 'Mark Delivered',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const order = useOrder(id);
  const payments = useOrderPayments(id);
  const existingInvoice = useOrderInvoice(id);
  const currency = useCurrency();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showReadyPhotoModal, setShowReadyPhotoModal] = useState(false);
  const [readyPhotoPreview, setReadyPhotoPreview] = useState('');
  const readyPhotoRef = useRef<HTMLInputElement>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    type: 'balance' as 'deposit' | 'balance' | 'refund',
    method: 'cash' as 'cash' | 'transfer' | 'card' | 'mobile_money',
    notes: '',
  });

  useEffect(() => {
    if (order?.customerId) {
      db.customers.get(order.customerId).then((c) => setCustomer(c || null));
    }
  }, [order?.customerId]);

  const customerId = order?.customerId || '';
  const measurements = useCustomerMeasurements(customerId);
  const fields = useMeasurementFields();

  const totalPaid = payments
    ? payments.reduce((sum, p) => (p.type === 'refund' ? sum - p.amount : sum + p.amount), 0)
    : 0;
  const outstanding = order ? order.totalAmount - totalPaid : 0;
  const latestMeasurement = measurements && measurements.length > 0 ? measurements[0] : null;

  async function handleStatusChange() {
    if (!order) return;
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;

    // When marking as "ready", prompt for a photo of the packaged clothes
    if (nextStatus === 'ready') {
      setShowReadyPhotoModal(true);
      return;
    }

    await updateOrder(id, { status: nextStatus as typeof order.status });
  }

  async function handleReadyPhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setReadyPhotoPreview(base64);
  }

  async function handleConfirmReady() {
    if (!order) return;
    await updateOrder(id, {
      status: 'ready',
      readyPhoto: readyPhotoPreview || undefined,
    });
    setShowReadyPhotoModal(false);
    setReadyPhotoPreview('');
  }

  async function handleCancelOrder() {
    if (!order) return;
    if (confirm('Are you sure you want to cancel this order?')) {
      await updateOrder(id, { status: 'cancelled' });
    }
  }

  async function handleAddPayment() {
    if (!order) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await addPayment({
        orderId: id,
        customerId: order.customerId,
        amount,
        type: paymentForm.type,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', type: 'balance', method: 'cash', notes: '' });
    } catch (err) {
      console.error('Failed to add payment:', err);
      alert('Failed to add payment');
    } finally {
      setSaving(false);
    }
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Order not found" description="This order may have been deleted." />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">Order Details</h1>
          {order.orderCode && (
            <span className="text-xs font-mono text-gold">{order.orderCode}</span>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer Info */}
      {customer && (
        <button
          onClick={() => router.push(`/customers/${customer.id}`)}
          className="w-full bg-royal-card rounded-xl shadow-none p-3 mb-3 flex items-center gap-3 active:bg-royal-hover"
        >
          <div className="w-10 h-10 rounded-full bg-royal-hover flex items-center justify-center flex-shrink-0">
            <span className="text-gold font-semibold">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-white truncate">{customer.name}</p>
            <p className="text-xs text-white">{customer.phone}</p>
          </div>
          <svg className="w-5 h-5 text-royal-dark ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Order Details */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <h3 className="text-sm font-semibold text-white mb-3">Order Information</h3>
        <div className="space-y-2">
          {order.fabricType && (
            <div className="flex justify-between">
              <span className="text-sm text-white">Fabric Type</span>
              <span className="text-sm font-medium text-white">{order.fabricType}</span>
            </div>
          )}
          {order.deliveryDate && (
            <div className="flex justify-between">
              <span className="text-sm text-white">Delivery Date</span>
              <span className="text-sm font-medium text-white">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-white">Created</span>
            <span className="text-sm text-white">{formatDate(order.createdAt)}</span>
          </div>
        </div>

        {order.styleDescription && (
          <div className="mt-3 pt-3 border-t border-royal-border">
            <span className="text-xs font-medium text-white/60 uppercase">Style Description</span>
            <p className="text-sm text-white mt-1">{order.styleDescription}</p>
          </div>
        )}

        {order.notes && (
          <div className="mt-3 pt-3 border-t border-royal-border">
            <span className="text-xs font-medium text-white/60 uppercase">Notes</span>
            <p className="text-sm text-white mt-1">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Fabric & Style Photos */}
      {(order.fabricPhoto || order.styleImages.length > 0 || order.readyPhoto) && (
        <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
          <h3 className="text-sm font-semibold text-white mb-2">Photos</h3>
          <div className="flex flex-wrap gap-2">
            {order.fabricPhoto && (
              <div className="relative">
                <img src={order.fabricPhoto} alt="Fabric" className="w-24 h-24 object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">Fabric</span>
              </div>
            )}
            {order.styleImages.map((img, i) => (
              <img key={i} src={img} alt={`Style ${i + 1}`} className="w-24 h-24 object-cover rounded-lg" />
            ))}
            {order.readyPhoto && (
              <div className="relative">
                <img src={order.readyPhoto} alt="Ready" className="w-24 h-24 object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-green-500/80 text-white px-1 rounded">Ready</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
        <h3 className="text-sm font-semibold text-white mb-3">Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-white">Total Amount</span>
            <span className="text-sm font-semibold text-white">{formatCurrency(order.totalAmount, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-white">Total Paid</span>
            <span className="text-sm font-medium text-green-400">{formatCurrency(totalPaid, currency)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-royal-border">
            <span className="text-sm font-medium text-white">Outstanding</span>
            <span className={`text-sm font-bold ${outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCurrency(Math.max(0, outstanding), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Actions */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={handleStatusChange}
            className="flex-1 py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim transition-colors text-sm"
          >
            {STATUS_ACTIONS[order.status]}
          </button>
          <button
            onClick={handleCancelOrder}
            className="px-4 py-3 bg-red-400/10 text-red-400 rounded-xl font-semibold hover:bg-red-100 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Add Payment Button */}
      <button
        onClick={() => setShowPaymentModal(true)}
        className="w-full py-3 bg-royal-card border-2 border-gold text-gold rounded-xl font-semibold hover:bg-gold-bg transition-colors text-sm mb-3"
      >
        Add Payment
      </button>

      {/* Invoice Button */}
      {existingInvoice ? (
        <button
          onClick={() => router.push(`/invoices/${existingInvoice.id}`)}
          className="w-full py-3 bg-royal-card border border-royal-border text-white rounded-xl font-semibold hover:bg-royal-hover transition-colors text-sm mb-3 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Invoice ({existingInvoice.invoiceNumber})
        </button>
      ) : (
        <button
          onClick={() => router.push(`/invoices/new?orderId=${id}`)}
          className="w-full py-3 bg-royal-card border border-royal-border text-white rounded-xl font-semibold hover:bg-royal-hover transition-colors text-sm mb-3 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate Invoice
        </button>
      )}

      {/* Payment History */}
      {payments && payments.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white mb-2">Payment History</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <PaymentCard key={p.id} payment={p} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Latest Measurements */}
      {latestMeasurement && fields && (
        <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
          <h3 className="text-sm font-semibold text-white mb-2">Account Measurements</h3>
          <p className="text-xs text-white/60 mb-2">As of {formatDate(latestMeasurement.createdAt)}</p>
          <div className="grid grid-cols-2 gap-1">
            {fields.map((f) => {
              const val = latestMeasurement.fields[f.id];
              if (val === undefined) return null;
              return (
                <div key={f.id} className="flex justify-between bg-royal-bg rounded-lg px-2 py-1.5 text-xs">
                  <span className="text-white">{f.name}</span>
                  <span className="font-medium text-white">{val} {f.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ready Photo Modal */}
      <Modal
        isOpen={showReadyPhotoModal}
        onClose={() => { setShowReadyPhotoModal(false); setReadyPhotoPreview(''); }}
        title="Mark as Ready"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Take a photo of the packaged clothes before marking as ready for delivery.
          </p>
          <input
            ref={readyPhotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReadyPhotoCapture}
            className="hidden"
          />
          {readyPhotoPreview ? (
            <div className="relative">
              <img src={readyPhotoPreview} alt="Ready" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => { setReadyPhotoPreview(''); readyPhotoRef.current?.click(); }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => readyPhotoRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-royal-border rounded-xl flex flex-col items-center gap-2 text-white/60 hover:border-gold hover:text-gold transition-colors"
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <span className="text-sm font-medium">Take Photo</span>
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConfirmReady}
              className="flex-1 py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm"
            >
              {readyPhotoPreview ? 'Confirm Ready' : 'Skip & Mark Ready'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Add Payment"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Amount *</label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0"
            />
            {outstanding > 0 && (
              <button
                onClick={() => setPaymentForm((p) => ({ ...p, amount: outstanding.toString() }))}
                className="text-xs text-gold mt-1"
              >
                Fill outstanding: {formatCurrency(outstanding, currency)}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Type</label>
            <div className="flex gap-2">
              {(['deposit', 'balance', 'refund'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPaymentForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    paymentForm.type === t
                      ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                      : 'bg-royal-hover text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Method</label>
            <select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm((p) => ({
                  ...p,
                  method: e.target.value as typeof paymentForm.method,
                }))
              }
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-4 py-3 bg-royal-bg rounded-xl border border-royal-border text-white focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Optional notes..."
            />
          </div>

          <button
            onClick={handleAddPayment}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

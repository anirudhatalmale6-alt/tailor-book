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
import { toast } from '@/lib/toast';

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
  const [showStartModal, setShowStartModal] = useState(false);

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

  function sendWhatsApp(phone: string, message: string) {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  async function handleStatusChange() {
    if (!order) return;
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;

    // When starting work, show popup to notify client
    if (nextStatus === 'in_progress') {
      setShowStartModal(true);
      return;
    }

    // When marking as "ready", prompt for a photo of the packaged clothes
    if (nextStatus === 'ready') {
      setShowReadyPhotoModal(true);
      return;
    }

    await updateOrder(id, { status: nextStatus as typeof order.status });
  }

  async function handleConfirmStart(notify: boolean) {
    if (!order) return;
    await updateOrder(id, { status: 'in_progress' });
    setShowStartModal(false);

    if (notify && customer?.phone && order.deliveryDate) {
      const deliveryStr = new Date(order.deliveryDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      const msg = `Hello ${customer.name},\n\nThis is to inform you that work on your order has started. Your order is expected to be ready by *${deliveryStr}*.\n\nThank you for your patience!`;
      sendWhatsApp(customer.phone, msg);
    } else if (notify && customer?.phone) {
      const msg = `Hello ${customer.name},\n\nThis is to inform you that work on your order has started. We will notify you once it's ready.\n\nThank you for your patience!`;
      sendWhatsApp(customer.phone, msg);
    }
  }

  async function handleReadyPhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setReadyPhotoPreview(base64);
  }

  async function handleConfirmReady(notify: boolean) {
    if (!order) return;
    await updateOrder(id, {
      status: 'ready',
      readyPhoto: readyPhotoPreview || undefined,
    });
    setShowReadyPhotoModal(false);
    setReadyPhotoPreview('');

    if (notify && customer?.phone) {
      const msg = `Hello ${customer.name},\n\nGreat news! Your order is now ready for delivery/pickup.\n\nPlease contact us to arrange collection. Thank you!`;
      sendWhatsApp(customer.phone, msg);
    }
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
      toast('Please enter a valid amount', 'error');
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
      toast('Failed to add payment', 'error');
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
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleConfirmReady(true)}
              className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
              {readyPhotoPreview ? 'Confirm & Notify Client' : 'Skip Photo & Notify Client'}
            </button>
            <button
              onClick={() => handleConfirmReady(false)}
              className="w-full py-2.5 bg-royal-hover text-white/60 rounded-xl text-sm font-medium"
            >
              {readyPhotoPreview ? 'Confirm without notifying' : 'Skip & Mark Ready'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Start Work Modal */}
      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Start Work"
      >
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Would you like to notify {customer?.name || 'the client'} via WhatsApp that their work has started
            {order?.deliveryDate ? ` and is expected to be ready by ${new Date(order.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleConfirmStart(true)}
              className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
              Start & Notify Client
            </button>
            <button
              onClick={() => handleConfirmStart(false)}
              className="w-full py-2.5 bg-royal-hover text-white/60 rounded-xl text-sm font-medium"
            >
              Start without notifying
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

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCustomer, useCustomers } from '@/hooks/useCustomers';
import { useMeasurementFields, useCustomerMeasurements, addMeasurement, addMeasurementField } from '@/hooks/useMeasurements';
import { useCustomerOrders } from '@/hooks/useOrders';
import { useCustomerPayments } from '@/hooks/usePayments';
import { useColleagueJobs, useColleaguePayments as useColleaguePaymentsList, addColleagueJob, updateColleagueJob, addColleaguePayment } from '@/hooks/useColleagueJobs';
import { useCurrency } from '@/hooks/useSettings';
import { getInitials, getWhatsAppLink, getPhoneLink, formatDate, formatCurrency, formatPhoneForWhatsApp } from '@/lib/utils';
import OrderCard from '@/components/OrderCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';

type TabType = 'measurements' | 'orders' | 'balance' | 'jobs' | 'payments';

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

  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState<'inches' | 'cm'>('inches');
  const [addingField, setAddingField] = useState(false);
  const [showSendToColleague, setShowSendToColleague] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState({ description: '', agreedAmount: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', type: 'advance' as 'advance' | 'balance', method: 'cash' as 'cash' | 'transfer' | 'card' | 'mobile_money', notes: '' });
  const [savingJob, setSavingJob] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const colleagueJobs = useColleagueJobs(id);
  const colleaguePayments = useColleaguePaymentsList(id);

  const allCustomers = useCustomers();
  const colleagues = useMemo(() => {
    if (!allCustomers) return [];
    return allCustomers.filter((c) => c.contactType === 'colleague' && c.whatsapp);
  }, [allCustomers]);

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
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (customer === null) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Account not found" description="This account may have been deleted." />
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
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{customer.name}</h1>
        <button
          onClick={() => router.push(`/customers/new?edit=${id}`)}
          className="p-2 text-gold hover:bg-gold-bg rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-royal-card rounded-xl shadow-none p-4 mb-4">
        <div className="flex items-center gap-4 mb-3">
          {customer.photo ? (
            <img src={customer.photo} alt={customer.name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-royal-hover flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold text-xl">{getInitials(customer.name)}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">{customer.name}</h2>
            {customer.phone && (
              <a href={getPhoneLink(customer.phone)} className="text-sm text-gold block">{customer.phone}</a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {customer.whatsapp && (
            <a
              href={getWhatsAppLink(customer.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-green-400/10 rounded-lg text-green-400 text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 px-3 py-2 bg-blue-400/10 rounded-lg text-blue-400 text-sm font-medium truncate">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{customer.email}</span>
            </a>
          )}
        </div>

        {customer.address && (
          <p className="text-sm text-white mt-2">{customer.address}</p>
        )}
        {customer.stylePreferences && (
          <div className="mt-2">
            <span className="text-xs font-medium text-white/60 uppercase">Style Preferences</span>
            <p className="text-sm text-white">{customer.stylePreferences}</p>
          </div>
        )}
        {customer.styleImages && customer.styleImages.length > 0 && (
          <div className="mt-2">
            <span className="text-xs font-medium text-white/60 uppercase">Style Reference Images</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {customer.styleImages.map((img, i) => (
                <img key={i} src={img} alt={`Style ${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}
        {customer.notes && (
          <div className="mt-2">
            <span className="text-xs font-medium text-white/60 uppercase">Notes</span>
            <p className="text-sm text-white">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-royal-card rounded-xl shadow-none mb-4 overflow-hidden">
        {(customer.contactType === 'colleague'
          ? (['jobs', 'payments'] as TabType[])
          : (['measurements', 'orders', 'balance'] as TabType[])
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              (activeTab || (customer.contactType === 'colleague' ? 'jobs' : 'measurements')) === tab
                ? 'text-gold border-b-2 border-gold bg-gold-bg/50'
                : 'text-white border-b-2 border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {(activeTab || (customer.contactType === 'colleague' ? 'jobs' : 'measurements')) === 'measurements' && customer.contactType !== 'colleague' && (
        <div>
          {latestMeasurement && fields ? (
            <div className="bg-royal-card rounded-xl shadow-none p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/60 uppercase">
                  Latest - {formatDate(latestMeasurement.createdAt)}
                </span>
              </div>
              {Object.entries(groupedFields).map(([category, catFields]) => (
                <div key={category} className="mb-3">
                  <h4 className="text-xs font-semibold text-white/60 uppercase mb-1">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {catFields!.map((f) => {
                      const val = latestMeasurement.fields[f.id];
                      return (
                        <div key={f.id} className="flex justify-between items-center bg-royal-bg rounded-lg px-3 py-2">
                          <span className="text-sm text-white">{f.name}</span>
                          <span className="text-sm font-semibold text-white">
                            {val !== undefined ? `${val} ${f.unit}` : '--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {latestMeasurement.notes && (
                <p className="text-sm text-white mt-2">{latestMeasurement.notes}</p>
              )}
            </div>
          ) : (
            <EmptyState
              title="No measurements yet"
              description="Take your first measurement for this account"
            />
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                initMeasurementForm();
                setShowMeasurementModal(true);
              }}
              className="flex-1 py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim transition-colors"
            >
              Take Measurements
            </button>
            {latestMeasurement && (
              <button
                onClick={() => setShowSendToColleague(true)}
                className="py-3 px-4 bg-amber-50 border border-amber-200 text-gold rounded-xl font-medium text-sm hover:bg-gold-bg transition-colors"
                title="Send measurements to colleague"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
          </div>

          {/* Measurement History */}
          {measurements && measurements.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Measurement History</h3>
              <div className="space-y-2">
                {measurements.slice(1).map((m) => (
                  <div key={m.id} className="bg-royal-card rounded-xl shadow-none p-3">
                    <button
                      onClick={() => setShowHistoryId(showHistoryId === m.id ? null : m.id)}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-sm text-white">{formatDate(m.createdAt)}</span>
                      <svg className={`w-4 h-4 text-white/60 transition-transform ${showHistoryId === m.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showHistoryId === m.id && fields && (
                      <div className="mt-2 pt-2 border-t border-royal-border grid grid-cols-2 gap-1">
                        {fields.map((f) => {
                          const val = m.fields[f.id];
                          if (val === undefined) return null;
                          return (
                            <div key={f.id} className="flex justify-between text-xs px-2 py-1">
                              <span className="text-white">{f.name}</span>
                              <span className="font-medium text-white">{val} {f.unit}</span>
                            </div>
                          );
                        })}
                        {m.notes && <p className="col-span-2 text-xs text-white/60 mt-1">{m.notes}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(activeTab || 'measurements') === 'orders' && (
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
              description="Create an order for this account"
              action={
                <button
                  onClick={() => router.push(`/orders/new?customerId=${id}`)}
                  className="px-4 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-sm font-medium"
                >
                  New Order
                </button>
              }
            />
          )}
        </div>
      )}

      {(activeTab || 'measurements') === 'balance' && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
              <p className="text-xs text-white/60 mb-1">Billed</p>
              <p className="font-semibold text-white text-sm">{formatCurrency(totalBilled, currency)}</p>
            </div>
            <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
              <p className="text-xs text-white/60 mb-1">Paid</p>
              <p className="font-semibold text-green-400 text-sm">{formatCurrency(totalPaid, currency)}</p>
            </div>
            <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
              <p className="text-xs text-white/60 mb-1">Balance</p>
              <p className={`font-semibold text-sm ${outstanding > 0 ? 'text-red-400' : 'text-white'}`}>
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
                    <div key={order.id} className="bg-royal-card rounded-xl shadow-none p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{order.fabricType || 'Order'}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white">Total: {formatCurrency(order.totalAmount, currency)}</span>
                        <span className={orderBalance > 0 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
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

      {/* Colleague Jobs Tab */}
      {(activeTab || (customer.contactType === 'colleague' ? 'jobs' : 'measurements')) === 'jobs' && customer.contactType === 'colleague' && (
        <div>
          {/* Financial Summary */}
          {colleagueJobs && colleagueJobs.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
                <p className="text-xs text-white/60 mb-1">Total Jobs</p>
                <p className="font-semibold text-white text-sm">
                  {formatCurrency(colleagueJobs.reduce((s, j) => s + j.agreedAmount, 0), currency)}
                </p>
              </div>
              <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
                <p className="text-xs text-white/60 mb-1">Paid</p>
                <p className="font-semibold text-green-400 text-sm">
                  {formatCurrency(colleaguePayments?.reduce((s, p) => s + p.amount, 0) || 0, currency)}
                </p>
              </div>
              <div className="bg-royal-card rounded-xl shadow-none p-3 text-center">
                <p className="text-xs text-white/60 mb-1">Balance</p>
                <p className={`font-semibold text-sm ${(colleagueJobs.reduce((s, j) => s + j.agreedAmount, 0) - (colleaguePayments?.reduce((s, p) => s + p.amount, 0) || 0)) > 0 ? 'text-red-400' : 'text-white'}`}>
                  {formatCurrency(
                    colleagueJobs.reduce((s, j) => s + j.agreedAmount, 0) - (colleaguePayments?.reduce((s, p) => s + p.amount, 0) || 0),
                    currency
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Job List */}
          {colleagueJobs && colleagueJobs.length > 0 ? (
            <div className="space-y-2 mb-4">
              {[...colleagueJobs].reverse().map((job) => {
                const jobPayments = colleaguePayments?.filter((p) => p.jobId === job.id) || [];
                const totalPaidForJob = jobPayments.reduce((s, p) => s + p.amount, 0);
                const balanceDue = job.agreedAmount - totalPaidForJob;
                return (
                  <div key={job.id} className="bg-royal-card rounded-xl shadow-none p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{job.description}</p>
                        <p className="text-xs text-white/60">{formatDate(job.createdAt)}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        job.status === 'settled' ? 'bg-green-400/10 text-green-400' :
                        job.status === 'delivered' ? 'bg-blue-400/10 text-blue-400' :
                        'bg-yellow-400/10 text-yellow-400'
                      }`}>
                        {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-white">Agreed: {formatCurrency(job.agreedAmount, currency)}</span>
                      <span className="text-white">Paid: {formatCurrency(totalPaidForJob, currency)}</span>
                      <span className={balanceDue > 0 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                        {balanceDue > 0 ? `Due: ${formatCurrency(balanceDue, currency)}` : 'Settled'}
                      </span>
                    </div>
                    {job.notes && <p className="text-xs text-white/60 mb-2">{job.notes}</p>}
                    <div className="flex gap-2">
                      {job.status === 'in_progress' && (
                        <button
                          onClick={() => updateColleagueJob(job.id, { status: 'delivered' })}
                          className="flex-1 py-1.5 bg-blue-400/10 text-blue-400 rounded-lg text-xs font-medium"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {job.status === 'delivered' && balanceDue <= 0 && (
                        <button
                          onClick={() => updateColleagueJob(job.id, { status: 'settled' })}
                          className="flex-1 py-1.5 bg-green-400/10 text-green-400 rounded-lg text-xs font-medium"
                        >
                          Mark Settled
                        </button>
                      )}
                      {balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setPaymentForm({ amount: '', type: job.status === 'in_progress' ? 'advance' : 'balance', method: 'cash', notes: '' });
                            setShowAddPayment(true);
                          }}
                          className="flex-1 py-1.5 bg-gold-bg text-gold rounded-lg text-xs font-medium"
                        >
                          Record Payment
                        </button>
                      )}
                      {customer.whatsapp && (() => {
                        const paymentLines = jobPayments.map((p) =>
                          `  ${formatDate(p.createdAt)} - ${p.type === 'advance' ? 'Advance' : 'Balance'}: ${formatCurrency(p.amount, currency)} (${p.method === 'mobile_money' ? 'Mobile Money' : p.method.charAt(0).toUpperCase() + p.method.slice(1)})`
                        ).join('\n');
                        const statement = [
                          `*JOB STATEMENT*`,
                          ``,
                          `*Colleague:* ${customer.name}`,
                          `*Job:* ${job.description}`,
                          `*Date Assigned:* ${formatDate(job.createdAt)}`,
                          `*Status:* ${job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}`,
                          ``,
                          `*Agreed Amount:* ${formatCurrency(job.agreedAmount, currency)}`,
                          ``,
                          jobPayments.length > 0 ? `*Payments:*\n${paymentLines}` : `*Payments:* None yet`,
                          ``,
                          `*Total Paid:* ${formatCurrency(totalPaidForJob, currency)}`,
                          `*Balance Due:* ${formatCurrency(balanceDue, currency)}`,
                          ``,
                          `_Generated on ${formatDate(new Date().toISOString())}_`,
                        ].join('\n');
                        const waLink = `https://wa.me/${formatPhoneForWhatsApp(customer.whatsapp)}?text=${encodeURIComponent(statement)}`;
                        return (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-green-400/10 text-green-400 rounded-lg text-xs font-medium text-center"
                          >
                            Share Statement
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No jobs yet"
              description="Assign a job to this colleague to start tracking"
            />
          )}

          <button
            onClick={() => {
              setJobForm({ description: '', agreedAmount: '', notes: '' });
              setShowAddJob(true);
            }}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold mb-4"
          >
            + Assign New Job
          </button>
        </div>
      )}

      {/* Colleague Payments Tab */}
      {(activeTab || 'jobs') === 'payments' && customer.contactType === 'colleague' && (
        <div>
          {colleaguePayments && colleaguePayments.length > 0 ? (
            <div className="space-y-2">
              {[...colleaguePayments].reverse().map((payment) => {
                const job = colleagueJobs?.find((j) => j.id === payment.jobId);
                return (
                  <div key={payment.id} className="bg-royal-card rounded-xl shadow-none p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{formatCurrency(payment.amount, currency)}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        payment.type === 'advance' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-green-400/10 text-green-400'
                      }`}>
                        {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{job?.description || 'Unknown job'}</span>
                      <span>{payment.method}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1">{formatDate(payment.createdAt)}</p>
                    {payment.notes && <p className="text-xs text-white/60 mt-1">{payment.notes}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No payments yet"
              description="Payments will appear here when you record them against jobs"
            />
          )}
        </div>
      )}

      {/* Add Job Modal */}
      <Modal
        isOpen={showAddJob}
        onClose={() => setShowAddJob(false)}
        title="Assign New Job"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-white mb-1">Job Description *</label>
            <textarea
              value={jobForm.description}
              onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              rows={2}
              placeholder="e.g., Sew 3 agbadas, Embroider 2 kaftans..."
            />
          </div>
          <div>
            <label className="block text-sm text-white mb-1">Agreed Amount *</label>
            <input
              type="number"
              value={jobForm.agreedAmount}
              onChange={(e) => setJobForm((p) => ({ ...p, agreedAmount: e.target.value }))}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Total amount for this job"
            />
          </div>
          <div>
            <label className="block text-sm text-white mb-1">Notes</label>
            <textarea
              value={jobForm.notes}
              onChange={(e) => setJobForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>
          <button
            onClick={async () => {
              if (!jobForm.description.trim() || !jobForm.agreedAmount) {
                alert('Please enter job description and agreed amount');
                return;
              }
              setSavingJob(true);
              try {
                await addColleagueJob({
                  colleagueId: id,
                  description: jobForm.description.trim(),
                  agreedAmount: parseFloat(jobForm.agreedAmount),
                  status: 'in_progress',
                  notes: jobForm.notes,
                });
                setShowAddJob(false);
              } catch (err) {
                console.error('Failed to add job:', err);
                alert('Failed to add job');
              } finally {
                setSavingJob(false);
              }
            }}
            disabled={savingJob}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {savingJob ? 'Saving...' : 'Assign Job'}
          </button>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showAddPayment}
        onClose={() => setShowAddPayment(false)}
        title="Record Payment"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-white mb-1">Amount *</label>
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Payment amount"
            />
          </div>
          <div>
            <label className="block text-sm text-white mb-1">Payment Type</label>
            <div className="flex gap-2">
              {(['advance', 'balance'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPaymentForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentForm.type === t
                      ? 'bg-gold-bg border border-gold text-gold'
                      : 'bg-royal-card border border-royal-border text-white'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-white mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'transfer', 'card', 'mobile_money'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentForm((p) => ({ ...p, method: m }))}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    paymentForm.method === m
                      ? 'bg-gold-bg border border-gold text-gold'
                      : 'bg-royal-card border border-royal-border text-white'
                  }`}
                >
                  {m === 'mobile_money' ? 'Mobile Money' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-white mb-1">Notes</label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Optional note..."
            />
          </div>
          <button
            onClick={async () => {
              if (!paymentForm.amount || !selectedJobId) {
                alert('Please enter an amount');
                return;
              }
              setSavingPayment(true);
              try {
                await addColleaguePayment({
                  colleagueId: id,
                  jobId: selectedJobId,
                  amount: parseFloat(paymentForm.amount),
                  type: paymentForm.type,
                  method: paymentForm.method,
                  notes: paymentForm.notes,
                });
                setShowAddPayment(false);
              } catch (err) {
                console.error('Failed to record payment:', err);
                alert('Failed to record payment');
              } finally {
                setSavingPayment(false);
              }
            }}
            disabled={savingPayment}
            className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold disabled:opacity-50"
          >
            {savingPayment ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </Modal>

      {/* Measurement Modal */}
      <Modal
        isOpen={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        title="Take Measurements"
      >
        {fields && Object.entries(groupedFields).map(([category, catFields]) => (
          <div key={category} className="mb-4">
            <h4 className="text-xs font-semibold text-white/60 uppercase mb-2">{category}</h4>
            <div className="space-y-2">
              {catFields!.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <label className="text-sm text-white w-28 flex-shrink-0">{f.name}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={measurementValues[f.id] || ''}
                    onChange={(e) =>
                      setMeasurementValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder={f.unit}
                  />
                  <span className="text-xs text-white/60 w-10">{f.unit}</span>
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
              className="w-full py-2.5 border-2 border-dashed border-indigo-300 text-gold rounded-xl text-sm font-medium hover:bg-gold-bg transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Measurement Field
            </button>
          ) : (
            <div className="bg-gold-bg rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 bg-royal-card rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold"
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
                        ? 'bg-gradient-to-r from-gold-dim to-gold text-white'
                        : 'bg-royal-card text-white border border-royal-border'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddField(false); setNewFieldName(''); }}
                  className="flex-1 py-2 bg-royal-card text-white rounded-lg text-sm font-medium border border-royal-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFieldInline}
                  disabled={addingField || !newFieldName.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-lg text-sm font-medium hover:bg-gold-dim disabled:opacity-50"
                >
                  {addingField ? 'Adding...' : 'Add Field'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-white mb-1">Notes</label>
          <textarea
            value={measurementNotes}
            onChange={(e) => setMeasurementNotes(e.target.value)}
            className="w-full px-3 py-2 bg-royal-bg rounded-lg border border-royal-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            rows={2}
            placeholder="Any notes about these measurements..."
          />
        </div>
        <button
          onClick={handleSaveMeasurement}
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Measurements'}
        </button>
      </Modal>

      {/* Send to Colleague Modal */}
      <Modal
        isOpen={showSendToColleague}
        onClose={() => setShowSendToColleague(false)}
        title="Send to Colleague"
      >
        {latestMeasurement && fields ? (
          <div className="space-y-3">
            <p className="text-sm text-white">
              Send {customer.name}&apos;s measurements to a colleague via WhatsApp.
            </p>
            {colleagues.length > 0 ? (
              <div className="space-y-2">
                {colleagues.map((colleague) => {
                  const measurementText = fields
                    .map((f) => {
                      const val = latestMeasurement.fields[f.id];
                      return val !== undefined ? `${f.name}: ${val} ${f.unit}` : null;
                    })
                    .filter(Boolean)
                    .join('\n');

                  const message = `*Client Measurements*\n*Date:* ${formatDate(latestMeasurement.createdAt)}\n\n${measurementText}${latestMeasurement.notes ? `\n\n*Notes:* ${latestMeasurement.notes}` : ''}`;
                  const colleagueNumber = colleague.whatsapp || colleague.phone;
                  const waLink = `https://wa.me/${formatPhoneForWhatsApp(colleagueNumber)}?text=${encodeURIComponent(message)}`;

                  return (
                    <a
                      key={colleague.id}
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-green-400/10 rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{colleague.name}</p>
                        <p className="text-xs text-white">{colleague.whatsapp || colleague.phone}</p>
                      </div>
                      <span className="text-xs text-green-400 font-medium">Send via WhatsApp</span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="bg-royal-bg rounded-xl p-4 text-center">
                <p className="text-sm text-white mb-2">No colleagues added yet</p>
                <p className="text-xs text-white/60 mb-3">Add a contact as &quot;Colleague&quot; to send measurements to them</p>
                <button
                  onClick={() => {
                    setShowSendToColleague(false);
                    router.push('/customers/new?type=colleague');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl text-sm font-medium"
                >
                  + Add Colleague
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-white">No measurements to send.</p>
        )}
      </Modal>
    </div>
  );
}

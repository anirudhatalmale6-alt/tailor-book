'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useInvoice } from '@/hooks/useInvoices';
import { useCurrency, useBusinessName, useBusinessPhone, useBusinessAddress, useBusinessLogo } from '@/hooks/useSettings';
import { db, type Customer, type Order, type Project } from '@/lib/db';
import { formatCurrency, formatDate, getWhatsAppLink } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

export default function InvoiceViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const invoice = useInvoice(id);
  const currency = useCurrency();
  const businessName = useBusinessName();
  const businessPhone = useBusinessPhone();
  const businessAddress = useBusinessAddress();
  const businessLogo = useBusinessLogo();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoice?.customerId) {
      db.customers.get(invoice.customerId).then((c) => setCustomer(c || null));
    }
    if (invoice?.orderId) {
      db.orders.get(invoice.orderId).then((o) => setOrder(o || null));
    }
    if (invoice?.projectId) {
      db.projects.get(invoice.projectId).then((p) => setProject(p || null));
    }
  }, [invoice?.customerId, invoice?.orderId, invoice?.projectId]);

  async function captureInvoiceImage(): Promise<Blob | null> {
    if (!invoiceRef.current) return null;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(invoiceRef.current, {
      backgroundColor: '#1a1028',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  async function handleSaveImage() {
    setSaving(true);
    try {
      const blob = await captureInvoiceImage();
      if (!blob) return;

      const fileName = `Invoice_${invoice?.invoiceNumber || 'SM'}.jpg`;

      // Try native share first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const shareData = { files: [file] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback: download the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Save image error:', err);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleShareWhatsAppImage() {
    setSaving(true);
    try {
      const blob = await captureInvoiceImage();
      if (!blob) return;

      const fileName = `Invoice_${invoice?.invoiceNumber || 'SM'}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Try native share with WhatsApp
      if (navigator.share && navigator.canShare) {
        const shareData = {
          files: [file],
          text: `Invoice ${invoice?.invoiceNumber} - ${formatCurrency(invoice?.total || 0, currency)}`,
        };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }

      // Fallback to text-only WhatsApp
      handleWhatsApp();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleWhatsApp();
      }
    } finally {
      setSaving(false);
    }
  }

  function handleWhatsApp() {
    if (!invoice || !customer) return;

    const lines = [
      `*INVOICE ${invoice.invoiceNumber}*`,
      `From: ${businessName}`,
    ];
    if (businessPhone) lines.push(`Tel: ${businessPhone}`);
    if (businessAddress) lines.push(`Address: ${businessAddress}`);
    lines.push(
      `Date: ${formatDate(invoice.createdAt)}`,
      '',
      `*Bill To:* ${customer.name}`,
    );

    if (customer.phone) lines.push(`Phone: ${customer.phone}`);
    if (customer.address) lines.push(`Address: ${customer.address}`);

    if (project) {
      lines.push('', `*Project:* ${project.name}`);
    }

    lines.push(
      '',
      '*Items:*',
      ...invoice.items.map(
        (item) =>
          `- ${item.description} (x${item.quantity}) = ${formatCurrency(item.total, currency)}`
      ),
      '',
      `Subtotal: ${formatCurrency(invoice.subtotal, currency)}`
    );

    if (invoice.tax > 0) {
      lines.push(`Tax (${invoice.taxRate}%): ${formatCurrency(invoice.tax, currency)}`);
    }

    lines.push(
      `*Total: ${formatCurrency(invoice.total, currency)}*`,
      `Paid: ${formatCurrency(invoice.amountPaid, currency)}`,
      `*Balance Due: ${formatCurrency(invoice.balanceDue, currency)}*`
    );

    if (invoice.notes) {
      lines.push('', `Note: ${invoice.notes}`);
    }

    const messageText = lines.join('\n');
    const phone = customer.whatsapp || customer.phone;
    if (phone) {
      window.open(getWhatsAppLink(phone, messageText), '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`, '_blank');
    }
  }

  if (invoice === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="px-4 pt-4">
        <EmptyState title="Invoice not found" description="This invoice may have been deleted." />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Action Bar - hidden on print */}
      <div className="flex items-center gap-3 mb-4 no-print">
        <button onClick={() => router.back()} className="p-1 text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Invoice</h1>
      </div>

      {/* Invoice Document */}
      <div ref={invoiceRef} className="bg-royal-card rounded-xl shadow-none overflow-hidden mb-3 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-gold-dim to-gold px-5 py-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {businessLogo && (
                <img src={businessLogo} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white/20 p-1 flex-shrink-0" />
              )}
              <div>
                <h2 className="text-lg font-bold">{businessName}</h2>
                {businessPhone && <p className="text-white/80 text-xs">{businessPhone}</p>}
                {businessAddress && <p className="text-white/80 text-xs">{businessAddress}</p>}
                <p className="text-indigo-200 text-xs mt-0.5">INVOICE</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">{invoice.invoiceNumber}</p>
              <p className="text-indigo-200 text-xs">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Customer & Order/Project Info */}
        <div className="px-5 py-4 border-b border-royal-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1">Bill To</p>
              {customer && (
                <>
                  <p className="text-sm font-semibold text-white">{customer.name}</p>
                  {customer.phone && <p className="text-xs text-white">{customer.phone}</p>}
                  {customer.email && <p className="text-xs text-white">{customer.email}</p>}
                  {customer.address && <p className="text-xs text-white mt-0.5">{customer.address}</p>}
                </>
              )}
            </div>
            <div className="text-right">
              {project && (
                <>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1">Project</p>
                  <p className="text-xs font-medium text-white">{project.name}</p>
                </>
              )}
              {order && !project && (
                <>
                  <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1">Order Details</p>
                  {order.fabricType && (
                    <p className="text-xs text-white">Fabric: {order.fabricType}</p>
                  )}
                  {order.deliveryDate && (
                    <p className="text-xs text-white">Delivery: {formatDate(order.deliveryDate)}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-5 py-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-royal-border">
                <th className="text-left text-[10px] font-medium text-white/60 uppercase tracking-wider pb-2">Description</th>
                <th className="text-center text-[10px] font-medium text-white/60 uppercase tracking-wider pb-2 w-12">Qty</th>
                <th className="text-right text-[10px] font-medium text-white/60 uppercase tracking-wider pb-2 w-20">Price</th>
                <th className="text-right text-[10px] font-medium text-white/60 uppercase tracking-wider pb-2 w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="py-2.5 text-sm text-white">{item.description}</td>
                  <td className="py-2.5 text-sm text-white text-center">{item.quantity}</td>
                  <td className="py-2.5 text-sm text-white text-right">{formatCurrency(item.unitPrice, currency)}</td>
                  <td className="py-2.5 text-sm font-medium text-white text-right">{formatCurrency(item.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 pb-4">
          <div className="border-t border-royal-border pt-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-sm text-white">Subtotal</span>
              <span className="text-sm text-white">{formatCurrency(invoice.subtotal, currency)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-white">Tax ({invoice.taxRate}%)</span>
                <span className="text-sm text-white">{formatCurrency(invoice.tax, currency)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-royal-border">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-sm font-bold text-white">{formatCurrency(invoice.total, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-white">Amount Paid</span>
              <span className="text-sm font-medium text-green-400">{formatCurrency(invoice.amountPaid, currency)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-royal-border">
              <span className="text-sm font-bold text-white">Balance Due</span>
              <span className={`text-base font-bold ${invoice.balanceDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(invoice.balanceDue, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-5 pb-4">
            <div className="bg-royal-bg rounded-lg p-3">
              <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-white">{invoice.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-royal-bg border-t border-royal-border">
          <p className="text-[10px] text-white/60 text-center">
            Generated by {businessName} via Stitch Manager
          </p>
        </div>
      </div>

      {/* Action Buttons - hidden on print */}
      <div className="space-y-2 mb-4 no-print">
        {/* Primary: Share as Image via WhatsApp */}
        <button
          onClick={handleShareWhatsAppImage}
          disabled={saving}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:bg-green-800 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          </svg>
          {saving ? 'Preparing...' : 'Send Invoice via WhatsApp'}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSaveImage}
            disabled={saving}
            className="py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {saving ? '...' : 'Save Image'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="py-3 bg-royal-card border border-royal-border text-white rounded-xl font-semibold transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Text Only
          </button>
        </div>
        {project && (
          <button
            onClick={() => router.push(`/projects/${project.id}`)}
            className="w-full py-3 bg-royal-card border border-royal-border text-white rounded-xl font-medium text-sm hover:bg-royal-hover transition-colors"
          >
            View Project
          </button>
        )}
        {order && !project && (
          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            className="w-full py-3 bg-royal-card border border-royal-border text-white rounded-xl font-medium text-sm hover:bg-royal-hover transition-colors"
          >
            View Order
          </button>
        )}
      </div>
    </div>
  );
}

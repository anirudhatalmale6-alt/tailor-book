'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useInvoice } from '@/hooks/useInvoices';
import { useCurrency, useBusinessName } from '@/hooks/useSettings';
import { db, type Customer, type Order, type Project } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

export default function InvoiceViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const invoice = useInvoice(id);
  const currency = useCurrency();
  const businessName = useBusinessName();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);

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

  function handlePrint() {
    window.print();
  }

  function handleWhatsApp() {
    if (!invoice || !customer) return;

    const lines = [
      `*INVOICE ${invoice.invoiceNumber}*`,
      `From: ${businessName}`,
      `Date: ${formatDate(invoice.createdAt)}`,
      '',
      `*Bill To:* ${customer.name}`,
    ];

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

    const text = encodeURIComponent(lines.join('\n'));
    const phone = customer.whatsapp || customer.phone;
    if (phone) {
      const cleaned = phone.replace(/[^0-9+]/g, '').replace('+', '');
      window.open(`https://wa.me/${cleaned}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
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
      <div className="bg-royal-card rounded-xl shadow-none overflow-hidden mb-3 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-gold-dim to-gold px-5 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{businessName}</h2>
              <p className="text-indigo-200 text-xs mt-0.5">INVOICE</p>
            </div>
            <div className="text-right">
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
            Generated by {businessName} via TailorBook
          </p>
        </div>
      </div>

      {/* Action Buttons - hidden on print */}
      <div className="space-y-2 mb-4 no-print">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleWhatsApp}
            className="py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 active:bg-green-800 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="py-3 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl font-semibold hover:bg-gold-dim active:bg-gold-dim transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
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

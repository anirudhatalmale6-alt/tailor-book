'use client';

import { useRouter } from 'next/navigation';
import { type Customer } from '@/lib/db';
import { getInitials, getPhoneLink } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/customers/${customer.id}`)}
      className="bg-royal-card rounded-xl shadow-none p-4 flex items-center gap-3 active:bg-royal-hover transition-colors cursor-pointer"
    >
      <div className="flex-shrink-0">
        {customer.photo ? (
          <img
            src={customer.photo}
            alt={customer.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-royal-hover flex items-center justify-center">
            <span className="text-gold font-semibold text-lg">
              {getInitials(customer.name)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-white font-medium truncate">{customer.name}</h3>
          {customer.contactType === 'colleague' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gold-bg text-gold flex-shrink-0">
              Colleague
            </span>
          )}
        </div>
        {customer.phone && (
          <a
            href={getPhoneLink(customer.phone)}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-white hover:text-gold"
          >
            {customer.phone}
          </a>
        )}
      </div>
      <svg className="w-5 h-5 text-royal-dark flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

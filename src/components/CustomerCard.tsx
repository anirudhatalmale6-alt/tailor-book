'use client';

import Link from 'next/link';
import { type Customer } from '@/lib/db';
import { getInitials, getPhoneLink } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Link href={`/customers/${customer.id}`} className="block">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 active:bg-gray-50 transition-colors">
        <div className="flex-shrink-0">
          {customer.photo ? (
            <img
              src={customer.photo}
              alt={customer.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-lg">
                {getInitials(customer.name)}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-medium truncate">{customer.name}</h3>
          {customer.phone && (
            <a
              href={getPhoneLink(customer.phone)}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-gray-500 hover:text-indigo-600"
            >
              {customer.phone}
            </a>
          )}
        </div>
        <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

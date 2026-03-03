'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/hooks/useCustomers';
import CustomerCard from '@/components/CustomerCard';
import SearchBar from '@/components/SearchBar';
import FloatingButton from '@/components/FloatingButton';
import EmptyState from '@/components/EmptyState';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const customers = useCustomers(search);
  const router = useRouter();

  return (
    <div className="px-4 pt-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-3">Customers</h1>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
        />
      </div>

      {customers === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title={search ? 'No customers found' : 'No customers yet'}
          description={search ? 'Try a different search term' : 'Add your first customer to get started'}
        />
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}

      <FloatingButton
        onClick={() => router.push('/customers/new')}
        label="Add Customer"
      />
    </div>
  );
}

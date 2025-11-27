'use client';

import { useState } from 'react';

import { useClients } from '@/api/domains/clients';
import { cn } from '@/lib/utils';
import type { Client } from '@/shared/types/clients.types';

interface ClientSelectorProps {
  className?: string;
  onClientChange?: (clientId: string) => void;
}

export function ClientSelector({ className, onClientChange }: ClientSelectorProps) {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const { clients, isLoading, error } = useClients();

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClient(clientId);
    onClientChange?.(clientId);
  };

  if (error) {
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <h2 className="text-base font-medium text-neutral-900">Change client</h2>
      <div className="relative">
        <select
          value={selectedClient}
          onChange={handleClientChange}
          disabled={isLoading}
          className={cn(
            'h-9 w-[200px] appearance-none rounded-lg bg-neutral-50 px-3 pr-8 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-200',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <option value="" disabled>
            {isLoading ? 'Loading clients...' : 'Select a client'}
          </option>
          {clients.map((client: Client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          ) : (
            <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

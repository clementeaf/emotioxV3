'use client';

import { useClients } from '@/api/domains/clients';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { BenchmarkChart } from '@/components/clients/BenchmarkChart';
import { BestPerformer } from '@/components/clients/BestPerformer';
import { ClientSelector } from '@/components/clients/ClientSelector';
import { ClientsResearchList } from '@/components/clients/ClientsResearchList';
import { HelpSection } from '@/components/clients/HelpSection';
import { Sidebar } from '@/components/layout/Sidebar';

import {
  adaptResearchData,
  findBestResearch,
  type BestResearchData
} from '@/utils/research';

export const ClientsContent = () => {
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('clientId');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientId || null);

  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
    }
  }, [clientId]);

  // Use TanStack Query hook for clients data
  const { clients, isLoading: isLoadingClients, error } = useClients();
  
  // Filter research by selected client
  const apiResearchData = useMemo(() => {
    if (!selectedClientId || !clients.length) return [];
    
    // Since clients hook extracts from research data, we need to simulate filtering
    // In a real implementation, this would come from a proper research API call
    return [];
  }, [selectedClientId, clients]);

  const isLoadingResearch = isLoadingClients;

  const researchData = useMemo(() => {
    return adaptResearchData(apiResearchData || []);
  }, [apiResearchData]);

  const bestResearch = useMemo((): BestResearchData | null => {
    return findBestResearch(apiResearchData || []);
  }, [apiResearchData]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  const handleDuplicateSuccess = () => {
    // Since we're using TanStack Query, the cache will automatically update
    toast.success('Lista de investigaciones actualizada');
  };

  const handleDeleteSuccess = () => {
    // Since we're using TanStack Query, the cache will automatically update  
    toast.success('Investigación eliminada de la lista');
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar className="w-64 flex-shrink-0" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="h-full p-6">
            <div className="mb-6">
              <ClientSelector onClientChange={handleClientChange} />
            </div>

            {!isLoadingResearch && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <BenchmarkChart />
                  <ClientsResearchList
                    data={researchData}
                    onDuplicateSuccess={handleDuplicateSuccess}
                    onDeleteSuccess={handleDeleteSuccess}
                  />
                </div>
                <div className="space-y-6">
                  <HelpSection />
                  {bestResearch && <BestPerformer data={bestResearch} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

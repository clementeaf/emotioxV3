/**
 * Client data processors
 * Pure functions for processing client data
 */

import type { Client, ClientResponse, ClientsListResponse, ClientStatus } from '@/shared/types/clients.types';

/**
 * Process raw client response into client object
 */
export function processClientResponse(response: ClientResponse): Client {
  return {
    id: response.data.id,
    name: response.data.name,
    email: response.data.email,
    company: response.data.company,
    status: response.data.status || 'active',
    researchCount: response.data.researchCount || 0,
    lastActivity: response.data.lastActivity || new Date().toISOString(),
    createdAt: response.data.createdAt,
    updatedAt: response.data.updatedAt
  };
}

/**
 * Process clients list response
 */
export function processClientsListResponse(response: ClientsListResponse): Client[] {
  return response.data.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    company: client.company,
    status: client.status || 'active',
    researchCount: client.researchCount || 0,
    lastActivity: client.lastActivity || new Date().toISOString(),
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  }));
}

/**
 * Filter clients by status
 */
export function filterClientsByStatus(clients: Client[], status: ClientStatus): Client[] {
  return clients.filter(client => client.status === status);
}

/**
 * Sort clients by name
 */
export function sortClientsByName(clients: Client[]): Client[] {
  return [...clients].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Search clients by name or email
 */
export function searchClients(clients: Client[], query: string): Client[] {
  const lowerQuery = query.toLowerCase();
  return clients.filter(client => 
    client.name.toLowerCase().includes(lowerQuery) ||
    (client.email && client.email.toLowerCase().includes(lowerQuery))
  );
}

import type { ResearchAPIItem, ParticipantAPIItem } from '@/types/research-api.types';

/**
 * Extract clients from research data
 */
export function extractClientsFromResearch(researchData: ResearchAPIItem[]): Client[] {
  // Mock implementation - extract unique clients from research participants
  const clients: Client[] = [];
  const seenIds = new Set<string>();

  researchData.forEach((research: ResearchAPIItem) => {
    if (research.participants) {
      research.participants.forEach((participant: ParticipantAPIItem) => {
        if (!seenIds.has(participant.id)) {
          seenIds.add(participant.id);
          clients.push({
            id: participant.id,
            name: participant.name || 'Unknown',
            email: participant.email,
            company: research.company || research.enterprise || 'Unknown Company',
            status: 'active',
            researchCount: 1,
            lastActivity: research.updatedAt || new Date().toISOString(),
            createdAt: participant.createdAt || new Date().toISOString(),
            updatedAt: participant.updatedAt || new Date().toISOString()
          });
        }
      });
    }
  });

  return clients;
}

/**
 * Filter clients with multiple criteria
 */
export function filterClients(clients: Client[], filters: {
  status?: ClientStatus;
  company?: string;
  search?: string;
}): Client[] {
  let result = clients;

  if (filters.status) {
    result = filterClientsByStatus(result, filters.status);
  }

  if (filters.company) {
    result = result.filter(client => 
      client.company.toLowerCase().includes(filters.company!.toLowerCase())
    );
  }

  if (filters.search) {
    result = searchClients(result, filters.search);
  }

  return result;
}

/**
 * Sort clients with different criteria
 */
export function sortClients(clients: Client[], criteria: 'name' | 'company' | 'lastActivity' | 'researchCount' = 'name'): Client[] {
  switch (criteria) {
    case 'name':
      return sortClientsByName(clients);
    case 'company':
      return [...clients].sort((a, b) => a.company.localeCompare(b.company));
    case 'lastActivity':
      return [...clients].sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    case 'researchCount':
      return [...clients].sort((a, b) => b.researchCount - a.researchCount);
    default:
      return sortClientsByName(clients);
  }
}
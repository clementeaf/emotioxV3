'use client';

import { useState, useEffect, useMemo } from 'react';
import { companiesApi } from '@/api/domains/companies';
import { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/api/domains/companies';
import { Button } from '@/components/ui/Button';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { findSimilarStrings } from '@/utils/stringUtils';
import { SmartSuggestions } from '@/components/ui/SmartSuggestions';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companiesApi.getAll();
      if (response.success) {
        setCompanies(response.data || []);
      } else {
        setError('Error al cargar las empresas');
      }
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Error de conexión al cargar las empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Crear empresa
  const handleCreateCompany = async (data: CreateCompanyRequest) => {
    try {
      const response = await companiesApi.create(data);
      if (response.success) {
        await loadCompanies();
        setShowCreateModal(false);
        setError(null);
      } else {
        setError('Error al crear la empresa');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Error de conexión al crear la empresa');
    }
  };

  // Actualizar empresa
  const handleUpdateCompany = async (id: string, data: UpdateCompanyRequest) => {
    try {
      const response = await companiesApi.update(id, data);
      if (response.success) {
        await loadCompanies();
        setShowEditModal(false);
        setSelectedCompany(null);
        setError(null);
      } else {
        setError('Error al actualizar la empresa');
      }
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Error de conexión al actualizar la empresa');
    }
  };

  // Eliminar empresa
  const handleDeleteCompany = async (id: string) => {
    try {
      await companiesApi.delete(id);
      await loadCompanies();
      setShowDeleteModal(false);
      setSelectedCompany(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Error de conexión al eliminar la empresa');
    }
  };

  if (loading) {
    return (
      <div className="liquid-glass flex-1 mt-10 ml-4 p-4 rounded-2xl mb-4 min-h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] flex flex-col justify-start overflow-y-auto">
        <div className="mx-auto px-6 py-8 w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-12 bg-gray-300 rounded"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1  flex flex-col justify-start">
      <div className="mx-auto px-6 py-8 w-full">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Empresas</h1>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Empresa
            </Button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {companies.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay empresas</h3>
              <p className="text-gray-500 mb-4">Empieza creando tu primera empresa.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Empresa
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-900">
                      Creada
                    </th>
                    <th className="text-right py-3 px-6 text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{company.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            company.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {company.status === 'active' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(company.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <CreateCompanyModal
          onSubmit={handleCreateCompany}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Company Modal */}
      {showEditModal && selectedCompany && (
        <EditCompanyModal
          company={selectedCompany}
          onSubmit={(data) => handleUpdateCompany(selectedCompany.id, data)}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCompany(null);
          }}
        />
      )}

      {/* Delete Company Modal */}
      {showDeleteModal && selectedCompany && (
        <DeleteCompanyModal
          company={selectedCompany}
          onConfirm={() => handleDeleteCompany(selectedCompany.id)}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCompany(null);
          }}
        />
      )}
    </div>
  );
}

// Modal para crear empresa
function CreateCompanyModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: CreateCompanyRequest) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Cargar empresas existentes para verificar duplicados
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await companiesApi.getAll();
        if (response.success) {
          setCompanies(response.data || []);
        }
      } catch (error) {
        console.error('Error loading companies for duplicate check:', error);
      }
    };
    loadCompanies();
  }, []);

  // Verificar si el texto ingresado coincide exactamente con alguna empresa existente
  const exactMatch = companies.find(company =>
    company.name.toLowerCase() === formData.name.toLowerCase()
  );

  // Encontrar empresas similares usando el algoritmo de similitud
  const similarCompanies = useMemo(() => {
    if (!formData.name.trim() || exactMatch) return [];

    const companyNames = companies.map(company => company.name);
    const similarities = findSimilarStrings(formData.name, companyNames, 60);

    return similarities.map(sim => ({
      text: sim.text,
      similarity: sim.similarity,
      value: companies.find(company => company.name === sim.text)?.id || ''
    }));
  }, [formData.name, companies, exactMatch]);

  // Verificar si hay empresas muy similares (posibles duplicados)
  const hasSimilarCompanies = similarCompanies.length > 0;
  const hasHighSimilarity = similarCompanies.some(company => company.similarity >= 85);

  // Detectar automáticamente empresas similares mientras el usuario escribe
  useEffect(() => {
    if (hasSimilarCompanies && hasHighSimilarity && !showSuggestions) {
      setShowSuggestions(true);
    } else if (!hasSimilarCompanies && showSuggestions) {
      setShowSuggestions(false);
    }
  }, [hasSimilarCompanies, hasHighSimilarity, showSuggestions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Si hay coincidencia exacta, no permitir crear
    if (exactMatch) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSuggestion = () => {
    // Cerrar modal ya que se está seleccionando una empresa existente
    onClose();
  };

  const handleCreateAnyway = async () => {
    setShowSuggestions(false);
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nueva Empresa</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la empresa
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  exactMatch ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ingresa el nombre de la empresa"
                required
              />
              {exactMatch && (
                <p className="mt-1 text-sm text-red-600">
                  Ya existe una empresa con este nombre exacto
                </p>
              )}
            </div>

            {/* Smart suggestions */}
            {showSuggestions && hasSimilarCompanies && (
              <SmartSuggestions
                searchText={formData.name}
                similarCompanies={similarCompanies}
                onSelectSuggestion={handleSelectSuggestion}
                onCreateAnyway={handleCreateAnyway}
                className="-mx-6 mb-4"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formData.name.trim() || submitting || !!exactMatch || showSuggestions}
              >
                {submitting ? 'Creando...' : 'Crear Empresa'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal para editar empresa
function EditCompanyModal({
  company,
  onSubmit,
  onClose,
}: {
  company: Company;
  onSubmit: (data: UpdateCompanyRequest) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<UpdateCompanyRequest>({
    name: company.name,
    status: company.status,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Editar Empresa</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la empresa
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa el nombre de la empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formData.name?.trim() || submitting}
              >
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal para confirmar eliminación
function DeleteCompanyModal({
  company,
  onConfirm,
  onClose,
}: {
  company: Company;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Eliminar Empresa</h2>
              <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">
            ¿Estás seguro de que deseas eliminar la empresa{' '}
            <span className="font-semibold">{company.name}</span>?
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Empresa'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
/**
 * Companies Domain Barrel Export
 */

export { companiesApi } from './companies.api';
export {
  useCompanies,
  useCompanyById,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  companiesKeys
} from './companies.hooks';
export type {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  ApiResponse
} from './companies.types';
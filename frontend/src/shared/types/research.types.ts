/**
 * Research Types - Frontend-specific research types
 */

// Import specific types to avoid conflicts
import type {
  ResearchType as SharedResearchType,
  ResearchStatus as SharedResearchStatus,
  ResearchRecord,
  ResearchConfig,
  ResearchFormData,
  ResearchCreationResponse
} from '../interfaces/research.interface';

// import type {
//   ResearchModel,
//   CreateResearchModelRequest,
//   CreateResearchResponse,
//   ResearchBasicData
// } from '../interfaces/research.model'; // Comentado - archivo no existe

// Re-export with explicit names
export type { ResearchRecord, ResearchConfig, ResearchFormData, ResearchCreationResponse };
// export type { ResearchModel as Research, CreateResearchModelRequest as CreateResearchRequest, CreateResearchResponse, ResearchBasicData }; // Comentado - tipos no existen
export { SharedResearchType as ResearchType, SharedResearchStatus as ResearchStatus };

// Type alias for extended research (non-conflicting)
export type ResearchWithExtensions = ResearchRecord & {
  title?: string;
  technique?: string;
}

// Type for research data as it comes from the API (flat structure)
export interface ResearchAPIResponse {
  id: string;
  name: string;
  companyId: string;
  type: string;
  technique: string;
  description: string;
  targetParticipants: number;
  objectives: string[];
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt?: string;
}

// Additional frontend-specific types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  success: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Research list and pagination types
export interface ResearchListResponse {
  researches: ResearchRecord[];
  data: ResearchRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Research creation and update types
export interface CreateResearchRequest {
  name: string;
  companyId: string;
  type: string;
  technique: string;
  description?: string;
  targetParticipants?: number;
  objectives?: string[];
  tags?: string[];
}

export interface UpdateResearchRequest {
  name?: string;
  companyId?: string;
  type?: string;
  technique?: string;
  description?: string;
  targetParticipants?: number;
  objectives?: string[];
  tags?: string[];
  status?: string;
}

// Research validation types
export interface ResearchValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Research form types
export interface ResearchFormState {
  step: number;
  data: ResearchFormData;
  validation: ResearchValidation;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Research table and display types
export interface ResearchTableProps {
  researches: ResearchRecord[];
  onEdit?: (research: ResearchRecord) => void;
  onDelete?: (research: ResearchRecord) => void;
  onView?: (research: ResearchRecord) => void;
  loading?: boolean;
  error?: string | null;
}

export interface ResearchViewProps {
  research: ResearchRecord;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

// Research type information
export interface ResearchTypeInfo {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  features?: string[];
}

// Research types configuration
export interface ResearchTypesProps {
  selectedType?: string;
  onTypeSelect?: (type: string) => void;
  disabled?: boolean;
}

// Client research data
export interface ClientResearch {
  id: string;
  name: string;
  company: string;
  type: string;
  status: string;
  progress: number;
  participants: number;
  createdAt: string;
  updatedAt: string;
}

// Research list props
export interface ResearchListProps {
  researches: ResearchRecord[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEdit?: (research: ResearchRecord) => void;
  onDelete?: (research: ResearchRecord) => void;
  onView?: (research: ResearchRecord) => void;
}

// Research draft for local storage
export interface ResearchDraft {
  id: string;
  data: Partial<ResearchFormData>;
  lastSaved: string;
  version: number;
}

// Research store interface
export interface ResearchStore {
  researches: ResearchRecord[];
  currentResearch: ResearchRecord | null;
  loading: boolean;
  error: string | null;
  draft: ResearchDraft | null;
}

// Research section interface
export interface ResearchSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  required: boolean;
}

// Research context type
export interface ResearchContextType {
  research: ResearchRecord | null;
  sections: ResearchSection[];
  currentSection: string;
  isComplete: boolean;
  updateResearch: (data: Partial<ResearchRecord>) => void;
  updateSection: (sectionId: string, completed: boolean) => void;
  nextSection: () => void;
  previousSection: () => void;
}

// Research sidebar props
export interface ResearchSidebarProps {
  research: ResearchRecord;
  sections: ResearchSection[];
  currentSection: string;
  onSectionChange: (sectionId: string) => void;
}

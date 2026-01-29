import type {
  Case,
  CasesListParams,
  CaseWithDetails,
  CreateCaseRequest,
  CreateSlideRequest,
  Slide,
  UpdateCaseRequest,
} from './types'
import { apiClient } from './client'

export const casesApi = {
  /**
   * List cases with optional filtering
   */
  async list (params?: CasesListParams): Promise<Case[]> {
    return apiClient.get<Case[]>('/cases', params as Record<string, string | number | boolean | undefined>)
  },

  /**
   * Get case details
   */
  async get (id: string): Promise<CaseWithDetails> {
    return apiClient.get<CaseWithDetails>(`/cases/${id}`)
  },

  /**
   * Create a new case
   */
  async create (data: CreateCaseRequest): Promise<Case> {
    return apiClient.post<Case>('/cases', data)
  },

  /**
   * Update case info
   */
  async update (id: string, data: UpdateCaseRequest): Promise<Case> {
    return apiClient.patch<Case>(`/cases/${id}`, data)
  },

  /**
   * Delete a case
   */
  async delete (id: string): Promise<void> {
    return apiClient.delete<void>(`/cases/${id}`)
  },

  /**
   * Add a collaborator to a case
   */
  async addCollaborator (
    caseId: string,
    userId: string,
    role: 'viewer' | 'collaborator' = 'collaborator',
  ): Promise<void> {
    return apiClient.post<void>(`/cases/${caseId}/collaborators`, { userId, role })
  },

  /**
   * Remove a collaborator from a case
   */
  async removeCollaborator (caseId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/cases/${caseId}/collaborators/${userId}`)
  },

  /**
   * List slides for a case
   */
  async getSlides (caseId: string): Promise<Slide[]> {
    return apiClient.get<Slide[]>(`/cases/${caseId}/slides`)
  },

  /**
   * Add a slide to a case
   */
  async addSlide (caseId: string, data: CreateSlideRequest): Promise<Slide> {
    return apiClient.post<Slide>(`/cases/${caseId}/slides`, data)
  },
}

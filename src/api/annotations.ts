import type {
  Annotation,
  CreateAnnotationRequest,
  CreateMessageRequest,
  Message,
  UpdateAnnotationRequest,
} from './types'
import { apiClient } from './client'

interface AnnotationsListResponse {
  annotations: Annotation[]
  total: number
}

export const annotationsApi = {
  /**
   * Get all annotations for a slide
   */
  async getBySlide (slideId: string): Promise<Annotation[]> {
    const response = await apiClient.get<AnnotationsListResponse>(`/v1/slides/${slideId}/annotations`)
    return response.annotations
  },

  /**
   * Create a new annotation for a slide
   */
  async create (slideId: string, data: CreateAnnotationRequest): Promise<Annotation> {
    return apiClient.post<Annotation>(`/v1/slides/${slideId}/annotations`, data)
  },

  /**
   * Get annotation details
   */
  async get (id: number): Promise<Annotation> {
    return apiClient.get<Annotation>(`/v1/annotations/${id}`)
  },

  /**
   * Update annotation
   */
  async update (id: number, data: UpdateAnnotationRequest): Promise<Annotation> {
    return apiClient.put<Annotation>(`/v1/annotations/${id}`, data)
  },

  /**
   * Delete annotation
   */
  async delete (id: number): Promise<void> {
    return apiClient.delete<void>(`/v1/annotations/${id}`)
  },

  /**
   * Get messages/discussion thread for an annotation
   */
  async getMessages (annotationId: number): Promise<Message[]> {
    return apiClient.get<Message[]>(`/v1/annotations/${annotationId}/messages`)
  },

  /**
   * Send a message in annotation thread
   */
  async sendMessage (annotationId: number, data: CreateMessageRequest): Promise<Message> {
    return apiClient.post<Message>(`/v1/annotations/${annotationId}/messages`, data)
  },
}

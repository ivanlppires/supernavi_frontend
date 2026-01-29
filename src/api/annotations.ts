import type {
  Annotation,
  CreateMessageRequest,
  Message,
  UpdateAnnotationRequest,
} from './types'
import { apiClient } from './client'

export const annotationsApi = {
  /**
   * Get annotation details
   */
  async get (id: number): Promise<Annotation> {
    return apiClient.get<Annotation>(`/annotations/${id}`)
  },

  /**
   * Update annotation
   */
  async update (id: number, data: UpdateAnnotationRequest): Promise<Annotation> {
    return apiClient.patch<Annotation>(`/annotations/${id}`, data)
  },

  /**
   * Delete annotation
   */
  async delete (id: number): Promise<void> {
    return apiClient.delete<void>(`/annotations/${id}`)
  },

  /**
   * Get messages/discussion thread for an annotation
   */
  async getMessages (annotationId: number): Promise<Message[]> {
    return apiClient.get<Message[]>(`/annotations/${annotationId}/messages`)
  },

  /**
   * Send a message in annotation thread
   */
  async sendMessage (annotationId: number, data: CreateMessageRequest): Promise<Message> {
    return apiClient.post<Message>(`/annotations/${annotationId}/messages`, data)
  },
}

import type {
  Annotation,
  CreateAnnotationRequest,
  Slide,
} from './types'
import { apiClient } from './client'

export interface SlideProgressResponse {
  slideId: string
  jobId?: string
  status: string
  jobState?: 'active' | 'waiting'
  progress: number
  message?: string
  error?: string
}

export const slidesApi = {
  /**
   * Get slide details
   */
  async get (id: string): Promise<Slide> {
    return apiClient.get<Slide>(`/slides/${id}`)
  },

  /**
   * Get processing progress for a slide
   */
  async getProgress (id: string): Promise<SlideProgressResponse> {
    return apiClient.get<SlideProgressResponse>(`/slides/${id}/progress`)
  },

  /**
   * Update slide metadata
   */
  async update (id: string, data: { name?: string }): Promise<Slide> {
    return apiClient.patch<Slide>(`/slides/${id}`, data)
  },

  /**
   * Delete a slide
   */
  async delete (id: string): Promise<void> {
    return apiClient.delete<void>(`/slides/${id}`)
  },

  /**
   * List annotations for a slide
   */
  async getAnnotations (slideId: string): Promise<Annotation[]> {
    return apiClient.get<Annotation[]>(`/slides/${slideId}/annotations`)
  },

  /**
   * Create an annotation on a slide
   */
  async createAnnotation (slideId: string, data: CreateAnnotationRequest): Promise<Annotation> {
    return apiClient.post<Annotation>(`/slides/${slideId}/annotations`, data)
  },
}

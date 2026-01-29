import type { AiAnalyzeRequest, AiConsultRequest, AiResponse } from './types'
import { apiClient } from './client'

export const aiApi = {
  /**
   * Check if AI (OpenAI) is configured
   */
  async status (): Promise<{ available: boolean }> {
    return apiClient.get<{ available: boolean }>('/ai/status')
  },

  /**
   * Full AI consultation with context and images
   */
  async consult (data: AiConsultRequest): Promise<AiResponse> {
    return apiClient.post<AiResponse>('/ai/consult', data)
  },

  /**
   * Quick ROI analysis (single image)
   */
  async analyze (data: AiAnalyzeRequest): Promise<AiResponse> {
    return apiClient.post<AiResponse>('/ai/analyze', data)
  },
}

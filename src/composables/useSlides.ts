import type {
  Annotation,
  CreateAnnotationRequest,
  CreateMessageRequest,
  Message,
  Slide,
  UpdateAnnotationRequest,
} from '@/api/types'
import { ref } from 'vue'
import { annotationsApi, slidesApi } from '@/api'

// Current slide state
const currentSlide = ref<Slide | null>(null)
const annotations = ref<Annotation[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export function useSlides () {
  // Fetch slide by ID
  async function fetchSlide (id: string): Promise<Slide | null> {
    isLoading.value = true
    error.value = null

    try {
      currentSlide.value = await slidesApi.get(id)
      return currentSlide.value
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar lâmina'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update slide metadata
  async function updateSlide (id: string, data: { name?: string }): Promise<Slide | null> {
    try {
      const updated = await slidesApi.update(id, data)
      if (currentSlide.value?.id === id) {
        currentSlide.value = updated
      }
      return updated
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao atualizar lâmina'
      return null
    }
  }

  // Delete slide
  async function deleteSlide (id: string): Promise<boolean> {
    try {
      await slidesApi.delete(id)
      if (currentSlide.value?.id === id) {
        currentSlide.value = null
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao excluir lâmina'
      return false
    }
  }

  // Fetch annotations for a slide
  async function fetchAnnotations (slideId: string): Promise<Annotation[]> {
    try {
      annotations.value = await slidesApi.getAnnotations(slideId)
      return annotations.value
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar anotações'
      return []
    }
  }

  // Create annotation
  async function createAnnotation (slideId: string, data: CreateAnnotationRequest): Promise<Annotation | null> {
    try {
      const annotation = await slidesApi.createAnnotation(slideId, data)
      annotations.value.push(annotation)
      return annotation
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao criar anotação'
      return null
    }
  }

  // Update annotation
  async function updateAnnotation (id: number, data: UpdateAnnotationRequest): Promise<Annotation | null> {
    try {
      const updated = await annotationsApi.update(id, data)
      const index = annotations.value.findIndex(a => a.id === id)
      if (index !== -1) {
        annotations.value[index] = updated
      }
      return updated
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao atualizar anotação'
      return null
    }
  }

  // Delete annotation
  async function deleteAnnotation (id: number): Promise<boolean> {
    try {
      await annotationsApi.delete(id)
      const index = annotations.value.findIndex(a => a.id === id)
      if (index !== -1) {
        annotations.value.splice(index, 1)
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao excluir anotação'
      return false
    }
  }

  // Get messages for an annotation
  async function getMessages (annotationId: number): Promise<Message[]> {
    try {
      return await annotationsApi.getMessages(annotationId)
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar mensagens'
      return []
    }
  }

  // Send message in annotation thread
  async function sendMessage (annotationId: number, data: CreateMessageRequest): Promise<Message | null> {
    try {
      return await annotationsApi.sendMessage(annotationId, data)
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao enviar mensagem'
      return null
    }
  }

  // Clear current slide
  function clearSlide () {
    currentSlide.value = null
    annotations.value = []
    error.value = null
  }

  // Build DZI URL for a slide
  function getDziUrl (slide: Slide): string | null {
    if (!slide.dziPath) {
      return null
    }

    // If it's a full URL, return as is
    if (slide.dziPath.startsWith('http')) {
      return slide.dziPath
    }

    // Otherwise, build URL from storage path
    // This depends on how your storage is configured
    const baseUrl = import.meta.env.VITE_STORAGE_URL || ''
    return `${baseUrl}/${slide.dziPath}`
  }

  return {
    // State
    currentSlide,
    annotations,
    isLoading,
    error,

    // Methods
    fetchSlide,
    updateSlide,
    deleteSlide,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getMessages,
    sendMessage,
    clearSlide,
    getDziUrl,
  }
}

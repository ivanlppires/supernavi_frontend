import type {
  Case,
  CaseLocation,
  CaseStatus,
  CaseWithDetails,
  CreateCaseRequest,
  Slide,
  UpdateCaseRequest,
} from '@/api/types'
import { computed, ref } from 'vue'
import { casesApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

// Extended case type for frontend use
export interface CaseDisplay extends Case {
  isOwner: boolean
  ownerName?: string
  slidesCount?: number
  thumbnailUrl?: string | null
  inbox: CaseLocation
  collaborators?: Array<{ id: string; name: string; avatarUrl: string | null }>
}

// Singleton state
const cases = ref<CaseDisplay[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const lastFetch = ref<number>(0)

// Cache duration: 1 minute
const CACHE_DURATION = 60 * 1000

export function useCases () {
  const authStore = useAuthStore()

  // Transform API case to display case
  function transformCase (apiCase: any): CaseDisplay {
    return {
      ...apiCase,
      // Use isOwner from API if available, otherwise compute from ownerId
      isOwner: apiCase.isOwner ?? (apiCase.ownerId === authStore.user?.id),
      inbox: apiCase.location,
      collaborators: apiCase.collaborators ?? [],
    }
  }

  // Fetch cases from API
  async function fetchCases (params?: {
    status?: CaseStatus
    location?: CaseLocation
    forceRefresh?: boolean
  }): Promise<void> {
    // Check cache
    const now = Date.now()
    if (!params?.forceRefresh && now - lastFetch.value < CACHE_DURATION && cases.value.length > 0) {
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await casesApi.list({
        status: params?.status,
        location: params?.location,
        limit: 100,
      })

      cases.value = response.map(transformCase)
      lastFetch.value = now
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar casos'
      throw error_
    } finally {
      isLoading.value = false
    }
  }

  // Get case by ID
  async function getCase (id: string): Promise<CaseWithDetails | null> {
    try {
      return await casesApi.get(id)
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar caso'
      return null
    }
  }

  // Create new case
  async function createCase (data: CreateCaseRequest): Promise<Case | null> {
    isLoading.value = true
    error.value = null

    try {
      const newCase = await casesApi.create(data)
      cases.value.unshift(transformCase(newCase))
      return newCase
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao criar caso'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update case
  async function updateCase (id: string, data: UpdateCaseRequest): Promise<Case | null> {
    error.value = null

    try {
      const updated = await casesApi.update(id, data)
      const index = cases.value.findIndex(c => c.id === id)
      if (index !== -1) {
        cases.value[index] = transformCase(updated)
      }
      return updated
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao atualizar caso'
      return null
    }
  }

  // Delete case
  async function deleteCase (id: string): Promise<boolean> {
    error.value = null

    try {
      await casesApi.delete(id)
      const index = cases.value.findIndex(c => c.id === id)
      if (index !== -1) {
        cases.value.splice(index, 1)
      }
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao excluir caso'
      return false
    }
  }

  // Move case to different location (inbox, archive, trash)
  async function moveCase (id: string, location: CaseLocation): Promise<boolean> {
    const result = await updateCase(id, { location })
    return result !== null
  }

  // Update case status
  async function updateStatus (id: string, status: CaseStatus): Promise<boolean> {
    const result = await updateCase(id, { status })
    return result !== null
  }

  // Get slides for a case
  async function getCaseSlides (caseId: string): Promise<Slide[]> {
    try {
      return await casesApi.getSlides(caseId)
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao carregar lâminas'
      return []
    }
  }

  // Add collaborator to case
  async function addCollaborator (
    caseId: string,
    userId: string,
    role: 'viewer' | 'collaborator' = 'collaborator',
  ): Promise<boolean> {
    try {
      await casesApi.addCollaborator(caseId, userId, role)
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao adicionar colaborador'
      return false
    }
  }

  // Remove collaborator from case
  async function removeCollaborator (caseId: string, userId: string): Promise<boolean> {
    try {
      await casesApi.removeCollaborator(caseId, userId)
      return true
    } catch (error_: any) {
      error.value = error_.message || 'Falha ao remover colaborador'
      return false
    }
  }

  // Computed: cases by location
  const inboxCases = computed(() => cases.value.filter(c => c.location === 'inbox'))
  const archivedCases = computed(() => cases.value.filter(c => c.location === 'archived'))
  const trashCases = computed(() => cases.value.filter(c => c.location === 'trash'))

  // Computed: my cases vs collaborations
  const myCases = computed(() => cases.value.filter(c => c.isOwner))
  const collaborationCases = computed(() => cases.value.filter(c => !c.isOwner))

  // Clear cache (e.g., on logout)
  function clearCache () {
    cases.value = []
    lastFetch.value = 0
    error.value = null
  }

  return {
    // State
    cases,
    isLoading,
    error,

    // Methods
    fetchCases,
    getCase,
    createCase,
    updateCase,
    deleteCase,
    moveCase,
    updateStatus,
    getCaseSlides,
    addCollaborator,
    removeCollaborator,
    clearCache,

    // Computed
    inboxCases,
    archivedCases,
    trashCases,
    myCases,
    collaborationCases,
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
}

// User Types
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'pathologist' | 'technician'
  avatarUrl: string | null
  crm: string | null
  specialization: string | null
  createdAt: string
}

export interface UserSettings {
  theme: 'light' | 'dark'
  pushNotifications: boolean
  emailNotifications: boolean
  soundEnabled: boolean
  showOnlineStatus: boolean
}

// Auth Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  crm?: string
  specialization?: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export interface OAuthRequest {
  idToken: string
  user?: {
    name?: {
      firstName?: string
      lastName?: string
    }
  }
}

// Case Types
export type CaseStatus = 'novo' | 'em_analise' | 'concluido'
export type CaseLocation = 'inbox' | 'archived' | 'trash'

export interface Case {
  id: string
  caseNumber: string
  patientName: string
  patientAge: number | null
  patientSex: 'M' | 'F' | null
  status: CaseStatus
  location: CaseLocation
  ownerId: string
  description: string | null
  clinicalNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface CaseWithDetails extends Case {
  owner?: User
  collaborators?: CaseCollaborator[]
  slidesCount?: number
  thumbnailUrl?: string | null
}

export interface CaseCollaborator {
  userId: string
  role: 'viewer' | 'collaborator'
  joinedAt: string
  user?: User
}

export interface CreateCaseRequest {
  caseNumber: string
  patientName: string
  patientAge?: number | null
  patientSex?: 'M' | 'F' | null
  description?: string | null
  clinicalNotes?: string | null
}

export interface UpdateCaseRequest {
  patientName?: string
  patientAge?: number | null
  patientSex?: 'M' | 'F' | null
  status?: CaseStatus
  location?: CaseLocation
  description?: string | null
  clinicalNotes?: string | null
}

export interface CasesListParams {
  status?: CaseStatus
  location?: CaseLocation
  limit?: number
  offset?: number
}

// Slide Types
export type FileFormat = 'svs' | 'tif' | 'tiff' | 'ndpi' | 'dzi'
export type ProcessingStatus = 'pending' | 'processing' | 'uploading' | 'ready' | 'failed'

export interface Slide {
  id: string
  caseId: string
  name: string
  originalFilename: string
  fileFormat: FileFormat
  fileSize: string
  storagePath: string | null
  dziPath: string | null
  thumbnailUrl: string | null
  mpp: string | null
  width: number | null
  height: number | null
  processingStatus: ProcessingStatus
  processingError: string | null
  uploadedAt: string
  processedAt: string | null
}

export interface CreateSlideRequest {
  name: string
  originalFilename: string
  fileFormat: FileFormat
  fileSize: string
  storagePath?: string | null
  mpp?: string | null
  width?: number | null
  height?: number | null
}

// Annotation Types
export type AnnotationType = 'rectangle' | 'arrow' | 'freehand'
export type AnnotationStatus = 'open' | 'pending_review' | 'resolved'
export type AnnotationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface AnnotationCoordinates {
  x: number
  y: number
  width?: number | null
  height?: number | null
  points?: Array<{ x: number, y: number }> | null
}

export interface Annotation {
  id: number
  slideId: string
  name: string
  color: string
  type: AnnotationType
  coordinates: AnnotationCoordinates
  status: AnnotationStatus
  priority: AnnotationPriority
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface CreateAnnotationRequest {
  name: string
  color?: string | null
  type: AnnotationType
  coordinates: AnnotationCoordinates
  priority?: AnnotationPriority | null
}

export interface UpdateAnnotationRequest {
  name?: string
  color?: string
  coordinates?: AnnotationCoordinates
  status?: AnnotationStatus
  priority?: AnnotationPriority
}

// Message Types
export type MessageType = 'text' | 'system' | 'ai_analysis' | 'ai_suggestion'

export interface AiFinding {
  label: string
  value: string
  severity?: 'low' | 'medium' | 'high' | null
}

export interface Message {
  id: string
  annotationId: number
  authorId: string
  content: string
  type: MessageType
  aiConfidence: number | null
  aiFindings: AiFinding[] | null
  createdAt: string
  updatedAt: string
  author?: User
}

export interface CreateMessageRequest {
  content: string
  type?: MessageType | null
}

// Notification Types
export type NotificationType = 'invitation' | 'message' | 'case_update' | 'collaboration'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string | null
  relatedCaseId: string | null
  relatedAnnotationId: number | null
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

export interface NotificationsListParams {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}

// AI Types
export interface AiConsultRequest {
  caseContext?: {
    caseNumber?: string | null
    patientAge?: number | null
    patientSex?: 'M' | 'F' | null
    clinicalNotes?: string | null
    description?: string | null
  }
  thread?: Array<{
    role: 'pathologist' | 'ai'
    authorName?: string | null
    content: string
  }>
  question: string
  images?: Array<{
    base64: string
    mimeType?: 'image/png' | 'image/jpeg' | 'image/webp' | null
    label?: string | null
  }>
}

export interface AiAnalyzeRequest {
  imageBase64: string
  question?: string | null
  caseContext?: AiConsultRequest['caseContext']
}

export interface AiResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

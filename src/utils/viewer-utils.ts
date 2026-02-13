import type { Slide } from '@/api/types'

/**
 * Derive the best case name from available data.
 * Priority: caseNumber > externalCaseBase > slide name > default.
 */
export function deriveCaseName(slide?: Slide | null, caseData?: any): string {
  // 1. From case data (normal flow) — patient name shown separately in info panel
  if (caseData?.caseNumber) return caseData.caseNumber

  // 2. From PathoWeb external_case_base (e.g. "AP26000230")
  if (slide?.externalCaseBase) return slide.externalCaseBase

  // 3. From filename (strip extension)
  if (slide?.name) return slide.name

  return 'Visualizador'
}

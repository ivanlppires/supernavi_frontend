import { describe, it, expect } from 'vitest'
import { deriveCaseName } from '@/utils/viewer-utils'

describe('deriveCaseName', () => {
  it('returns caseNumber from case data', () => {
    const result = deriveCaseName(null, { caseNumber: 'AP26000299' })
    expect(result).toBe('AP26000299')
  })

  it('falls back to externalCaseBase when no case data', () => {
    const slide = { externalCaseBase: 'AP26000230' } as any
    const result = deriveCaseName(slide, null)
    expect(result).toBe('AP26000230')
  })

  it('falls back to slide name when no case or external data', () => {
    const slide = { name: 'sample-slide.svs' } as any
    const result = deriveCaseName(slide)
    expect(result).toBe('sample-slide.svs')
  })

  it('returns default "Visualizador" when no data at all', () => {
    expect(deriveCaseName()).toBe('Visualizador')
    expect(deriveCaseName(null)).toBe('Visualizador')
    expect(deriveCaseName(null, null)).toBe('Visualizador')
    expect(deriveCaseName(null, {})).toBe('Visualizador')
  })

  it('does NOT include patient name (no duplication)', () => {
    const slide = { externalCaseBase: 'AP26000299' } as any
    const caseData = { caseNumber: 'AP26000299', patientName: 'João Silva' }
    const result = deriveCaseName(slide, caseData)
    expect(result).toBe('AP26000299')
    expect(result).not.toContain('João Silva')
  })
})

# PathoWeb Integration — Frontend

Implementacao do viewer read-only via magic links para integracao com o PathoWeb. A extensao Chrome gera um link JWT que abre o viewer sem login, com ferramentas de anotacao desabilitadas.

## Fluxo

```
Chrome Extension
  |
  |  POST /api/ui-bridge/viewer-link
  |
  v
SuperNavi Cloud
  |
  |  { url: "https://app.supernavi.app/viewer?slideId=abc&t=eyJ..." }
  |
  v
Frontend (nova aba)
  |
  |  router guard: detecta ?t= → skip auth
  |  viewer.vue: loadFromMagicLink()
  |    - apiClient.setToken(token)
  |    - isReadOnly = true
  |    - carrega slide normalmente
  |
  v
viewer.vue → provide('viewerReadOnly', isReadOnly)
  |
  v
viewer layout → inject('viewerReadOnly')
  |
  |  v-if="!isReadOnly.value"
  |    - Esconde ROI tools
  |    - Esconde measure tools
  |    - Esconde annotation panel
  |    - Esconde panel toggle button
  |
  v
Viewer funcional (zoom, pan) mas read-only
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/router/index.ts` | Guard permite acesso com `?t=` sem auth |
| `src/pages/viewer.vue` | `loadFromMagicLink()`, `isReadOnly` ref, provide |
| `src/layouts/viewer.vue` | inject `viewerReadOnly`, esconde tools |
| `src/api/client.ts` | `setToken()` para injetar JWT do magic link |

## Router Guard

`src/router/index.ts`

```typescript
// Rotas protegidas
const protectedRoutes = ['/dashboard', '/viewer']

router.beforeEach(async (to) => {
  // Magic link: skip auth quando ?t= presente
  if (to.path === '/viewer' && to.query.t) {
    return true  // permite sem auth
  }

  // Auth normal para outras rotas protegidas
  if (protectedRoutes.includes(to.path)) {
    const token = apiClient.getToken()
    if (!token) return '/login'
  }
})
```

O parametro `?t=` e o JWT gerado pelo endpoint `POST /api/ui-bridge/viewer-link`.

## Viewer Page

`src/pages/viewer.vue`

### Setup

```typescript
const isReadOnly = ref(false)
provide('viewerReadOnly', isReadOnly)
```

### loadFromMagicLink()

Chamada quando `route.query.t` esta presente:

```typescript
async function loadFromMagicLink(slideId: string, token: string) {
  isReadOnly.value = true
  apiClient.setToken(token)  // JWT injetado como bearer token

  // Carrega slide normalmente (mesmo fluxo de /viewer?slideId=...)
  await loadSlide(slideId)
}
```

O JWT e tratado como bearer token normal pelo API client — o backend valida as claims (`purpose: 'viewer'`, `readOnly: true`).

### Inicializacao

```typescript
onMounted(async () => {
  const slideId = route.query.slideId as string
  const magicToken = route.query.t as string

  if (slideId && magicToken) {
    await loadFromMagicLink(slideId, magicToken)
  } else if (slideId) {
    await loadSlide(slideId)
  }
})
```

## Viewer Layout — Read-Only Mode

`src/layouts/viewer.vue`

### Inject

```typescript
const isReadOnly = inject<{ value: boolean }>('viewerReadOnly', ref(false))
```

### Elementos escondidos em read-only

**Desktop toolbar (ROI tools):**
```html
<template v-if="!isReadOnly.value">
  <!-- Rectangle ROI, Circle ROI, Freehand ROI -->
</template>
```

**Desktop toolbar (annotation/measure tools):**
```html
<template v-if="!isReadOnly.value">
  <!-- Measure tool, Annotation panel toggle -->
</template>
```

**Right panel (annotations):**
```html
<v-navigation-drawer v-if="!mobile && !isReadOnly.value" ...>
  <!-- Annotation list, thread list -->
</v-navigation-drawer>
```

**Panel toggle button:**
```html
<v-btn v-if="!mobile && !rightPanel && !focusMode && !isReadOnly.value" ...>
```

**Mobile toolbar:** mesma logica com `v-if="!isReadOnly.value"`.

### Ferramentas que permanecem ativas

- Zoom (scroll, botoes +/-)
- Pan (drag)
- Minimap
- Fullscreen
- Focus mode
- Tile source badge (edge/cloud indicator)

## API Client

`src/api/client.ts`

```typescript
class ApiClient {
  getToken(): string | null {
    return localStorage.getItem('supernavi_token')
  }

  setToken(token: string): void {
    localStorage.setItem('supernavi_token', token)
  }

  clearToken(): void {
    localStorage.removeItem('supernavi_token')
  }

  // Headers incluem Authorization: Bearer <token> automaticamente
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }
}
```

O magic link JWT e armazenado em `localStorage` como `supernavi_token` e enviado como `Bearer` header em todas as requests subsequentes. O token expira apos o TTL configurado (padrao 5 min) e o backend rejeita requests com token expirado.

## Seguranca

| Aspecto | Implementacao |
|---------|---------------|
| Token binding | JWT contem `slideId` — backend pode validar que o slide acessado e o mesmo do token |
| Read-only | `readOnly: true` no JWT — frontend esconde tools, backend pode enforcar |
| Expiracao | TTL curto (5 min padrao) — link nao funciona apos expirar |
| Sem login | Magic link injeta JWT diretamente — nao cria sessao persistente |
| localStorage | Token sobrescreve qualquer token anterior — limpar aba fecha a sessao |

## Teste manual

1. Gere um magic link:
```bash
curl -s -X POST -H 'x-supernavi-key: snavi-dev-bridge-key-2026' \
  -H 'Content-Type: application/json' \
  -d '{"slideId":"SLIDE_ID"}' \
  http://localhost:3001/api/ui-bridge/viewer-link | jq -r .url
```

2. Abra a URL retornada no browser

3. Verifique:
   - Slide carrega normalmente (zoom/pan funciona)
   - Toolbar nao mostra: ROI tools, measure, annotations panel
   - Apos 5 minutos, recarregar a pagina deve falhar (token expirado)

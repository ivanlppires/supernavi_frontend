<template>
  <div class="landing-page">
    <!-- Scan Line Animation -->
    <div class="scan-line" />

    <!-- Login Dialog -->
    <v-dialog v-model="showLoginDialog" max-width="440" persistent>
      <v-card class="login-card">
        <!-- Close Button -->
        <v-btn
          class="close-btn"
          icon
          size="small"
          variant="text"
          @click="closeLoginDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>

        <!-- Login View -->
        <template v-if="authView === 'login'">
          <div class="login-header">
            <img alt="SuperNavi" class="login-logo" src="/images/logosupernavi.png">
            <h2 class="login-title">Bem-vindo de volta</h2>
            <p class="login-subtitle">Entre para acessar a plataforma</p>
          </div>

          <div class="login-content">
            <!-- Social Login Buttons -->
            <div class="social-buttons">
              <v-btn
                block
                class="social-btn google-btn"
                height="48"
                variant="outlined"
                @click="loginWithGoogle"
              >
                <svg class="social-icon" height="20" viewBox="0 0 24 24" width="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continuar com Google</span>
              </v-btn>

              <v-btn
                block
                class="social-btn apple-btn"
                height="48"
                variant="outlined"
                @click="loginWithApple"
              >
                <v-icon class="social-icon" size="20">mdi-apple</v-icon>
                <span>Continuar com Apple</span>
              </v-btn>
            </div>

            <!-- Divider -->
            <div class="auth-divider">
              <span>ou</span>
            </div>

            <!-- Error Alert -->
            <v-alert
              v-if="loginError"
              class="mb-4"
              closable
              density="compact"
              type="error"
              variant="tonal"
              @click:close="loginError = ''"
            >
              {{ loginError }}
            </v-alert>

            <!-- Email/Password Form -->
            <v-form ref="loginFormRef" @submit.prevent="handleLogin">
              <v-text-field
                v-model="loginForm.email"
                class="auth-input"
                density="comfortable"
                hide-details="auto"
                label="E-mail"
                placeholder="seu@email.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="[rules.required, rules.email]"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="loginForm.password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="auth-input mt-3"
                density="comfortable"
                hide-details="auto"
                label="Senha"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :rules="[rules.required]"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />

              <div class="forgot-password">
                <a href="#" @click.prevent="authView = 'forgot'">Esqueceu a senha?</a>
              </div>

              <v-btn
                block
                class="login-btn"
                color="primary"
                height="48"
                :loading="isLoading"
                type="submit"
                variant="flat"
              >
                Entrar
              </v-btn>
            </v-form>

            <!-- Sign Up Link -->
            <div class="signup-link">
              <span>Não tem uma conta?</span>
              <a href="#" @click.prevent="authView = 'signup'">Cadastre-se</a>
            </div>
          </div>
        </template>

        <!-- Forgot Password View -->
        <template v-else-if="authView === 'forgot'">
          <div class="login-header">
            <v-icon class="header-icon" color="primary" size="48">mdi-lock-reset</v-icon>
            <h2 class="login-title">Recuperar senha</h2>
            <p class="login-subtitle">Enviaremos um link para redefinir sua senha</p>
          </div>

          <div class="login-content">
            <v-form ref="forgotFormRef" @submit.prevent="handleForgotPassword">
              <v-text-field
                v-model="forgotEmail"
                class="auth-input"
                density="comfortable"
                hide-details="auto"
                label="E-mail"
                placeholder="seu@email.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="[rules.required, rules.email]"
                type="email"
                variant="outlined"
              />

              <v-btn
                block
                class="login-btn mt-4"
                color="primary"
                height="48"
                :loading="isLoading"
                type="submit"
                variant="flat"
              >
                Enviar link de recuperação
              </v-btn>
            </v-form>

            <div class="back-to-login">
              <a href="#" @click.prevent="authView = 'login'">
                <v-icon size="16">mdi-arrow-left</v-icon>
                Voltar para login
              </a>
            </div>
          </div>
        </template>

        <!-- Sign Up View -->
        <template v-else-if="authView === 'signup'">
          <div class="login-header">
            <img alt="SuperNavi" class="login-logo" src="/images/logosupernavi.png">
            <h2 class="login-title">Criar conta</h2>
            <p class="login-subtitle">Preencha os dados para se cadastrar</p>
          </div>

          <div class="login-content">
            <!-- Social Sign Up -->
            <div class="social-buttons">
              <v-btn
                block
                class="social-btn google-btn"
                height="48"
                variant="outlined"
                @click="loginWithGoogle"
              >
                <svg class="social-icon" height="20" viewBox="0 0 24 24" width="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Cadastrar com Google</span>
              </v-btn>

              <v-btn
                block
                class="social-btn apple-btn"
                height="48"
                variant="outlined"
                @click="loginWithApple"
              >
                <v-icon class="social-icon" size="20">mdi-apple</v-icon>
                <span>Cadastrar com Apple</span>
              </v-btn>
            </div>

            <!-- Divider -->
            <div class="auth-divider">
              <span>ou</span>
            </div>

            <!-- Error Alert -->
            <v-alert
              v-if="signupError"
              class="mb-4"
              closable
              density="compact"
              type="error"
              variant="tonal"
              @click:close="signupError = ''"
            >
              {{ signupError }}
            </v-alert>

            <!-- Sign Up Form -->
            <v-form ref="signupFormRef" @submit.prevent="handleSignup">
              <v-text-field
                v-model="signupForm.name"
                class="auth-input"
                density="comfortable"
                hide-details="auto"
                label="Nome completo"
                placeholder="Dr. João Silva"
                prepend-inner-icon="mdi-account-outline"
                :rules="[rules.required]"
                variant="outlined"
              />

              <v-text-field
                v-model="signupForm.email"
                class="auth-input mt-3"
                density="comfortable"
                hide-details="auto"
                label="E-mail"
                placeholder="seu@email.com"
                prepend-inner-icon="mdi-email-outline"
                :rules="[rules.required, rules.email]"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="signupForm.password"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="auth-input mt-3"
                density="comfortable"
                hide-details="auto"
                label="Senha"
                placeholder="Mínimo 8 caracteres"
                prepend-inner-icon="mdi-lock-outline"
                :rules="[rules.required, rules.minLength]"
                :type="showPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showPassword = !showPassword"
              />

              <v-text-field
                v-model="signupForm.confirmPassword"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="auth-input mt-3"
                density="comfortable"
                hide-details="auto"
                label="Confirmar senha"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-check-outline"
                :rules="[rules.required, rules.passwordMatch]"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />

              <v-checkbox
                v-model="signupForm.acceptTerms"
                class="terms-checkbox mt-2"
                density="compact"
                hide-details
              >
                <template #label>
                  <span class="terms-text">
                    Eu aceito os <a href="#" @click.stop>Termos de Uso</a> e a <a href="#" @click.stop>Política de Privacidade</a>
                  </span>
                </template>
              </v-checkbox>

              <v-btn
                block
                class="login-btn mt-4"
                color="primary"
                :disabled="!signupForm.acceptTerms"
                height="48"
                :loading="isLoading"
                type="submit"
                variant="flat"
              >
                Criar conta
              </v-btn>
            </v-form>

            <!-- Login Link -->
            <div class="signup-link">
              <span>Já tem uma conta?</span>
              <a href="#" @click.prevent="authView = 'login'">Entrar</a>
            </div>
          </div>
        </template>

        <!-- Success Message View -->
        <template v-else-if="authView === 'success'">
          <div class="success-view">
            <v-icon class="success-icon" color="success" size="64">mdi-check-circle</v-icon>
            <h2 class="login-title">{{ successMessage.title }}</h2>
            <p class="login-subtitle">{{ successMessage.text }}</p>
            <v-btn
              class="mt-4"
              color="primary"
              variant="tonal"
              @click="authView = 'login'"
            >
              Voltar para login
            </v-btn>
          </div>
        </template>
      </v-card>
    </v-dialog>

    <!-- Hero Section -->
    <v-parallax class="hero-section" src="/images/hero-background.jpg">
      <!-- Geometric Overlay -->
      <div class="hero-overlay">
        <div class="grid-pattern" />
        <div class="gradient-overlay" />
      </div>

      <!-- Corner Brackets (Clinical Frame) -->
      <div class="clinical-frame">
        <div class="corner corner-tl" />
        <div class="corner corner-tr" />
        <div class="corner corner-bl" />
        <div class="corner corner-br" />
      </div>

      <!-- Main Content -->
      <div class="hero-content">
        <!-- Top Bar -->
        <div class="top-bar">
          <div class="system-status">
            <span class="status-dot" />
            <span class="status-text">Sistema Operacional</span>
          </div>
          <div class="language-selector">
            <button class="lang-current" @click="langMenuOpen = !langMenuOpen">
              <v-icon size="14">mdi-web</v-icon>
              <span>{{ currentLang === 'pt' ? 'PT-BR' : 'EN' }}</span>
              <v-icon size="12">{{ langMenuOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            </button>
            <div v-if="langMenuOpen" class="lang-dropdown">
              <button
                class="lang-option"
                :class="{ active: currentLang === 'pt' }"
                @click="setLanguage('pt')"
              >
                <span class="lang-code">PT-BR</span>
                <span class="lang-name">Português</span>
              </button>
              <button
                class="lang-option"
                :class="{ active: currentLang === 'en' }"
                @click="setLanguage('en')"
              >
                <span class="lang-code">EN</span>
                <span class="lang-name">English</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Central Content -->
        <div class="central-content">
          <!-- Logo -->
          <div class="logo-container">
            <img alt="SuperNavi" class="logo-image" src="/images/logosupernavi.png">
          </div>

          <!-- Brand -->
          <h1 class="brand-name"><span class="brand-super">Super</span><span class="brand-navi">Navi</span></h1>
          <p class="brand-tagline">Super Navigation for Digital Pathology</p>

          <!-- Key Metrics -->
          <div class="metrics-row">
            <div class="metric">
              <span class="metric-value">40×</span>
              <span class="metric-label">Magnificação</span>
            </div>
            <div class="metric-divider" />
            <div class="metric">
              <span class="metric-value">0.25μm</span>
              <span class="metric-label">Resolução</span>
            </div>
            <div class="metric-divider" />
            <div class="metric">
              <span class="metric-value">99.9%</span>
              <span class="metric-label">Uptime</span>
            </div>
          </div>

          <!-- CTA Buttons -->
          <div class="cta-group">
            <v-btn
              class="cta-primary"
              height="56"
              variant="flat"
              @click="goToDashboard"
            >
              <span class="cta-text">Acessar Plataforma</span>
              <v-icon class="cta-arrow" size="20">mdi-arrow-right</v-icon>
            </v-btn>

            <v-btn
              class="cta-secondary"
              height="56"
              variant="outlined"
            >
              <span>Documentação</span>
            </v-btn>
          </div>
        </div>

        <!-- Bottom Info -->
        <div class="bottom-bar">
          <div class="certifications">
            <span class="cert-item">ANVISA</span>
            <span class="cert-divider">•</span>
            <span class="cert-item">ISO 15189</span>
            <span class="cert-divider">•</span>
            <span class="cert-item">LGPD</span>
          </div>
          <div class="scroll-hint">
            <span>Deslize para explorar</span>
            <v-icon class="scroll-arrow" size="16">mdi-chevron-down</v-icon>
          </div>
        </div>
      </div>
    </v-parallax>

    <!-- Features Section -->
    <section class="features-section">
      <v-container class="features-container">
        <!-- Section Header -->
        <div class="section-header">
          <div class="section-label">Capacidades</div>
          <h2 class="section-title">Tecnologia de Precisão Diagnóstica</h2>
          <p class="section-subtitle">
            Ferramentas projetadas para o fluxo de trabalho do patologista moderno
          </p>
        </div>

        <!-- Features Grid -->
        <div class="features-grid">
          <div
            v-for="(feature, index) in features"
            :key="feature.title"
            class="feature-card"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="feature-number">{{ String(index + 1).padStart(2, '0') }}</div>
            <div class="feature-icon-container">
              <v-icon class="feature-icon" size="32">{{ feature.icon }}</v-icon>
            </div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-description">{{ feature.description }}</p>
            <div class="feature-line" />
          </div>
        </div>
      </v-container>
    </section>

    <!-- Specs Section -->
    <section class="specs-section">
      <v-container>
        <v-row align="center">
          <v-col cols="12" md="5">
            <div class="specs-content">
              <div class="section-label light">Especificações</div>
              <h2 class="specs-title">Visualização de Alta Performance</h2>
              <p class="specs-description">
                Motor de renderização otimizado para navegação fluida em imagens de até 100.000 × 100.000 pixels.
              </p>

              <div class="specs-list">
                <div v-for="spec in specifications" :key="spec.label" class="spec-item">
                  <div class="spec-bar">
                    <div class="spec-fill" :style="{ width: spec.value }" />
                  </div>
                  <div class="spec-info">
                    <span class="spec-label">{{ spec.label }}</span>
                    <span class="spec-value">{{ spec.display }}</span>
                  </div>
                </div>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="7">
            <div class="specs-visual">
              <div class="visual-frame">
                <div class="visual-scan-line" />
                <div class="visual-grid" />
                <div class="visual-center">
                  <div class="crosshair crosshair-h" />
                  <div class="crosshair crosshair-v" />
                  <div class="magnification-ring" />
                </div>
                <div class="visual-data">
                  <span>ZOOM: 40×</span>
                  <span>FPS: 60</span>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-background" />
      <v-container>
        <div class="cta-content">
          <h2 class="cta-title">Pronto para Começar?</h2>
          <p class="cta-subtitle">
            Acesse a plataforma e transforme seu laboratório
          </p>
          <v-btn
            class="cta-final-btn"
            height="60"
            variant="flat"
            @click="goToDashboard"
          >
            <span>Iniciar Agora</span>
            <v-icon class="ml-2" size="20">mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </v-container>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <v-container>
        <div class="footer-content">
          <div class="footer-brand">
            <img alt="SuperNavi" class="footer-logo" src="/images/logosupernavi.png">
            <span class="footer-name"><span class="brand-super">Super</span><span class="brand-navi">Navi</span></span>
          </div>
          <div class="footer-links">
            <a href="#">Documentação</a>
            <a href="#">Suporte</a>
            <a href="#">Privacidade</a>
            <a href="#">Termos</a>
          </div>
          <div class="footer-copyright">
            © {{ currentYear }} SuperNavi. Todos os direitos reservados.
          </div>
        </div>
      </v-container>
    </footer>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useGoogleSignIn } from '@/composables/useGoogleSignIn'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()
  const googleSignIn = useGoogleSignIn()
  const currentYear = computed(() => new Date().getFullYear())

  // Language
  const currentLang = ref<'pt' | 'en'>('pt')
  const langMenuOpen = ref(false)

  function setLanguage (lang: 'pt' | 'en') {
    currentLang.value = lang
    langMenuOpen.value = false
  }

  // Auth Dialog
  const showLoginDialog = ref(false)
  const authView = ref<'login' | 'forgot' | 'signup' | 'success'>('login')
  const isLoading = ref(false)
  const showPassword = ref(false)
  const showConfirmPassword = ref(false)

  const loginFormRef = ref()
  const forgotFormRef = ref()
  const signupFormRef = ref()

  const loginForm = ref({
    email: '',
    password: '',
  })
  const loginError = ref('')

  const forgotEmail = ref('')

  const signupForm = ref({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const signupError = ref('')

  const successMessage = ref({
    title: '',
    text: '',
  })

  // Validation rules
  const rules = {
    required: (v: string) => !!v || 'Campo obrigatório',
    email: (v: string) => /.+@.+\..+/.test(v) || 'E-mail inválido',
    minLength: (v: string) => v.length >= 8 || 'Mínimo 8 caracteres',
    passwordMatch: (v: string) => v === signupForm.value.password || 'As senhas não coincidem',
  }

  function openLoginDialog () {
    showLoginDialog.value = true
    authView.value = 'login'
  }

  function closeLoginDialog () {
    showLoginDialog.value = false
    // Reset forms and errors
    loginForm.value = { email: '', password: '' }
    loginError.value = ''
    forgotEmail.value = ''
    signupForm.value = { name: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
    signupError.value = ''
    showPassword.value = false
    showConfirmPassword.value = false
  }

  async function handleLogin () {
    const { valid } = await loginFormRef.value?.validate()
    if (!valid) return

    loginError.value = ''
    isLoading.value = true
    const success = await authStore.login(loginForm.value.email, loginForm.value.password)
    isLoading.value = false

    if (success) {
      closeLoginDialog()
      router.push('/dashboard')
    } else {
      loginError.value = authStore.error || 'E-mail ou senha incorretos'
    }
  }

  async function handleForgotPassword () {
    const { valid } = await forgotFormRef.value?.validate()
    if (!valid) return

    isLoading.value = true
    // Simulate sending email
    setTimeout(() => {
      isLoading.value = false
      successMessage.value = {
        title: 'E-mail enviado!',
        text: `Enviamos um link de recuperação para ${forgotEmail.value}`,
      }
      authView.value = 'success'
      forgotEmail.value = ''
    }, 1000)
  }

  async function handleSignup () {
    const { valid } = await signupFormRef.value?.validate()
    if (!valid) return

    signupError.value = ''
    isLoading.value = true
    const success = await authStore.register({
      name: signupForm.value.name,
      email: signupForm.value.email,
      password: signupForm.value.password,
    })
    isLoading.value = false

    if (success) {
      closeLoginDialog()
      router.push('/dashboard')
    } else {
      signupError.value = authStore.error || 'Erro ao criar conta. Tente novamente.'
    }
  }

  async function loginWithGoogle () {
    loginError.value = ''
    signupError.value = ''

    try {
      isLoading.value = true
      const idToken = await googleSignIn.signIn()
      const success = await authStore.googleLogin(idToken)

      if (success) {
        closeLoginDialog()
        router.push('/dashboard')
      } else {
        const errorMsg = authStore.error || 'Falha ao fazer login com Google'
        if (authView.value === 'signup') {
          signupError.value = errorMsg
        } else {
          loginError.value = errorMsg
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao conectar com Google'
      if (authView.value === 'signup') {
        signupError.value = errorMsg
      } else {
        loginError.value = errorMsg
      }
    } finally {
      isLoading.value = false
    }
  }

  async function loginWithApple () {
    isLoading.value = true
    // TODO: Implement Apple Sign-In SDK to get idToken
    // For now, show a message that OAuth is not yet configured
    console.log('Apple OAuth not yet implemented - requires Apple Sign-In SDK integration')
    isLoading.value = false

    // When implemented:
    // const { idToken, user } = await appleSignIn.getIdToken()
    // const success = await authStore.appleLogin(idToken, user?.name)
    // if (success) { closeLoginDialog(); router.push('/dashboard') }
  }

  const features = [
    {
      icon: 'mdi-magnify-scan',
      title: 'Visualização WSI',
      description: 'Navegação fluida em Whole Slide Images com zoom contínuo e carregamento progressivo.',
    },
    {
      icon: 'mdi-draw-pen',
      title: 'Anotações Vetoriais',
      description: 'Marcações precisas com ferramentas de desenho calibradas em micrômetros.',
    },
    {
      icon: 'mdi-brain',
      title: 'Análise por IA',
      description: 'Algoritmos de detecção automática para auxílio diagnóstico integrado.',
    },
    {
      icon: 'mdi-account-supervisor',
      title: 'Colaboração',
      description: 'Discussões em tempo real com sincronização de viewport entre patologistas.',
    },
    {
      icon: 'mdi-file-certificate',
      title: 'Laudos Digitais',
      description: 'Geração automatizada de relatórios com rastreabilidade completa.',
    },
    {
      icon: 'mdi-shield-check',
      title: 'Conformidade',
      description: 'Infraestrutura em conformidade com LGPD, HIPAA e ISO 15189.',
    },
  ]

  const specifications = [
    { label: 'Tempo de Carregamento', value: '95%', display: '< 200ms' },
    { label: 'Taxa de Quadros', value: '100%', display: '60 FPS' },
    { label: 'Compressão', value: '85%', display: 'JPEG2000' },
    { label: 'Cache Hit Rate', value: '92%', display: '92%' },
  ]

  function goToDashboard () {
    openLoginDialog()
  }
</script>

<style scoped lang="scss">
// ============================================
// Design Tokens
// ============================================
$color-dark: #0a0f1c;
$color-dark-elevated: #111827;
$color-primary: #2C5F8D;
$color-secondary: #4A90A4;
$color-accent: #7FC8A9;
$color-text: #f8fafc;
$color-text-muted: #94a3b8;
$color-border: rgba(148, 163, 184, 0.15);

$font-display: 'Instrument Sans', system-ui, sans-serif;
$font-mono: 'JetBrains Mono', 'SF Mono', monospace;

// ============================================
// Base
// ============================================
.landing-page {
  background: $color-dark;
  color: $color-text;
  min-height: 100vh;
  overflow-x: hidden;
}

// ============================================
// Scan Line Animation
// ============================================
.scan-line {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, $color-accent, transparent);
  z-index: 1000;
  animation: scanDown 3s ease-out forwards;
  opacity: 0.8;
  pointer-events: none;
}

@keyframes scanDown {
  0% {
    top: 0;
    opacity: 0.8;
  }
  100% {
    top: 100vh;
    opacity: 0;
  }
}

// ============================================
// Hero Section
// ============================================
.hero-section {
  position: relative;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;

  :deep(.v-parallax__image-container) {
    filter: brightness(0.15) saturate(0.5);
  }
}

.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba($color-secondary, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba($color-secondary, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

.gradient-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba($color-dark, 0.95) 0%, rgba($color-dark, 0.75) 30%, rgba($color-dark, 0.7) 50%, rgba($color-dark, 0.75) 70%, rgba($color-dark, 0.95) 100%);
}

// Clinical Frame
.clinical-frame {
  position: absolute;
  inset: 30px;
  z-index: 2;
  pointer-events: none;

  @media (max-width: 768px) {
    inset: 20px;
  }
}

.corner {
  position: absolute;
  width: 40px;
  height: 40px;
  border-color: rgba($color-accent, 0.4);
  border-style: solid;
  border-width: 0;

  &-tl {
    top: 0;
    left: 0;
    border-top-width: 2px;
    border-left-width: 2px;
  }
  &-tr {
    top: 0;
    right: 0;
    border-top-width: 2px;
    border-right-width: 2px;
  }
  &-bl {
    bottom: 0;
    left: 0;
    border-bottom-width: 2px;
    border-left-width: 2px;
  }
  &-br {
    bottom: 0;
    right: 0;
    border-bottom-width: 2px;
    border-right-width: 2px;
  }
}

// Hero Content
.hero-content {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 40px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 24px;
  }
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: fadeIn 1s ease-out 0.5s both;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: $font-mono;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $color-accent;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.language-selector {
  position: relative;
  font-family: $font-mono;
  font-size: 11px;
  letter-spacing: 0.05em;
}

.lang-current {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid $color-border;
  color: $color-text-muted;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: $color-text;
    border-color: rgba($color-text-muted, 0.3);
  }
}

.lang-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: $color-dark-elevated;
  border: 1px solid $color-border;
  border-radius: 6px;
  overflow: hidden;
  min-width: 140px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  animation: dropdownFadeIn 0.15s ease-out;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: $color-text-muted;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: rgba($color-text, 0.05);
    color: $color-text;
  }

  &.active {
    background: rgba($color-accent, 0.1);
    color: $color-accent;

    .lang-code {
      color: $color-accent;
    }
  }
}

.lang-code {
  font-weight: 600;
  min-width: 40px;
}

.lang-name {
  font-size: 10px;
  opacity: 0.7;
}

// Central Content
.central-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  min-height: 0;
}

.logo-container {
  animation: fadeIn 1s ease-out 0.3s both;
  margin-bottom: -20px;
}

.logo-image {
  width: 120px;
  height: 120px;
  object-fit: contain;
  filter: brightness(0) invert(1);

  @media (max-width: 600px) {
    width: 90px;
    height: 90px;
  }
}

.brand-name {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: clamp(48px, 8vw, 72px);
  color: $color-text;
  margin: 0;
  animation: fadeIn 1s ease-out 0.4s both;
}

.brand-super {
  font-weight: 400;
}

.brand-navi {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.brand-tagline {
  font-family: $font-mono;
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: $color-text-muted;
  margin: 0;
  animation: fadeIn 1s ease-out 0.6s both;
}

// Metrics
.metrics-row {
  display: flex;
  align-items: center;
  gap: 32px;
  animation: fadeIn 1s ease-out 0.7s both;

  @media (max-width: 600px) {
    gap: 16px;
  }
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.metric-value {
  font-family: $font-mono;
  font-size: 24px;
  font-weight: 500;
  color: $color-accent;

  @media (max-width: 600px) {
    font-size: 18px;
  }
}

.metric-label {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.metric-divider {
  width: 1px;
  height: 32px;
  background: $color-border;
}

// CTA Group
.cta-group {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  animation: fadeIn 1s ease-out 0.8s both;

  @media (max-width: 600px) {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
    margin-top: 16px;
  }
}

.cta-primary {
  background: $color-text !important;
  color: $color-dark !important;
  padding: 0 32px !important;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba($color-text, 0.2);

    .cta-arrow {
      transform: translateX(4px);
    }
  }
}

.cta-text {
  margin-right: 8px;
}

.cta-arrow {
  transition: transform 0.3s ease;
}

.cta-secondary {
  border-color: rgba($color-text, 0.3) !important;
  color: $color-text !important;
  padding: 0 32px !important;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;

  &:hover {
    border-color: $color-text !important;
    background: rgba($color-text, 0.05) !important;
  }
}

// Bottom Bar
.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: fadeIn 1s ease-out 1s both;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 16px;
  }
}

.certifications {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: $font-mono;
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: $color-text-muted;
}

.cert-divider {
  opacity: 0.3;
}

.scroll-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $color-text-muted;

  .scroll-arrow {
    animation: bounce 2s ease-in-out infinite;
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ============================================
// Features Section
// ============================================
.features-section {
  background: $color-dark-elevated;
  padding: 120px 0;
  border-top: 1px solid $color-border;
}

.features-container {
  max-width: 1200px;
}

.section-header {
  text-align: center;
  margin-bottom: 80px;
}

.section-label {
  font-family: $font-mono;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: $color-accent;
  margin-bottom: 16px;

  &.light {
    color: rgba($color-text, 0.5);
  }
}

.section-title {
  font-family: $font-display;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
}

.section-subtitle {
  font-size: 16px;
  color: $color-text-muted;
  max-width: 500px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.feature-card {
  position: relative;
  background: rgba($color-dark, 0.5);
  border: 1px solid $color-border;
  padding: 32px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba($color-accent, 0.3);
    transform: translateY(-4px);

    .feature-line {
      width: 100%;
    }

    .feature-icon-container {
      background: rgba($color-accent, 0.1);
    }
  }
}

.feature-number {
  position: absolute;
  top: 16px;
  right: 16px;
  font-family: $font-mono;
  font-size: 12px;
  color: rgba($color-text, 0.2);
}

.feature-icon-container {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba($color-text, 0.03);
  border: 1px solid $color-border;
  margin-bottom: 20px;
  transition: background 0.3s ease;
}

.feature-icon {
  color: $color-accent;
}

.feature-title {
  font-family: $font-display;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
}

.feature-description {
  font-size: 14px;
  line-height: 1.6;
  color: $color-text-muted;
  margin: 0;
}

.feature-line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 0;
  background: $color-accent;
  transition: width 0.4s ease;
}

// ============================================
// Specs Section
// ============================================
.specs-section {
  background: $color-dark;
  padding: 120px 0;
  border-top: 1px solid $color-border;
}

.specs-content {
  padding-right: 40px;

  @media (max-width: 960px) {
    padding-right: 0;
    margin-bottom: 60px;
  }
}

.specs-title {
  font-family: $font-display;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
}

.specs-description {
  font-size: 16px;
  line-height: 1.7;
  color: $color-text-muted;
  margin: 0 0 40px;
}

.specs-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-bar {
  height: 4px;
  background: rgba($color-text, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.spec-fill {
  height: 100%;
  background: linear-gradient(90deg, $color-primary, $color-accent);
  border-radius: 2px;
  transition: width 1s ease-out;
}

.spec-info {
  display: flex;
  justify-content: space-between;
}

.spec-label {
  font-size: 13px;
  color: $color-text-muted;
}

.spec-value {
  font-family: $font-mono;
  font-size: 13px;
  color: $color-accent;
}

// Specs Visual
.specs-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.visual-frame {
  position: relative;
  width: 100%;
  max-width: 500px;
  aspect-ratio: 4/3;
  background: rgba($color-dark-elevated, 0.8);
  border: 1px solid $color-border;
  overflow: hidden;
}

.visual-scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, $color-accent, transparent);
  animation: visualScan 4s linear infinite;
}

@keyframes visualScan {
  0% { top: 0; opacity: 0.5; }
  50% { opacity: 1; }
  100% { top: 100%; opacity: 0.5; }
}

.visual-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba($color-secondary, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba($color-secondary, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
}

.visual-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.crosshair {
  position: absolute;
  background: rgba($color-accent, 0.5);

  &-h {
    width: 60px;
    height: 1px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  &-v {
    width: 1px;
    height: 60px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

.magnification-ring {
  width: 80px;
  height: 80px;
  border: 1px solid rgba($color-accent, 0.3);
  border-radius: 50%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: ringPulse 3s ease-in-out infinite;
}

@keyframes ringPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
}

.visual-data {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 16px;
  font-family: $font-mono;
  font-size: 11px;
  color: $color-accent;
}

// ============================================
// CTA Section
// ============================================
.cta-section {
  position: relative;
  padding: 120px 0;
  overflow: hidden;
}

.cta-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, $color-primary 0%, darken($color-primary, 10%) 100%);
  opacity: 0.9;
}

.cta-content {
  position: relative;
  text-align: center;
  z-index: 1;
}

.cta-title {
  font-family: $font-display;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 600;
  margin: 0 0 16px;
}

.cta-subtitle {
  font-size: 18px;
  color: rgba($color-text, 0.8);
  margin: 0 0 40px;
}

.cta-final-btn {
  background: $color-text !important;
  color: $color-primary !important;
  padding: 0 48px !important;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
}

// ============================================
// Footer
// ============================================
.site-footer {
  background: $color-dark;
  padding: 40px 0;
  border-top: 1px solid $color-border;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: $color-text;
}

.footer-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.footer-name {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 18px;

  .brand-super {
    font-weight: 400;
  }

  .brand-navi {
    font-weight: 700;
    letter-spacing: 0.01em;
  }
}

.footer-links {
  display: flex;
  gap: 32px;

  a {
    font-size: 14px;
    color: $color-text-muted;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: $color-text;
    }
  }

  @media (max-width: 600px) {
    gap: 20px;
  }
}

.footer-copyright {
  font-size: 13px;
  color: $color-text-muted;
}

// ============================================
// Login Dialog
// ============================================
.login-card {
  position: relative;
  padding: 40px;
  background: $color-dark-elevated !important;
  border: 1px solid $color-border;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, $color-primary, $color-accent);
  }
}

.close-btn {
  position: absolute !important;
  top: 12px;
  right: 12px;
  color: $color-text-muted !important;

  &:hover {
    color: $color-text !important;
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  filter: brightness(0) invert(1);
}

.header-icon {
  margin-bottom: 16px;
}

.login-title {
  font-family: $font-display;
  font-size: 24px;
  font-weight: 600;
  color: $color-text;
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 14px;
  color: $color-text-muted;
  margin: 0;
}

.login-content {
  display: flex;
  flex-direction: column;
}

.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.social-btn {
  border-color: $color-border !important;
  color: $color-text !important;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  transition: all 0.2s ease;

  .social-icon {
    margin-right: 12px;
  }

  &:hover {
    border-color: rgba($color-text, 0.3) !important;
    background: rgba($color-text, 0.05) !important;
  }

  &.google-btn:hover {
    border-color: rgba(#4285F4, 0.5) !important;
    background: rgba(#4285F4, 0.08) !important;
  }

  &.apple-btn:hover {
    border-color: rgba($color-text, 0.4) !important;
  }
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $color-border;
  }

  span {
    padding: 0 16px;
    font-size: 13px;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.auth-input {
  :deep(.v-field) {
    background: rgba($color-dark, 0.5);
    border-radius: 8px;
  }

  :deep(.v-field__outline) {
    color: $color-border;
  }

  :deep(.v-field--focused .v-field__outline) {
    color: $color-primary;
  }

  :deep(.v-field__input) {
    color: $color-text;
  }

  :deep(.v-label) {
    color: $color-text-muted;
  }

  :deep(.v-icon) {
    color: $color-text-muted;
  }
}

.forgot-password {
  text-align: right;
  margin: 12px 0 20px;

  a {
    font-size: 13px;
    color: $color-secondary;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: $color-accent;
    }
  }
}

.login-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.02em;
}

.signup-link {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid $color-border;

  span {
    font-size: 14px;
    color: $color-text-muted;
    margin-right: 6px;
  }

  a {
    font-size: 14px;
    font-weight: 600;
    color: $color-accent;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: lighten($color-accent, 10%);
    }
  }
}

.back-to-login {
  text-align: center;
  margin-top: 24px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: $color-text-muted;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: $color-text;
    }
  }
}

.terms-checkbox {
  :deep(.v-label) {
    font-size: 13px;
    color: $color-text-muted;
    opacity: 1;
  }

  :deep(.v-selection-control__input) {
    color: $color-primary;
  }
}

.terms-text {
  font-size: 13px;
  color: $color-text-muted;

  a {
    color: $color-secondary;
    text-decoration: none;

    &:hover {
      color: $color-accent;
      text-decoration: underline;
    }
  }
}

.success-view {
  text-align: center;
  padding: 20px 0;

  .success-icon {
    margin-bottom: 16px;
  }
}
</style>

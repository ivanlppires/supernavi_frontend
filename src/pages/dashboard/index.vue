<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="brand">
          <img alt="SuperNavi" class="brand-logo" src="/images/logosupernavi.png">
          <span class="brand-name">SuperNavi</span>
        </div>
        <div class="header-divider" />
        <span class="header-subtitle">Patologia Digital</span>
      </div>

      <div class="header-right">
        <EdgeStatusBadge />

        <button class="header-icon-btn" @click="showCollaborations = true">
          <v-badge
            v-if="pendingCollaborations > 0"
            color="error"
            :content="pendingCollaborations"
            dot
            floating
          >
            <v-icon size="20">mdi-bell-outline</v-icon>
          </v-badge>
          <v-icon v-else size="20">mdi-bell-outline</v-icon>
        </button>

        <v-menu :close-on-content-click="false" location="bottom end" offset="4">
          <template #activator="{ props }">
            <button v-bind="props" class="user-btn">
              <div class="user-avatar" :class="{ 'has-image': authStore.user?.avatar }">
                <img
                  v-if="authStore.user?.avatar"
                  alt="Avatar"
                  class="avatar-img"
                  referrerpolicy="no-referrer"
                  :src="authStore.user.avatar"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                >
                <span v-if="!authStore.user?.avatar" class="avatar-initials">{{ authStore.userInitials || '?' }}</span>
              </div>
            </button>
          </template>

          <v-card class="user-menu" elevation="8" rounded="lg">
            <div class="user-menu-header">
              <div class="user-avatar large" :class="{ 'has-image': authStore.user?.avatar }">
                <img
                  v-if="authStore.user?.avatar"
                  alt="Avatar"
                  class="avatar-img"
                  referrerpolicy="no-referrer"
                  :src="authStore.user.avatar"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                >
                <span v-if="!authStore.user?.avatar" class="avatar-initials">{{ authStore.userInitials || '?' }}</span>
              </div>
              <div class="user-menu-info">
                <span class="user-menu-name">{{ authStore.userName }}</span>
                <span class="user-menu-email">{{ authStore.user?.email }}</span>
              </div>
            </div>

            <v-divider />

            <v-list class="user-menu-list" density="compact" nav>
              <v-list-item
                prepend-icon="mdi-account-outline"
                title="Meu Perfil"
                @click="showProfile = true"
              />
              <v-list-item
                prepend-icon="mdi-chart-box-outline"
                title="Relatórios"
                @click="goToReports"
              />
              <v-list-item
                prepend-icon="mdi-cog-outline"
                title="Configurações"
                @click="goToSettings"
              />
            </v-list>

            <v-divider />

            <v-list class="user-menu-list" density="compact" nav>
              <v-list-item
                :prepend-icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'"
                @click="toggleTheme"
              >
                <template #title>
                  <div class="theme-toggle-row">
                    <span>Aparência</span>
                    <span class="theme-badge">{{ isDark ? 'Escuro' : 'Claro' }}</span>
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <v-divider />

            <v-list class="user-menu-list" density="compact" nav>
              <v-list-item
                class="logout-item"
                prepend-icon="mdi-logout"
                title="Encerrar sessão"
                @click="handleLogout"
              />
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dashboard-main">
      <!-- Quick Actions Bar -->
      <section class="quick-actions">
        <button
          class="new-case-btn"
          :class="{ 'drag-over': isDragOver }"
          @click="triggerFileInput"
          @dragenter.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @dragover.prevent
          @drop.prevent="handleFileDrop"
        >
          <input
            ref="fileInput"
            accept=".svs,.tif,.tiff,.ndpi,.dzi"
            hidden
            multiple
            type="file"
            @change="handleFileSelect"
          >
          <v-icon size="18">mdi-plus</v-icon>
          <span>Novo Caso</span>
        </button>

        <div class="supported-formats">
          <span class="formats-label">Formatos:</span>
          <span class="format-tag">SVS</span>
          <span class="format-tag">TIFF</span>
          <span class="format-tag">NDPI</span>
        </div>
      </section>

      <!-- Cases Section -->
      <section class="cases-section">
        <!-- Toolbar: Tabs + Search/Filter -->
        <div class="cases-toolbar">
          <div class="toolbar-left">
            <div class="segment-control">
              <button
                v-for="tab in inboxTabs"
                :key="tab.value"
                class="segment-btn"
                :class="{
                  active: activeTab === tab.value,
                  'drag-over': dragOverTab === tab.value && draggingCase !== null
                }"
                @click="activeTab = tab.value as 'inbox' | 'archived' | 'trash'"
                @dragleave="handleTabDragLeave"
                @dragover.prevent="handleTabDragOver(tab.value)"
                @drop.prevent="handleTabDrop(tab.value as CaseLocation)"
              >
                <span class="segment-label">{{ tab.label }}</span>
                <span v-if="tab.count > 0" class="segment-count">{{ tab.count }}</span>
              </button>
            </div>
          </div>

          <div class="toolbar-right">
            <!-- Empty Trash Button -->
            <button
              v-if="activeTab === 'trash' && trashCount > 0"
              class="empty-trash-btn"
              @click="showEmptyTrashConfirm = true"
            >
              <v-icon size="16">mdi-delete-sweep</v-icon>
              <span>Limpar Lixeira</span>
            </button>

            <div class="search-container">
              <v-icon class="search-icon" size="16">mdi-magnify</v-icon>
              <input
                v-model="searchQuery"
                class="search-input"
                placeholder="Buscar casos..."
                type="text"
              >
              <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
                <v-icon size="14">mdi-close</v-icon>
              </button>
            </div>

            <v-menu
              v-model="showFilters"
              :close-on-content-click="false"
              location="bottom end"
            >
              <template #activator="{ props }">
                <button
                  v-bind="props"
                  class="filter-btn"
                  :class="{ active: hasActiveFilters }"
                >
                  <v-icon size="16">mdi-tune</v-icon>
                  <span v-if="hasActiveFilters" class="filter-count">{{ activeFiltersCount }}</span>
                </button>
              </template>

              <div class="filter-popover">
                <div class="filter-header">
                  <span class="filter-title">Filtros</span>
                  <button class="filter-reset" @click="clearFilters">Limpar</button>
                </div>

                <div class="filter-body">
                  <div class="filter-group">
                    <label class="filter-label">Tipo</label>
                    <div class="filter-segment">
                      <button
                        v-for="opt in [
                          { value: 'all', label: 'Todos' },
                          { value: 'mine', label: 'Meus' },
                          { value: 'collab', label: 'Colab' }
                        ]"
                        :key="opt.value"
                        class="filter-segment-btn"
                        :class="{ active: draftOwnershipFilter === opt.value }"
                        @click="draftOwnershipFilter = opt.value as 'all' | 'mine' | 'collab'"
                      >
                        {{ opt.label }}
                      </button>
                    </div>
                  </div>

                  <div class="filter-group">
                    <label class="filter-label">Status</label>
                    <select
                      v-model="draftStatusFilter"
                      class="filter-select"
                    >
                      <option value="">Todos</option>
                      <option
                        v-for="opt in statusOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>

                  <div class="filter-group">
                    <label class="filter-label">Ordenar por</label>
                    <select
                      v-model="draftSortBy"
                      class="filter-select"
                    >
                      <option
                        v-for="opt in sortOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="filter-footer">
                  <button class="filter-apply-btn" @click="applyFilters">
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </v-menu>
          </div>
        </div>

        <!-- Scrollable cases area -->
        <div class="cases-scroll-area">
          <Transition mode="out-in" :name="pageTransition">
            <div :key="currentPage" class="cases-grid">
              <!-- Case Card Component - Apple-like Design -->
              <CaseCard
                v-for="caseItem in paginatedCases"
                :key="caseItem.id"
                :case-item="caseItem"
                :active-tab="activeTab"
                :downloading-report="downloadingReport"
                :processing-info="getCaseProcessingInfo(caseItem.id)"
                :thumbnail-urls="getThumbnailUrls(caseItem.id)"
                @add-slides="openAddSlidesDialog(caseItem)"
                @click="openCase(caseItem)"
                @confirm-delete="confirmDeleteCase(caseItem)"
                @download-report="downloadReport(caseItem)"
                @drag-end="handleCardDragEnd"
                @drag-start="(e: DragEvent) => handleCardDragStart(e, caseItem)"
                @invite-collaborator="openInviteCollaboratorDialog(caseItem)"
                @move-to="(location) => moveCaseToLocation(caseItem, location)"
                @thumbnail-error="handleThumbnailError"
              />
            </div>
          </Transition>

          <!-- Empty State -->
          <div v-if="filteredCases.length === 0" class="empty-state">
            <v-icon color="disabled" size="48">{{ emptyStateIcon }}</v-icon>
            <p class="empty-title">{{ emptyStateTitle }}</p>
            <p class="empty-subtitle">{{ emptyStateSubtitle }}</p>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <span class="pagination-info">
            {{ paginationStart }}-{{ paginationEnd }} de {{ filteredCases.length }}
          </span>
          <v-pagination
            v-model="currentPage"
            density="comfortable"
            :length="totalPages"
            rounded
            size="small"
            :total-visible="5"
          />
        </div>
      </section>

    </main>

    <!-- Collaborations Dialog -->
    <v-dialog v-model="showCollaborations" max-width="520">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Notificações</span>
          <v-btn icon size="small" variant="text" @click="showCollaborations = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />

        <!-- Pending Invitations -->
        <template v-if="pendingInvitations.length > 0">
          <div class="notification-section-header">
            <v-icon color="warning" size="18">mdi-account-plus</v-icon>
            <span>Convites para Colaboração</span>
            <v-chip color="warning" size="x-small" variant="tonal">{{ pendingInvitations.length }}</v-chip>
          </div>

          <div class="invitation-list">
            <div
              v-for="invitation in pendingInvitations"
              :key="invitation.id"
              class="invitation-card"
            >
              <div class="invitation-header">
                <span class="invitation-case-id">{{ invitation.relatedCaseId || 'Novo Convite' }}</span>
                <span class="invitation-date">{{ formatDate(invitation.createdAt) }}</span>
              </div>
              <div class="invitation-patient">
                <v-icon size="14">mdi-information</v-icon>
                {{ invitation.title }}
              </div>
              <div v-if="invitation.content" class="invitation-roi">
                <v-icon size="14">mdi-target</v-icon>
                {{ invitation.content }}
              </div>
              <div class="invitation-actions">
                <v-btn
                  color="error"
                  size="small"
                  variant="text"
                  @click="declineInvitation(invitation)"
                >
                  Recusar
                </v-btn>
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  @click="acceptInvitation(invitation)"
                >
                  <v-icon size="16" start>mdi-check</v-icon>
                  Aceitar
                </v-btn>
              </div>
            </div>
          </div>
        </template>

        <!-- Active Discussions -->
        <template v-if="collaborations.length > 0">
          <div class="notification-section-header">
            <v-icon color="secondary" size="18">mdi-forum</v-icon>
            <span>Discussões Ativas</span>
          </div>

          <v-list class="py-0" lines="two">
            <v-list-item
              v-for="collab in collaborations"
              :key="collab.id"
              :class="{ 'has-new-messages': collab.hasNewMessages }"
              @click="openCollaboration(collab)"
            >
              <template #prepend>
                <v-avatar :color="collab.hasNewMessages ? 'secondary' : 'grey'" size="40">
                  <v-icon size="20">{{ collab.hasNewMessages ? 'mdi-message-badge' : 'mdi-message-text' }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ collab.caseId }}</v-list-item-title>
              <v-list-item-subtitle>{{ collab.roiDescription }}</v-list-item-subtitle>
              <template #append>
                <div class="d-flex flex-column align-end">
                  <span class="text-caption text-medium-emphasis">{{ collab.lastActivity }}</span>
                  <v-icon v-if="collab.hasNewMessages" color="secondary" size="8">mdi-circle</v-icon>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </template>

        <!-- Empty State -->
        <div v-if="pendingInvitations.length === 0 && collaborations.length === 0" class="empty-notifications">
          <v-icon color="grey" size="48">mdi-bell-off-outline</v-icon>
          <p>Nenhuma notificação</p>
        </div>
      </v-card>
    </v-dialog>

    <!-- Profile Dialog -->
    <v-dialog v-model="showProfile" max-width="420">
      <v-card class="profile-dialog">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Meu Perfil</span>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="closeProfile"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />

        <v-card-text class="pt-6">
          <!-- Avatar -->
          <div class="avatar-upload-section">
            <div class="avatar-upload-wrapper" @click="triggerAvatarUpload">
              <v-avatar color="primary" size="88">
                <v-img v-if="authStore.user?.avatar" cover referrerpolicy="no-referrer" :src="authStore.user.avatar" />
                <span v-else class="text-h4 font-weight-bold">{{ authStore.userInitials }}</span>
              </v-avatar>
              <div class="avatar-overlay">
                <v-icon color="white" size="20">mdi-camera</v-icon>
              </div>
              <input
                ref="avatarInput"
                accept="image/*"
                hidden
                type="file"
                @change="handleAvatarUpload"
              >
            </div>
          </div>

          <!-- Editable Fields -->
          <div class="profile-fields">
            <!-- Name -->
            <div class="editable-field" @click="startEditing('name')">
              <template v-if="editingField !== 'name'">
                <span class="field-value field-name">{{ authStore.user?.name || 'Adicionar nome' }}</span>
                <v-icon class="edit-icon" size="14">mdi-pencil</v-icon>
              </template>
              <v-text-field
                v-else
                v-model="profileForm.name"
                autofocus
                class="inline-edit"
                density="compact"
                hide-details
                placeholder="Nome completo"
                variant="underlined"
                @blur="saveField('name')"
                @keyup.enter="saveField('name')"
                @keyup.escape="cancelEditing"
              />
            </div>

            <!-- Email -->
            <div class="editable-field" @click="startEditing('email')">
              <template v-if="editingField !== 'email'">
                <v-icon class="field-icon" size="16">mdi-email-outline</v-icon>
                <span class="field-value">{{ authStore.user?.email || 'Adicionar e-mail' }}</span>
                <v-icon class="edit-icon" size="14">mdi-pencil</v-icon>
              </template>
              <v-text-field
                v-else
                v-model="profileForm.email"
                autofocus
                class="inline-edit"
                density="compact"
                hide-details
                placeholder="E-mail"
                type="email"
                variant="underlined"
                @blur="saveField('email')"
                @keyup.enter="saveField('email')"
                @keyup.escape="cancelEditing"
              />
            </div>

            <!-- CRM -->
            <div class="editable-field" @click="startEditing('crm')">
              <template v-if="editingField !== 'crm'">
                <v-icon class="field-icon" size="16">mdi-card-account-details-outline</v-icon>
                <span class="field-value" :class="{ 'field-placeholder': !authStore.user?.crm }">
                  {{ authStore.user?.crm || 'Adicionar CRM' }}
                </span>
                <v-icon class="edit-icon" size="14">mdi-pencil</v-icon>
              </template>
              <v-text-field
                v-else
                v-model="profileForm.crm"
                autofocus
                class="inline-edit"
                density="compact"
                hide-details
                placeholder="CRM-UF 123456"
                variant="underlined"
                @blur="saveField('crm')"
                @keyup.enter="saveField('crm')"
                @keyup.escape="cancelEditing"
              />
            </div>

            <!-- Specialization -->
            <div class="editable-field" @click="startEditing('specialization')">
              <template v-if="editingField !== 'specialization'">
                <v-icon class="field-icon" size="16">mdi-stethoscope</v-icon>
                <span class="field-value" :class="{ 'field-placeholder': !authStore.user?.specialization }">
                  {{ authStore.user?.specialization || 'Adicionar especialização' }}
                </span>
                <v-icon class="edit-icon" size="14">mdi-pencil</v-icon>
              </template>
              <v-text-field
                v-else
                v-model="profileForm.specialization"
                autofocus
                class="inline-edit"
                density="compact"
                hide-details
                placeholder="Ex: Dermatopatologia"
                variant="underlined"
                @blur="saveField('specialization')"
                @keyup.enter="saveField('specialization')"
                @keyup.escape="cancelEditing"
              />
            </div>

            <!-- Member Since (read-only) -->
            <div class="readonly-field">
              <v-icon class="field-icon" size="16">mdi-calendar</v-icon>
              <span class="field-value field-muted">Membro desde {{ formatMemberSince(authStore.user?.createdAt) }}</span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Invite Collaborator Dialog -->
    <v-dialog v-model="showInviteCollaboratorDialog" max-width="440">
      <v-card class="invite-collaborator-dialog">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Convidar Colaborador</span>
          <v-btn icon size="small" variant="text" @click="closeInviteCollaboratorDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <p v-if="inviteCollaboratorCase" class="case-info mb-4">
            <v-icon class="mr-1" size="16">mdi-folder-outline</v-icon>
            {{ inviteCollaboratorCase.caseNumber }} - {{ inviteCollaboratorCase.patientName }}
          </p>

          <v-text-field
            v-model="collaboratorSearch"
            autofocus
            class="mb-2"
            clearable
            density="compact"
            hide-details
            label="Buscar por nome ou email"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            @update:model-value="searchCollaborators"
          />

          <div v-if="isSearchingCollaborators" class="search-loading">
            <v-progress-circular indeterminate size="20" width="2" />
            <span class="ml-2">Buscando...</span>
          </div>

          <div v-else-if="collaboratorSearchResults.length > 0" class="search-results">
            <div
              v-for="user in collaboratorSearchResults"
              :key="user.id"
              class="user-result"
              @click="inviteCollaborator(user.id)"
            >
              <div class="user-avatar-small" :class="{ 'has-image': user.avatarUrl }">
                <img
                  v-if="user.avatarUrl"
                  alt="Avatar"
                  class="avatar-img"
                  referrerpolicy="no-referrer"
                  :src="user.avatarUrl"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                >
                <span v-else class="avatar-initials">{{ user.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="user-info">
                <span class="user-name">{{ user.name }}</span>
                <span class="user-email">{{ user.email }}</span>
                <span v-if="user.specialization" class="user-spec">{{ user.specialization }}</span>
              </div>
              <v-icon class="add-icon" color="primary" size="20">mdi-plus-circle-outline</v-icon>
            </div>
          </div>

          <div v-else-if="collaboratorSearch.length >= 2" class="no-results">
            <v-icon color="grey" size="32">mdi-account-search-outline</v-icon>
            <p>Nenhum usuário encontrado</p>
          </div>

          <div v-else class="search-hint">
            <p>Digite pelo menos 2 caracteres para buscar</p>
          </div>
        </v-card-text>

        <v-card-actions v-if="isInvitingCollaborator">
          <v-spacer />
          <v-progress-circular indeterminate size="24" width="2" />
          <span class="ml-2">Adicionando...</span>
          <v-spacer />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- New Case Dialog -->
    <v-dialog v-model="showNewCaseDialog" max-width="500" persistent>
      <div class="new-case-dialog">
        <div class="dialog-header">
          <span class="dialog-title">Novo Caso</span>
          <button class="dialog-close" @click="cancelNewCase">
            <v-icon size="20">mdi-close</v-icon>
          </button>
        </div>

        <div class="dialog-body">
          <v-form ref="newCaseFormRef">
            <!-- Patient Info -->
            <div class="form-section">
              <label class="form-section-label">Informações do Paciente</label>

              <div class="form-field">
                <label class="field-label">Nome do Paciente</label>
                <input
                  v-model="newCaseForm.patientName"
                  class="field-input"
                  placeholder="Digite o nome completo"
                  type="text"
                >
              </div>

              <div class="form-row-native">
                <div class="form-field">
                  <label class="field-label">Sexo</label>
                  <select v-model="newCaseForm.sex" class="field-select">
                    <option disabled value="">Selecione</option>
                    <option
                      v-for="opt in sexOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>

                <div class="form-field">
                  <label class="field-label">Idade</label>
                  <input
                    v-model.number="newCaseForm.age"
                    class="field-input"
                    min="0"
                    placeholder="Anos"
                    type="number"
                  >
                </div>
              </div>
            </div>

            <!-- Slides -->
            <div class="form-section">
              <label class="form-section-label">
                Lâminas
                <span class="section-count">{{ newCaseForm.slides.length }}</span>
              </label>

              <div v-if="newCaseForm.slides.length > 0" class="slides-list-native">
                <div v-for="(slide, index) in newCaseForm.slides" :key="index" class="slide-item-native">
                  <v-icon color="primary" size="18">mdi-file-image</v-icon>
                  <span class="slide-name-native">{{ slide.name }}</span>
                  <button class="slide-remove" @click="removeSlide(index)">
                    <v-icon size="14">mdi-close</v-icon>
                  </button>
                </div>
              </div>

              <button class="add-slides-native" type="button" @click="triggerAddMoreSlides">
                <v-icon size="18">mdi-plus</v-icon>
                <span>Adicionar lâminas</span>
              </button>
              <input
                ref="additionalSlidesInput"
                accept=".svs,.tif,.tiff,.ndpi,.dzi"
                hidden
                multiple
                type="file"
                @change="handleAdditionalSlides"
              >
            </div>
          </v-form>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="cancelNewCase">Cancelar</button>
          <button
            class="btn-primary"
            :class="{ disabled: !isNewCaseValid }"
            :disabled="!isNewCaseValid"
            @click="createNewCase"
          >
            Criar Caso
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Upload Progress Dialog -->
    <v-dialog v-model="isUploading" max-width="580" persistent>
      <v-card class="upload-dialog">
        <v-card-text class="pt-6 pb-4">
          <div class="upload-dialog-content">
            <!-- Header with microscope icon -->
            <div class="upload-header">
              <div class="upload-icon-wrapper">
                <v-icon class="upload-icon-bg" color="primary" size="56">mdi-microscope</v-icon>
                <v-progress-circular
                  class="upload-circular"
                  color="primary"
                  :model-value="uploadProgress.percent"
                  :rotate="-90"
                  size="80"
                  width="6"
                />
              </div>
              <div class="upload-percent">{{ uploadProgress.percent }}%</div>
            </div>

            <!-- File info -->
            <div class="upload-file-info">
              <div class="upload-file-name">
                <v-icon color="primary" size="18">mdi-file-image</v-icon>
                <span>{{ currentUploadFile?.name }}</span>
              </div>
              <div v-if="currentUploadFile && currentUploadFile.total > 1" class="upload-file-counter">
                Arquivo {{ currentUploadFile.index }} de {{ currentUploadFile.total }}
              </div>
            </div>

            <!-- Progress bar -->
            <div class="upload-progress-section">
              <v-progress-linear
                color="primary"
                height="12"
                :model-value="uploadProgress.percent"
                rounded
                striped
              />
            </div>

            <!-- Stats -->
            <div class="upload-stats">
              <div class="upload-stat">
                <v-icon class="stat-icon" color="primary" size="20">mdi-cloud-upload</v-icon>
                <span class="stat-label">Enviado</span>
                <span class="stat-value">{{ formatFileSize(uploadProgress.loaded) }} / {{ formatFileSize(uploadProgress.total) }}</span>
              </div>
              <div class="upload-stat">
                <v-icon class="stat-icon" color="success" size="20">mdi-speedometer</v-icon>
                <span class="stat-label">Velocidade</span>
                <span class="stat-value">{{ formatSpeed(uploadProgress.speed) }}</span>
              </div>
              <div class="upload-stat">
                <v-icon class="stat-icon" color="warning" size="20">mdi-timer-sand</v-icon>
                <span class="stat-label">Restante</span>
                <span class="stat-value">{{ formatTimeRemaining(uploadProgress.remaining) }}</span>
              </div>
            </div>

            <!-- Case info -->
            <div class="upload-case-info">
              <v-icon color="primary" size="16">mdi-folder-open</v-icon>
              <span>{{ processingCaseId }}</span>
            </div>

            <!-- Tip for users -->
            <div class="upload-tip">
              <v-icon color="info" size="16">mdi-information</v-icon>
              <span>Arquivos de lâminas histológicas são grandes. Por favor, aguarde o envio completo.</span>
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="justify-center pa-4">
          <v-btn
            color="error"
            variant="text"
            @click="cancelUpload"
          >
            <v-icon size="18" start>mdi-close</v-icon>
            Cancelar Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Processing Dialog (after upload completes) -->
    <v-dialog v-model="isProcessing" max-width="450" persistent>
      <v-card class="processing-dialog">
        <v-card-text class="pt-6 pb-6">
          <div class="processing-content">
            <!-- Animated Icon -->
            <div class="processing-icon">
              <v-progress-circular
                color="primary"
                indeterminate
                size="64"
                width="4"
              />
              <v-icon class="processing-icon-inner" color="primary" size="28">
                {{ processingSteps[processingStep]?.icon }}
              </v-icon>
            </div>

            <!-- Case Info -->
            <div class="processing-case-info">
              <span class="processing-case-id">{{ processingCaseId }}</span>
              <span class="processing-slides">{{ newCaseForm.slides.length }} lâmina(s)</span>
            </div>

            <!-- Current Step -->
            <p class="processing-step-label">
              {{ processingSteps[processingStep]?.label }}
            </p>

            <!-- Progress Steps -->
            <div class="processing-steps">
              <div
                v-for="(step, index) in processingSteps"
                :key="index"
                class="processing-step-dot"
                :class="{
                  active: index === processingStep,
                  completed: index < processingStep
                }"
              />
            </div>

            <!-- Skeleton Preview -->
            <div class="processing-skeleton">
              <v-skeleton-loader height="120" type="image" />
              <div class="skeleton-tiles">
                <v-skeleton-loader v-for="i in 4" :key="i" type="chip" />
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Upload Error Snackbar -->
    <v-snackbar
      color="error"
      location="bottom"
      :model-value="!!uploadError"
      timeout="5000"
      @update:model-value="uploadError = null"
    >
      <v-icon class="mr-2">mdi-alert-circle</v-icon>
      {{ uploadError }}
      <template #actions>
        <v-btn variant="text" @click="uploadError = null">Fechar</v-btn>
      </template>
    </v-snackbar>

    <!-- Success Snackbar -->
    <v-snackbar
      color="success"
      location="bottom"
      :model-value="!!successMessage"
      timeout="6000"
      @update:model-value="successMessage = null"
    >
      <v-icon class="mr-2">mdi-check-circle</v-icon>
      {{ successMessage }}
      <template #actions>
        <v-btn variant="text" @click="successMessage = null">Fechar</v-btn>
      </template>
    </v-snackbar>

    <!-- Delete Confirmation Dialog - Apple-like -->
    <v-dialog v-model="showDeleteConfirm" max-width="320">
      <div class="apple-alert-dialog">
        <div class="alert-icon">
          <v-icon color="error" size="32">mdi-trash-can</v-icon>
        </div>
        <h3 class="alert-title">Excluir Caso?</h3>
        <p class="alert-message">
          O caso <strong>{{ caseToDelete?.caseNumber }}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
        </p>
        <div class="alert-actions">
          <button class="alert-btn cancel" @click="cancelDelete">
            Cancelar
          </button>
          <button class="alert-btn destructive" @click="deleteCasePermanently">
            Excluir
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Empty Trash Confirmation Dialog - Apple-like -->
    <v-dialog v-model="showEmptyTrashConfirm" max-width="360">
      <div class="apple-alert-dialog">
        <div class="alert-icon">
          <v-icon color="error" size="32">mdi-delete-sweep</v-icon>
        </div>
        <h3 class="alert-title">Limpar Lixeira?</h3>
        <p class="alert-message">
          <strong>{{ trashCount }}</strong> {{ trashCount === 1 ? 'caso será excluído' : 'casos serão excluídos' }} permanentemente. Esta ação não pode ser desfeita.
        </p>
        <div class="alert-actions">
          <button class="alert-btn cancel" @click="showEmptyTrashConfirm = false">
            Cancelar
          </button>
          <button class="alert-btn destructive" :disabled="isEmptyingTrash" @click="emptyTrash">
            <v-progress-circular v-if="isEmptyingTrash" indeterminate size="14" width="2" />
            <span v-else>Limpar Tudo</span>
          </button>
        </div>
      </div>
    </v-dialog>

    <!-- Add Slides Dialog -->
    <v-dialog v-model="showAddSlidesDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-image-plus</v-icon>
          Adicionar Lâminas
        </v-card-title>
        <v-card-subtitle v-if="addSlidesToCase" class="pb-0">
          Caso: <strong>{{ addSlidesToCase.caseNumber }}</strong> - {{ addSlidesToCase.patientName }}
        </v-card-subtitle>

        <v-divider class="mt-3" />

        <v-card-text>
          <input
            ref="addSlidesInput"
            accept=".svs,.tif,.tiff,.ndpi,.dzi"
            hidden
            multiple
            type="file"
            @change="handleAddSlidesSelect"
          >

          <!-- Drop zone -->
          <div
            class="add-slides-zone"
            @click="triggerAddSlidesInput"
          >
            <v-icon color="primary" size="32">mdi-cloud-upload</v-icon>
            <p class="mt-2 mb-0 text-body-2">Clique para selecionar arquivos</p>
            <p class="text-caption text-medium-emphasis">SVS, TIFF, NDPI, DZI</p>
          </div>

          <!-- Selected files list -->
          <div v-if="addSlidesFiles.length > 0" class="mt-4">
            <p class="text-subtitle-2 mb-2">Arquivos selecionados:</p>
            <v-list class="selected-files-list" density="compact">
              <v-list-item
                v-for="(file, index) in addSlidesFiles"
                :key="index"
                class="px-2"
              >
                <template #prepend>
                  <v-icon color="primary" size="20">mdi-file-image</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ file.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ formatFileSize(file.size) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    color="error"
                    icon
                    size="x-small"
                    variant="text"
                    @click.stop="removeAddSlideFile(index)"
                  >
                    <v-icon size="18">mdi-close</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddSlidesDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            :disabled="addSlidesFiles.length === 0"
            variant="tonal"
            @click="submitAddSlides"
          >
            <v-icon class="mr-1" size="18">mdi-upload</v-icon>
            Enviar {{ addSlidesFiles.length > 0 ? `(${addSlidesFiles.length})` : '' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Report Download Snackbar -->
    <v-snackbar
      v-model="reportSnackbar.show"
      :color="reportSnackbar.color"
      location="bottom"
      timeout="3000"
    >
      <v-icon class="mr-2">{{ reportSnackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ reportSnackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="reportSnackbar.show = false">Fechar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
  import type { CaseLocation, CaseStatus, FileFormat, ProcessingStatus, Slide } from '@/api/types'
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import { casesApi } from '@/api/cases'
  import { type UploadController, uploadFileToEdge, uploadFileToS3, type UploadProgress } from '@/api/s3'
  import { slidesApi } from '@/api/slides'
  import { usersApi } from '@/api/users'
  import EdgeStatusBadge from '@/components/EdgeStatusBadge.vue'
  import { type CaseDisplay, useCases } from '@/composables/useCases'
  import { useEdgeStatus } from '@/composables/useEdgeStatus'
  import { useNotifications } from '@/composables/useNotifications'
  import { useAuthStore } from '@/stores/auth'

  definePage({
    meta: { layout: 'blank' },
  })

  const router = useRouter()
  const theme = useTheme()
  const authStore = useAuthStore()
  const casesStore = useCases()
  const notificationsStore = useNotifications()
  const { edgeConnected, edgeAgentInfo } = useEdgeStatus()

  // Edge URL for uploads (when edge is connected)
  const EDGE_URL = import.meta.env.VITE_EDGE_URL || 'http://localhost:3000'

  // Theme
  const isDark = computed(() => theme.global.current.value.dark)
  function toggleTheme () {
    theme.global.name.value = isDark.value ? 'medicalLight' : 'medicalDark'
  }

  // UI State
  const searchQuery = ref('')
  const activeTab = ref<'inbox' | 'archived' | 'trash'>('inbox')
  const ownershipFilter = ref<'all' | 'mine' | 'collab'>('all')
  const statusFilter = ref<string | null>(null)
  const sortBy = ref('date_desc')
  const showFilters = ref(false)
  const isDragOver = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)
  const showCollaborations = ref(false)
  const showProfile = ref(false)

  // Drag-and-drop state
  const draggingCase = ref<CaseDisplay | null>(null)
  const dragOverTab = ref<string | null>(null)

  // Delete confirmation
  const showDeleteConfirm = ref(false)
  const caseToDelete = ref<CaseDisplay | null>(null)
  const editingField = ref<string | null>(null)

  // Empty trash
  const showEmptyTrashConfirm = ref(false)
  const isEmptyingTrash = ref(false)

  // Invite collaborator dialog
  const showInviteCollaboratorDialog = ref(false)
  const inviteCollaboratorCase = ref<CaseDisplay | null>(null)
  const collaboratorSearch = ref('')
  const collaboratorSearchResults = ref<Array<{
    id: string
    email: string
    name: string
    avatarUrl: string | null
    specialization: string | null
  }>>([])
  const isSearchingCollaborators = ref(false)
  const isInvitingCollaborator = ref(false)

  // Report download state
  const downloadingReport = ref<string | null>(null)
  const reportSnackbar = ref<{ show: boolean, message: string, color: string }>({
    show: false,
    message: '',
    color: 'success',
  })

  // Add slides to existing case state
  const showAddSlidesDialog = ref(false)
  const addSlidesToCase = ref<CaseDisplay | null>(null)
  const addSlidesFiles = ref<File[]>([])
  const addSlidesInput = ref<HTMLInputElement | null>(null)

  const profileForm = ref({
    name: '',
    email: '',
    crm: '',
    specialization: '',
  })
  const avatarInput = ref<HTMLInputElement | null>(null)

  // New Case Dialog
  const showNewCaseDialog = ref(false)
  const additionalSlidesInput = ref<HTMLInputElement | null>(null)
  const newCaseForm = ref({
    patientName: '',
    sex: '',
    age: null as number | null,
    slides: [] as File[],
  })

  // Processing state
  const isProcessing = ref(false)
  const processingStep = ref(0)
  const processingCaseId = ref('')
  const processingSteps = [
    { label: 'Enviando lâminas para o servidor...', icon: 'mdi-cloud-upload' },
    { label: 'Convertendo formato para WSI...', icon: 'mdi-sync' },
    { label: 'Gerando tiles de visualização...', icon: 'mdi-grid' },
    { label: 'Finalizando processamento...', icon: 'mdi-check-circle' },
  ]

  // Upload progress state (enhanced UX for large files)
  const isUploading = ref(false)
  const uploadProgress = ref<UploadProgress>({
    loaded: 0,
    total: 0,
    percent: 0,
    speed: 0,
    elapsed: 0,
    remaining: 0,
  })
  const currentUploadFile = ref<{ name: string, index: number, total: number } | null>(null)
  const uploadController = ref<UploadController>({ abort: () => {} })
  const uploadError = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  function showSuccessMessage (message: string) {
    successMessage.value = message
  }

  // Slide processing status tracking
  const caseSlides = ref<Map<string, Slide[]>>(new Map())
  const slideProgress = ref<Map<string, number>>(new Map()) // slideId -> progress %
  const processingPollingInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const POLLING_INTERVAL = 3000 // 3 seconds for better UX
  const isFetchingSlides = ref(false) // Guard against concurrent fetches

  // Edge processing tracking
  interface EdgeProcessingStatus {
    filename: string
    caseId: string
    status: 'uploading' | 'queued' | 'processing' | 'ready' | 'failed'
    message: string
    progress: number
    slideId?: string
  }
  const edgeProcessingFiles = ref<Map<string, EdgeProcessingStatus>>(new Map())

  const sexOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Feminino', value: 'F' },
  ]

  const isNewCaseValid = computed(() =>
    newCaseForm.value.patientName
    && newCaseForm.value.sex
    && newCaseForm.value.age
    && newCaseForm.value.age > 0
    && newCaseForm.value.slides.length > 0,
  )

  // Draft filters (for the menu, applied only on "Aplicar")
  const draftOwnershipFilter = ref<'all' | 'mine' | 'collab'>('all')
  const draftStatusFilter = ref<string | null>(null)
  const draftSortBy = ref('date_desc')

  // Sync draft with actual when menu opens
  watch(showFilters, open => {
    if (open) {
      draftOwnershipFilter.value = ownershipFilter.value
      draftStatusFilter.value = statusFilter.value
      draftSortBy.value = sortBy.value
    }
  })

  // Reset draft status when ownership changes (status options depend on it)
  watch(draftOwnershipFilter, () => {
    draftStatusFilter.value = null
  })

  // Pagination
  const currentPage = ref(1)
  const itemsPerPage = 6
  const pageTransition = ref('slide-right')
  let previousPage = 1

  watch(currentPage, newPage => {
    pageTransition.value = newPage > previousPage ? 'slide-left' : 'slide-right'
    previousPage = newPage
  })

  // Filter helpers
  const hasActiveFilters = computed(() =>
    ownershipFilter.value !== 'all' || statusFilter.value !== null || sortBy.value !== 'date_desc',
  )

  const activeFiltersCount = computed(() => {
    let count = 0
    if (ownershipFilter.value !== 'all') count++
    if (statusFilter.value !== null) count++
    if (sortBy.value !== 'date_desc') count++
    return count
  })

  function applyFilters () {
    ownershipFilter.value = draftOwnershipFilter.value
    statusFilter.value = draftStatusFilter.value
    sortBy.value = draftSortBy.value
    showFilters.value = false
  }

  function clearFilters () {
    draftOwnershipFilter.value = 'all'
    draftStatusFilter.value = null
    draftSortBy.value = 'date_desc'
  }

  // Filter & Sort Options (based on draft for the menu)
  const statusOptions = computed(() => {
    if (draftOwnershipFilter.value === 'mine') {
      return [
        { label: 'Novo', value: 'novo' },
        { label: 'Em Análise', value: 'em_analise' },
        { label: 'Concluído', value: 'concluido' },
      ]
    } else if (draftOwnershipFilter.value === 'collab') {
      return [
        { label: 'Novo', value: 'novo' },
        { label: 'Em Análise', value: 'em_analise' },
        { label: 'Concluído', value: 'concluido' },
      ]
    }
    return [
      { label: 'Novo', value: 'novo' },
      { label: 'Em Análise', value: 'em_analise' },
      { label: 'Concluído', value: 'concluido' },
    ]
  })

  const sortOptions = [
    { label: 'Mais recente', value: 'date_desc' },
    { label: 'Mais antigo', value: 'date_asc' },
    { label: 'Paciente A-Z', value: 'name_asc' },
    { label: 'Paciente Z-A', value: 'name_desc' },
  ]

  // Cases from API
  const cases = computed(() => casesStore.cases.value)
  const isLoadingCases = computed(() => casesStore.isLoading.value)
  const casesError = computed(() => casesStore.error.value)

  // Inbox tabs
  const inboxTabs = computed(() => [
    {
      value: 'inbox',
      label: 'Caixa de Entrada',
      icon: 'mdi-inbox',
      count: cases.value.filter(c => c.location === 'inbox').length,
    },
    {
      value: 'archived',
      label: 'Arquivados',
      icon: 'mdi-archive',
      count: cases.value.filter(c => c.location === 'archived').length,
    },
    {
      value: 'trash',
      label: 'Lixeira',
      icon: 'mdi-delete',
      count: cases.value.filter(c => c.location === 'trash').length,
    },
  ])

  // Trash count for empty trash button
  const trashCount = computed(() => cases.value.filter(c => c.location === 'trash').length)

  // Notifications from API (invitations are now notifications with type 'invitation')
  const pendingInvitations = computed(() => notificationsStore.invitations.value)
  const pendingCollaborations = computed(() => notificationsStore.unreadCount.value)

  // Active discussions (collaboration notifications with unread messages)
  const collaborations = computed(() =>
    notificationsStore.notifications.value
      .filter(n => n.type === 'collaboration' || n.type === 'message')
      .slice(0, 5)
      .map(n => ({
        id: n.id,
        caseId: n.relatedCaseId || '',
        roiId: n.relatedAnnotationId,
        roiDescription: n.content || n.title,
        hasNewMessages: !n.isRead,
        lastActivity: formatRelativeTime(n.createdAt),
      })),
  )

  // Format relative time helper
  function formatRelativeTime (dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    const diffHour = Math.floor(diffMs / 3_600_000)
    const diffDay = Math.floor(diffMs / 86_400_000)

    if (diffMin < 60) return `${diffMin}min`
    if (diffHour < 24) return `${diffHour}h`
    return `${diffDay}d`
  }

  const filteredCases = computed(() => {
    let result = [...cases.value]

    // Filter by location tab (inbox/archived/trash)
    result = result.filter(c => c.location === activeTab.value)

    // Filter by ownership
    if (ownershipFilter.value === 'mine') {
      result = result.filter(c => c.isOwner)
    } else if (ownershipFilter.value === 'collab') {
      result = result.filter(c => !c.isOwner)
    }

    // Filter by status
    if (statusFilter.value) {
      result = result.filter(c => c.status === statusFilter.value)
    }

    // Filter by search query
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(c =>
        c.patientName.toLowerCase().includes(q) || c.caseNumber.toLowerCase().includes(q),
      )
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      switch (sortBy.value) {
        case 'date_desc': {
          return dateB - dateA
        }
        case 'date_asc': {
          return dateA - dateB
        }
        case 'name_asc': {
          return a.patientName.localeCompare(b.patientName)
        }
        case 'name_desc': {
          return b.patientName.localeCompare(a.patientName)
        }
        default: {
          return 0
        }
      }
    })

    return result
  })

  // Pagination computed
  const totalPages = computed(() => Math.ceil(filteredCases.value.length / itemsPerPage))

  const paginatedCases = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredCases.value.slice(start, end)
  })

  const paginationStart = computed(() => {
    if (filteredCases.value.length === 0) return 0
    return (currentPage.value - 1) * itemsPerPage + 1
  })

  const paginationEnd = computed(() => {
    const end = currentPage.value * itemsPerPage
    return Math.min(end, filteredCases.value.length)
  })

  // Reset page when filters or tab change
  watch([ownershipFilter, statusFilter, searchQuery, activeTab], () => {
    currentPage.value = 1
  })

  // Empty state messages
  const emptyStateIcon = computed(() => {
    const icons = { inbox: 'mdi-inbox', archived: 'mdi-archive', trash: 'mdi-delete-empty' }
    return icons[activeTab.value]
  })

  const emptyStateTitle = computed(() => {
    const titles = {
      inbox: 'Nenhum caso na caixa de entrada',
      archived: 'Nenhum caso arquivado',
      trash: 'Lixeira vazia',
    }
    return titles[activeTab.value]
  })

  const emptyStateSubtitle = computed(() => {
    const subtitles = {
      inbox: 'Novos casos aparecerão aqui',
      archived: 'Casos concluídos serão arquivados aqui',
      trash: 'Casos removidos aparecerão aqui',
    }
    return subtitles[activeTab.value]
  })

  // Methods
  function getStatusColor (status: string): string {
    const colors: Record<string, string> = {
      novo: 'warning',
      em_analise: 'info',
      concluido: 'success',
    }
    return colors[status] || 'grey'
  }

  function getStatusLabel (status: string): string {
    const labels: Record<string, string> = {
      novo: 'Novo',
      em_analise: 'Em Análise',
      concluido: 'Concluído',
    }
    return labels[status] || status
  }

  // Get icon for processing stage based on progress
  function getProcessingStageIcon (info: { status: string, progress: number, uploadingCount: number, processingCount: number, pendingCount: number }): string {
    if (info.uploadingCount > 0 || info.progress < 10) {
      return 'mdi-cloud-upload'
    }
    if (info.pendingCount > 0 && info.progress === 0) {
      return 'mdi-clock-outline'
    }
    if (info.progress < 50) {
      return 'mdi-cog-sync'
    }
    if (info.progress < 95) {
      return 'mdi-cloud-upload'
    }
    return 'mdi-check-circle'
  }

  // Report/Laudo helper functions
  function getReportIcon (status: string): string {
    switch (status) {
      case 'concluido': {
        return 'mdi-file-download'
      }
      case 'em_analise': {
        return 'mdi-file-clock'
      }
      default: {
        return 'mdi-file-document-outline'
      }
    }
  }

  function getReportButtonColor (status: string): string {
    switch (status) {
      case 'concluido': {
        return 'success'
      }
      case 'em_analise': {
        return 'warning'
      }
      default: {
        return 'grey'
      }
    }
  }

  function getReportTooltip (status: string): string {
    switch (status) {
      case 'concluido': {
        return 'Baixar Laudo (PDF)'
      }
      case 'em_analise': {
        return 'Laudo em elaboração'
      }
      default: {
        return 'Laudo não iniciado'
      }
    }
  }

  async function downloadReport (caseItem: CaseDisplay) {
    if (caseItem.status !== 'concluido') return

    downloadingReport.value = caseItem.id

    try {
      const token = localStorage.getItem('supernavi_token')
      const response = await fetch(`${API_BASE_URL}/cases/${caseItem.id}/report/pdf?token=${token}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error?.message || 'Falha ao gerar PDF'
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laudo_${caseItem.caseNumber}.pdf`
      document.body.append(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()

      // Show success feedback
      reportSnackbar.value = { show: true, message: 'Laudo baixado com sucesso!', color: 'success' }
    } catch (error: any) {
      console.error('[Dashboard] Failed to download report:', error)
      reportSnackbar.value = { show: true, message: error.message || 'Erro ao baixar laudo', color: 'error' }
    } finally {
      downloadingReport.value = null
    }
  }

  function formatDate (date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('pt-BR').format(d)
  }

  function formatMemberSince (date: Date | undefined): string {
    if (!date) return '—'
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  }

  // Format file size for display (bytes to human readable)
  function formatFileSize (bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format speed for display (bytes/s to human readable)
  function formatSpeed (bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 MB/s'
    const mbps = bytesPerSecond / (1024 * 1024)
    return `${mbps.toFixed(1)} MB/s`
  }

  // Format time remaining for display
  function formatTimeRemaining (ms: number): string {
    if (ms <= 0 || !Number.isFinite(ms)) return 'calculando...'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s restantes`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}min ${remainingSeconds}s restantes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min restantes`
  }

  // Cancel upload
  function cancelUpload () {
    if (uploadController.value?.abort) {
      uploadController.value.abort()
    }
    isUploading.value = false
    isProcessing.value = false
    uploadError.value = 'Upload cancelado pelo usuário'
  }

  // Fetch slides for a case and store in cache
  async function fetchCaseSlides (caseId: string): Promise<Slide[]> {
    try {
      const slides = await casesStore.getCaseSlides(caseId)
      caseSlides.value.set(caseId, slides)
      return slides
    } catch (error) {
      console.error('[Dashboard] Error fetching slides:', error)
      return []
    }
  }

  // Fetch slides for all visible cases
  async function fetchAllCasesSlides () {
    // Guard against concurrent fetches
    if (isFetchingSlides.value) {
      console.log('[Dashboard] Skipping fetchAllCasesSlides - already fetching')
      return
    }
    isFetchingSlides.value = true
    try {
      const visibleCases = paginatedCases.value
      await Promise.all(visibleCases.map(c => fetchCaseSlides(c.id)))
    } finally {
      isFetchingSlides.value = false
    }
  }

  // Get processing status info for a case
  function getCaseProcessingInfo (caseId: string): {
    status: ProcessingStatus | 'none'
    pendingCount: number
    processingCount: number
    uploadingCount: number
    readyCount: number
    failedCount: number
    totalCount: number
    progress: number
    stageLabel: string
  } {
    // Check edge processing status first
    const edgeStatus = getCaseProcessingStatus(caseId)
    if (edgeStatus) {
      // If Edge reports 'ready', trust it and return ready status immediately
      // This prevents the overlay from persisting while Cloud syncs
      if (edgeStatus.status === 'ready') {
        return {
          status: 'ready',
          pendingCount: 0,
          processingCount: 0,
          uploadingCount: 0,
          readyCount: 1,
          failedCount: 0,
          totalCount: 1,
          progress: 100,
          stageLabel: '',
        }
      }

      // For active processing states, show processing overlay
      if (edgeStatus.status === 'uploading' || edgeStatus.status === 'queued' || edgeStatus.status === 'processing') {
        const stageLabels: Record<string, string> = {
          uploading: 'Enviando arquivo...',
          queued: 'Na fila...',
          processing: 'Processando...',
        }
        return {
          status: 'processing',
          pendingCount: edgeStatus.status === 'queued' ? 1 : 0,
          processingCount: edgeStatus.status === 'processing' ? 1 : 0,
          uploadingCount: edgeStatus.status === 'uploading' ? 1 : 0,
          readyCount: 0,
          failedCount: 0,
          totalCount: 1,
          progress: edgeStatus.progress,
          stageLabel: stageLabels[edgeStatus.status] || edgeStatus.message,
        }
      }
    }

    const slides = caseSlides.value.get(caseId) || []
    if (slides.length === 0) {
      return { status: 'none', pendingCount: 0, processingCount: 0, uploadingCount: 0, readyCount: 0, failedCount: 0, totalCount: 0, progress: 0, stageLabel: '' }
    }

    const pendingCount = slides.filter(s => s.processingStatus === 'pending').length
    const processingCount = slides.filter(s => s.processingStatus === 'processing').length
    const uploadingCount = slides.filter(s => s.processingStatus === 'uploading').length
    const readyCount = slides.filter(s => s.processingStatus === 'ready').length
    const failedCount = slides.filter(s => s.processingStatus === 'failed').length

    let status: ProcessingStatus | 'none' = 'none'
    if (failedCount > 0) status = 'failed'
    else if (processingCount > 0 || pendingCount > 0) status = 'processing'
    else if (uploadingCount > 0) status = 'uploading'
    else if (readyCount === slides.length) status = 'ready'

    // Calculate average progress and stage label
    let progress = 0
    let stageLabel = ''
    const processingSlides = slides.filter(s =>
      s.processingStatus === 'processing' || s.processingStatus === 'pending' || s.processingStatus === 'uploading',
    )
    if (processingSlides.length > 0) {
      const progressSum = processingSlides.reduce((sum, s) => {
        return sum + (slideProgress.value.get(s.id) || 0)
      }, 0)
      progress = Math.round(progressSum / processingSlides.length)

      // Determine stage label based on progress and Edge connection
      if (progress === 0) {
        // No progress tracked - show appropriate message based on Edge connection
        if (edgeConnected.value) {
          stageLabel = 'Processando no Edge...'
          progress = -1 // Use -1 to indicate indeterminate
        } else {
          stageLabel = 'Aguardando conexão...'
        }
      } else if (progress < 10) {
        stageLabel = 'Iniciando...'
      } else if (progress < 50) {
        stageLabel = 'Convertendo...'
      } else if (progress < 95) {
        stageLabel = 'Gerando tiles...'
      } else {
        stageLabel = 'Finalizando...'
      }
    }

    return { status, pendingCount, processingCount, uploadingCount, readyCount, failedCount, totalCount: slides.length, progress, stageLabel }
  }

  // Check if any case has slides being processed or uploading
  function hasProcessingSlides (): boolean {
    for (const slides of caseSlides.value.values()) {
      if (slides.some(s => s.processingStatus === 'pending' || s.processingStatus === 'processing' || s.processingStatus === 'uploading')) {
        return true
      }
    }
    return false
  }

  // Fetch progress for all processing slides
  async function fetchSlidesProgress () {
    // When Edge is connected, skip Cloud progress polling entirely
    // Progress is tracked via Edge processing tracker + slide status refresh
    if (edgeConnected.value) {
      for (const [caseId, slides] of caseSlides.value.entries()) {
        const edgeStatus = getCaseProcessingStatus(caseId)
        if (edgeStatus) {
          // Update slide progress from Edge status
          for (const slide of slides) {
            if (slide.processingStatus === 'processing' || slide.processingStatus === 'pending' || slide.processingStatus === 'uploading') {
              slideProgress.value.set(slide.id, edgeStatus.progress)
            }
          }
        }
        // If no active edge status, just wait for slide status to update via fetchAllCasesSlides
      }
      return
    }

    // Cloud-only mode: poll Cloud progress endpoint
    for (const [, slides] of caseSlides.value.entries()) {
      for (const slide of slides) {
        if (slide.processingStatus === 'processing' || slide.processingStatus === 'pending' || slide.processingStatus === 'uploading') {
          try {
            const progressData = await slidesApi.getProgress(slide.id)
            slideProgress.value.set(slide.id, progressData.progress)

            // If status changed, update the slide
            if (progressData.status !== slide.processingStatus) {
              slide.processingStatus = progressData.status as ProcessingStatus
            }
          } catch (error: any) {
            // If 404, the Cloud backend doesn't have progress endpoint
            if (error?.status === 404 || error?.message?.includes('Not Found')) {
              console.debug('[Dashboard] Cloud progress endpoint not available for slide:', slide.id)
            } else if (error?.message?.includes('não encontrado')) {
              // Slide was actually deleted - mark as failed
              slide.processingStatus = 'failed'
              slideProgress.value.delete(slide.id)
            } else {
              console.error('[Dashboard] Failed to fetch progress for slide:', slide.id, error)
            }
          }
        }
      }
    }
  }

  // Start polling for processing status updates
  function startProcessingPolling () {
    if (processingPollingInterval.value) return

    processingPollingInterval.value = setInterval(async () => {
      if (hasProcessingSlides()) {
        // Track which slides were processing before fetch
        const processingBefore = new Set<string>()
        for (const slides of caseSlides.value.values()) {
          for (const slide of slides) {
            if (slide.processingStatus === 'processing' || slide.processingStatus === 'pending') {
              processingBefore.add(slide.id)
            }
          }
        }

        await fetchSlidesProgress()
        await fetchAllCasesSlides()

        // Check if any slides that were processing are now ready
        let anyBecameReady = false
        for (const slides of caseSlides.value.values()) {
          for (const slide of slides) {
            if (processingBefore.has(slide.id) && slide.processingStatus === 'ready') {
              anyBecameReady = true
              break
            }
          }
          if (anyBecameReady) break
        }

        // Refresh cases to get updated thumbnailUrl
        if (anyBecameReady) {
          console.log('[Dashboard] Slides became ready, refreshing cases for thumbnails...')
          await casesStore.fetchCases({ forceRefresh: true })
        }
      } else {
        stopProcessingPolling()
        // Final refresh to ensure thumbnails are loaded
        await casesStore.fetchCases({ forceRefresh: true })
      }
    }, POLLING_INTERVAL)
  }

  // Stop polling
  function stopProcessingPolling () {
    if (processingPollingInterval.value) {
      clearInterval(processingPollingInterval.value)
      processingPollingInterval.value = null
    }
  }

  // Get average progress for processing slides in a case
  function getCaseProgress (caseId: string): number {
    const slides = caseSlides.value.get(caseId) || []
    const processingSlides = slides.filter(s =>
      s.processingStatus === 'processing' || s.processingStatus === 'pending' || s.processingStatus === 'uploading',
    )
    if (processingSlides.length === 0) return 0

    let totalProgress = 0
    for (const slide of processingSlides) {
      totalProgress += slideProgress.value.get(slide.id) || 0
    }
    return Math.round(totalProgress / processingSlides.length)
  }

  // Get processing status label and color - only show for active processing or errors
  function getProcessingStatusDisplay (caseId: string): { label: string, color: string, icon: string, progress?: number } | null {
    // Check edge tracking first
    const edgeStatus = getCaseProcessingStatus(caseId)
    if (edgeStatus) {
      if (edgeStatus.status === 'ready') {
        return { label: 'Pronto', color: 'success', icon: 'mdi-check-circle' }
      }
      if (edgeStatus.status === 'failed') {
        return { label: 'Erro', color: 'error', icon: 'mdi-alert-circle' }
      }
      // Active processing - but overlay will show this, so return null
      return null
    }

    const info = getCaseProcessingInfo(caseId)
    if (info.status === 'none' || info.totalCount === 0) return null

    // Only show chip for failed status (errors) or ready status
    // Processing status is shown in the overlay
    if (info.status === 'failed') {
      return { label: `${info.failedCount} erro(s)`, color: 'error', icon: 'mdi-alert-circle' }
    }
    if (info.status === 'ready' && info.readyCount === info.totalCount) {
      // All slides ready - don't show anything (normal state)
      return null
    }
    // For processing/uploading, overlay will show status
    return null
  }

  // Check if case is currently being processed (for loading state)
  function isProcessingCase (caseId: string): boolean {
    // Check edge processing status first - only show overlay for active processing
    const edgeStatus = getCaseProcessingStatus(caseId)
    if (edgeStatus) {
      // Only show overlay for uploading, queued, or processing - NOT for ready or failed
      return edgeStatus.status === 'uploading' || edgeStatus.status === 'queued' || edgeStatus.status === 'processing'
    }

    const info = getCaseProcessingInfo(caseId)
    return info.status === 'processing' || info.status === 'uploading'
  }

  // Handle thumbnail load error
  function handleThumbnailError () {
    // Thumbnail error handling is done in CaseCard
    // This is just for any additional error handling if needed
  }

  function closeProfile () {
    editingField.value = null
    showProfile.value = false
  }

  function startEditing (field: string) {
    if (editingField.value === field) return
    // Populate form with current values
    profileForm.value = {
      name: authStore.user?.name || '',
      email: authStore.user?.email || '',
      crm: authStore.user?.crm || '',
      specialization: authStore.user?.specialization || '',
    }
    editingField.value = field
  }

  async function saveField (field: string) {
    if (authStore.user) {
      const key = field as keyof typeof profileForm.value
      const value = profileForm.value[key]

      // Update via API
      await authStore.updateProfile({ [field]: value })
    }
    editingField.value = null
  }

  function cancelEditing () {
    editingField.value = null
  }

  function triggerAvatarUpload () {
    avatarInput.value?.click()
  }

  function handleAvatarUpload (event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
      const file = input.files[0]
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return
      }
      // Convert to base64 and upload
      const reader = new FileReader()
      reader.addEventListener('load', async e => {
        if (authStore.user && e.target?.result) {
          const avatarUrl = e.target.result as string
          await authStore.updateProfile({ avatarUrl })
        }
      })
      reader.readAsDataURL(file)
    }
  }

  async function removeAvatar () {
    if (authStore.user) {
      await authStore.updateProfile({ avatarUrl: null })
    }
  }

  function triggerFileInput () {
    fileInput.value?.click()
  }

  function cancelNewCase () {
    showNewCaseDialog.value = false
  }

  function removeSlide (index: number) {
    newCaseForm.value.slides.splice(index, 1)
  }

  function triggerAddMoreSlides () {
    additionalSlidesInput.value?.click()
  }

  function handleAdditionalSlides (event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files) {
      newCaseForm.value.slides.push(...Array.from(input.files))
    }
    input.value = ''
  }

  // Helper to get file format from extension
  function getFileFormat (filename: string): FileFormat {
    const ext = filename.split('.').pop()?.toLowerCase()
    const formatMap: Record<string, FileFormat> = {
      svs: 'svs',
      tif: 'tif',
      tiff: 'tiff',
      ndpi: 'ndpi',
      dzi: 'dzi',
    }
    return formatMap[ext || ''] || 'svs'
  }

  async function createNewCase () {
    // Generate new case number
    const timestamp = Date.now()
    const caseNumber = `CASE-${new Date().getFullYear()}-${String(timestamp).slice(-6)}`

    // Create case via API
    const newCase = await casesStore.createCase({
      caseNumber,
      patientName: newCaseForm.value.patientName,
      patientAge: newCaseForm.value.age || undefined,
      patientSex: (newCaseForm.value.sex as 'M' | 'F') || undefined,
    })

    if (!newCase) {
      console.error('Failed to create case:', casesStore.error.value)
      return
    }

    // Close new case dialog and start upload
    showNewCaseDialog.value = false
    processingCaseId.value = caseNumber
    uploadError.value = null
    isUploading.value = true

    try {
      const totalFiles = newCaseForm.value.slides.length
      let fileIndex = 0

      // Upload each file with progress tracking
      for (const file of newCaseForm.value.slides) {
        if (!file) continue

        fileIndex++
        const slideId = crypto.randomUUID()
        const s3Key = `uploads/raw/${slideId}/${file.name}`

        // Reset progress for new file
        currentUploadFile.value = {
          name: file.name,
          index: fileIndex,
          total: totalFiles,
        }
        uploadProgress.value = {
          loaded: 0,
          total: file.size,
          percent: 0,
          speed: 0,
          elapsed: 0,
          remaining: 0,
        }

        // Create new controller for this upload
        uploadController.value = { abort: () => {} }

        // Upload to edge (local) or cloud (S3) based on connection status
        if (edgeConnected.value) {
          console.log(`[Dashboard] Uploading ${file.name} (${formatFileSize(file.size)}) to Edge (local)...`)

          await uploadFileToEdge(
            file,
            EDGE_URL,
            (progress: UploadProgress) => {
              uploadProgress.value = progress
            },
            uploadController.value,
          )

          console.log(`[Dashboard] Upload complete to edge. Creating slide record in cloud...`)

          // Create slide record in cloud for dashboard visibility
          // Edge will process the file locally, but cloud needs to know about it
          await casesApi.addSlide(newCase.id, {
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalFilename: file.name,
            fileFormat: getFileFormat(file.name),
            fileSize: file.size.toString(),
            storagePath: `edge://${file.name}`, // Mark as edge-stored
          })

          console.log(`[Dashboard] Slide record created. Edge watcher will process the file.`)
        } else {
          console.log(`[Dashboard] Uploading ${file.name} (${formatFileSize(file.size)}) to S3 (cloud)...`)

          await uploadFileToS3(
            file,
            s3Key,
            (progress: UploadProgress) => {
              uploadProgress.value = progress
            },
            uploadController.value,
          )

          console.log(`[Dashboard] Upload complete, creating slide record...`)

          // Create slide in API (this triggers the worker)
          await casesApi.addSlide(newCase.id, {
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for name
            originalFilename: file.name,
            fileFormat: getFileFormat(file.name),
            fileSize: file.size.toString(),
            storagePath: s3Key,
          })

          console.log(`[Dashboard] Slide ${slideId} created and queued for processing`)
        }
      }

      // All uploads complete - close dialog and refresh cases
      isUploading.value = false
      isProcessing.value = false

      // Refresh case list to show the new case with processing status
      await casesStore.fetchCases({ forceRefresh: true })

      // Show success snackbar with helpful message
      showSuccessMessage(`Caso ${newCase.caseNumber} criado! O processamento está em andamento.`)

      // Start tracking edge processing for uploaded files
      if (edgeConnected.value) {
        for (const file of newCaseForm.value.slides) {
          if (file) {
            startEdgeProcessingTracker(file.name, newCase.id)
          }
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error creating case:', error)
      isUploading.value = false
      isProcessing.value = false

      if (error instanceof Error && error.message === 'Upload cancelled') {
        uploadError.value = 'Upload cancelado'
      } else {
        uploadError.value = error instanceof Error ? error.message : 'Erro ao enviar arquivo'
      }
    }
  }

  // Edge processing tracker - polls the edge API for processing status
  function startEdgeProcessingTracker (filename: string, caseId: string) {
    // Initialize tracking
    edgeProcessingFiles.value.set(filename, {
      filename,
      caseId,
      status: 'queued',
      message: 'Iniciando processamento...',
      progress: 5,
    })

    // Start polling
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${EDGE_URL}/v1/slides/by-filename/${encodeURIComponent(filename)}`)
        if (!response.ok) throw new Error('Failed to fetch status')

        const data = await response.json()

        if (data.found) {
          edgeProcessingFiles.value.set(filename, {
            filename,
            caseId,
            status: data.previewPublished ? 'ready' : data.status,
            message: data.message,
            progress: data.progress,
            slideId: data.slideId,
          })

          // Stop polling when preview is published or failed
          // previewPublished means the preview is uploaded to Wasabi and event sent to Cloud
          if (data.previewPublished || data.status === 'failed') {
            clearInterval(pollInterval)

            // Refresh cases to update the card
            if (data.previewPublished) {
              // Wait for Cloud to receive and process the PreviewPublished event from Edge sync
              // Edge sync interval is 2s, plus Cloud processing time
              // Retry up to 10 times with 2s delay (total ~20s max wait)
              const refreshWithRetry = async (retries = 10, delay = 2000) => {
                console.log(`[Dashboard] Waiting for Cloud to sync preview for ${filename}...`)

                for (let i = 0; i < retries; i++) {
                  await new Promise(resolve => setTimeout(resolve, delay))

                  // Refresh cases from Cloud
                  await casesStore.fetchCases({ forceRefresh: true })

                  // Check if thumbnail is now available
                  const updatedCase = casesStore.cases.value.find(c => c.id === caseId)
                  if (updatedCase?.thumbnailUrl) {
                    console.log(`[Dashboard] Thumbnail available after ${i + 1} refresh(es) (${(i + 1) * delay / 1000}s)`)
                    return true
                  }

                  // Also check if slides show as ready
                  await fetchAllCasesSlides()
                  const slides = caseSlides.value.get(caseId) || []
                  const readySlides = slides.filter(s => s.processingStatus === 'ready')
                  console.log(`[Dashboard] Retry ${i + 1}/${retries}: ${readySlides.length}/${slides.length} slides ready, thumbnail: ${updatedCase?.thumbnailUrl ? 'yes' : 'no'}`)
                }
                console.log(`[Dashboard] Thumbnail still not available after ${retries} retries`)
                return false
              }

              const success = await refreshWithRetry()

              // Force local slide status to ready (in case Cloud sync is slow)
              const localSlides = caseSlides.value.get(caseId) || []
              for (const slide of localSlides) {
                if (slide.processingStatus !== 'ready' && slide.processingStatus !== 'failed') {
                  console.log(`[Dashboard] Forcing slide ${slide.id} status to ready (Edge reported previewPublished)`)
                  slide.processingStatus = 'ready'
                }
              }

              // Clear edge processing tracker to remove overlay
              edgeProcessingFiles.value.delete(filename)

              // Final refresh to ensure slide status is updated
              await casesStore.fetchCases({ forceRefresh: true })
              await fetchAllCasesSlides()

              if (success) {
                showSuccessMessage(`Lâmina ${filename} processada com sucesso!`)
              } else {
                showSuccessMessage(`Lâmina ${filename} processada. Atualize a página se o thumbnail não aparecer.`)
              }
            }

            // Remove from tracking after a delay
            setTimeout(() => {
              edgeProcessingFiles.value.delete(filename)
            }, 3000)
          }
        } else {
          // Still waiting for file to be detected
          edgeProcessingFiles.value.set(filename, {
            filename,
            caseId,
            status: 'uploading',
            message: data.message || 'Aguardando detecção do arquivo...',
            progress: 10,
          })
        }
      } catch (error) {
        console.error(`[Dashboard] Error polling edge status for ${filename}:`, error)
      }
    }, 2000) // Poll every 2 seconds

    // Stop polling after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      const current = edgeProcessingFiles.value.get(filename)
      if (current && current.status !== 'ready') {
        edgeProcessingFiles.value.set(filename, {
          ...current,
          status: 'failed',
          message: 'Tempo limite excedido',
          progress: 0,
        })
      }
    }, 5 * 60 * 1000)
  }

  // Get processing status for a case (combines all files)
  function getCaseProcessingStatus (caseId: string): EdgeProcessingStatus | null {
    for (const [, status] of edgeProcessingFiles.value) {
      if (status.caseId === caseId) {
        return status
      }
    }
    return null
  }

  function handleFileSelect (event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      openNewCaseDialogWithFiles(Array.from(input.files))
    }
    input.value = ''
  }

  function handleFileDrop (event: DragEvent) {
    isDragOver.value = false
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      openNewCaseDialogWithFiles(Array.from(event.dataTransfer.files))
    }
  }

  function openNewCaseDialogWithFiles (files: File[]) {
    newCaseForm.value = {
      patientName: '',
      sex: '',
      age: null,
      slides: files,
    }
    showNewCaseDialog.value = true
  }

  // Add slides to existing case functions
  function openAddSlidesDialog (caseItem: CaseDisplay) {
    addSlidesToCase.value = caseItem
    addSlidesFiles.value = []
    showAddSlidesDialog.value = true
  }

  function triggerAddSlidesInput () {
    addSlidesInput.value?.click()
  }

  function handleAddSlidesSelect (event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      addSlidesFiles.value = [...addSlidesFiles.value, ...Array.from(input.files)]
    }
    input.value = ''
  }

  function removeAddSlideFile (index: number) {
    addSlidesFiles.value.splice(index, 1)
  }

  async function submitAddSlides () {
    if (!addSlidesToCase.value || addSlidesFiles.value.length === 0) return

    const targetCase = addSlidesToCase.value
    showAddSlidesDialog.value = false

    // Start upload process
    processingCaseId.value = targetCase.caseNumber
    uploadError.value = null
    isUploading.value = true

    try {
      const totalFiles = addSlidesFiles.value.length
      let fileIndex = 0

      for (const file of addSlidesFiles.value) {
        if (!file) continue

        fileIndex++
        const slideId = crypto.randomUUID()
        const s3Key = `uploads/raw/${slideId}/${file.name}`

        // Reset progress for new file
        currentUploadFile.value = {
          name: file.name,
          index: fileIndex,
          total: totalFiles,
        }
        uploadProgress.value = {
          loaded: 0,
          total: file.size,
          percent: 0,
          speed: 0,
          elapsed: 0,
          remaining: 0,
        }

        uploadController.value = { abort: () => {} }

        // Upload to edge (local) or cloud (S3) based on connection status
        if (edgeConnected.value) {
          console.log(`[Dashboard] Uploading ${file.name} to Edge (local) for case ${targetCase.caseNumber}...`)

          await uploadFileToEdge(
            file,
            EDGE_URL,
            (progress: UploadProgress) => {
              uploadProgress.value = progress
            },
            uploadController.value,
          )

          console.log(`[Dashboard] Upload complete to edge. Creating slide record...`)

          // Create slide record in cloud
          await casesApi.addSlide(targetCase.id, {
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalFilename: file.name,
            fileFormat: getFileFormat(file.name),
            fileSize: file.size.toString(),
            storagePath: `edge://${file.name}`,
          })

          console.log(`[Dashboard] Slide added to case ${targetCase.caseNumber}`)
        } else {
          console.log(`[Dashboard] Uploading ${file.name} to S3 for case ${targetCase.caseNumber}...`)

          await uploadFileToS3(
            file,
            s3Key,
            (progress: UploadProgress) => {
              uploadProgress.value = progress
            },
            uploadController.value,
          )

          console.log(`[Dashboard] Upload complete, creating slide record...`)

          // Create slide in API
          await casesApi.addSlide(targetCase.id, {
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalFilename: file.name,
            fileFormat: getFileFormat(file.name),
            fileSize: file.size.toString(),
            storagePath: s3Key,
          })

          console.log(`[Dashboard] Slide added to case ${targetCase.caseNumber}`)
        }
      }

      // All uploads complete
      isUploading.value = false
      isProcessing.value = true
      processingStep.value = 1

      setTimeout(() => {
        processingStep.value = 2
        setTimeout(() => {
          isProcessing.value = false
          processingStep.value = 0
          processingCaseId.value = ''
          // Refresh cases to show updated slide count
          casesStore.fetchCases({ forceRefresh: true })
        }, 2000)
      }, 2000)

      // Clear form
      addSlidesFiles.value = []
      addSlidesToCase.value = null

      reportSnackbar.value = {
        show: true,
        message: `${totalFiles} lâmina(s) adicionada(s) ao caso ${targetCase.caseNumber}`,
        color: 'success',
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to add slides:', error)
      isUploading.value = false
      uploadError.value = error.message || 'Erro ao adicionar lâminas'
    }
  }

  function openCase (caseItem: any) {
    // Check if case is still processing
    const info = getCaseProcessingInfo(caseItem.id)
    if (info.status === 'processing' || info.status === 'uploading' || info.status === 'pending') {
      // Show helpful message instead of navigating
      showSuccessMessage(`As lâminas deste caso ainda estão sendo processadas (${info.progress}%). Aguarde a conclusão para visualizar.`)
      return
    }
    router.push(`/viewer?caseId=${caseItem.id}`)
  }

  // API URLs
  const CLOUD_BASE_URL = import.meta.env.VITE_API_URL || 'https://cloud.supernavi.app'
  const API_BASE_URL = `${CLOUD_BASE_URL}/api`

  // Generate thumbnail URL for a case (uses Cloud API's preview endpoint)
  // Uses relative URLs to go through Vite proxy in development
  function getThumbnailUrls (caseId: string): string[] {
    // Get all thumbnail URLs from the case's slides
    const slides = caseSlides.value.get(caseId) || []
    const urls: string[] = []

    for (const slide of slides) {
      // Use thumbnailUrl if available, otherwise construct from slide ID
      // Use relative paths to go through Vite proxy (avoids CORS issues in dev)
      if (slide.thumbnailUrl) {
        urls.push(slide.thumbnailUrl)
      } else if (slide.id) {
        // Construct thumbnail URL from slide ID
        urls.push(`/preview/${slide.id}/thumb.jpg`)
      }
    }

    // If no slide thumbnails, try case thumbnail as fallback
    if (urls.length === 0) {
      const caseItem = casesStore.cases.value.find(c => c.id === caseId)
      if (caseItem?.thumbnailUrl) {
        urls.push(caseItem.thumbnailUrl)
      }
    }

    return urls
  }

  function openCollaboration (collab: any) {
    showCollaborations.value = false
    const query: Record<string, string> = { caseId: collab.caseId }
    if (collab.roiId) query.roiId = String(collab.roiId)
    router.push({ path: '/viewer', query })
  }

  async function acceptInvitation (invitation: any) {
    // Mark notification as read (accepting the invitation)
    await notificationsStore.markAsRead(invitation.id)

    // Navigate to the case
    if (invitation.relatedCaseId) {
      router.push(`/viewer?caseId=${invitation.relatedCaseId}`)
    }

    // Refresh cases list to include the newly accessible case
    await casesStore.fetchCases({ forceRefresh: true })

    console.log('[Dashboard] Invitation accepted:', invitation.relatedCaseId)
  }

  async function declineInvitation (invitation: any) {
    // Delete the notification (declining the invitation)
    await notificationsStore.deleteNotification(invitation.id)

    console.log('[Dashboard] Invitation declined:', invitation.relatedCaseId)
  }

  function goToReports () {
    router.push('/dashboard/reports')
  }

  function goToSettings () {
    router.push('/dashboard/settings')
  }

  function handleLogout () {
    // Clear all cached data
    authStore.logout()
    casesStore.clearCache()
    notificationsStore.clearCache()
    router.push('/')
  }

  // Drag-and-drop handlers for case cards
  function handleCardDragStart (event: DragEvent, caseItem: CaseDisplay) {
    draggingCase.value = caseItem
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', caseItem.id)
    }
    // Add visual feedback to the dragged card
    const target = event.target as HTMLElement
    setTimeout(() => {
      target.classList.add('dragging')
    }, 0)
  }

  function handleCardDragEnd (event: DragEvent) {
    draggingCase.value = null
    dragOverTab.value = null
    const target = event.target as HTMLElement
    target.classList.remove('dragging')
  }

  function handleTabDragOver (tabValue: string) {
    if (draggingCase.value && tabValue !== activeTab.value) {
      dragOverTab.value = tabValue
    }
  }

  function handleTabDragLeave () {
    dragOverTab.value = null
  }

  async function handleTabDrop (location: CaseLocation) {
    if (draggingCase.value && location !== draggingCase.value.location) {
      await moveCaseToLocation(draggingCase.value, location)
    }
    draggingCase.value = null
    dragOverTab.value = null
  }

  // Move case to a specific location
  async function moveCaseToLocation (caseItem: CaseDisplay, location: CaseLocation) {
    const success = await casesStore.moveCase(caseItem.id, location)
    if (success) {
      // Show brief feedback
      const locationLabels: Record<CaseLocation, string> = {
        inbox: 'Caixa de Entrada',
        archived: 'Arquivados',
        trash: 'Lixeira',
      }
      console.log(`[Dashboard] Caso ${caseItem.caseNumber} movido para ${locationLabels[location]}`)
    }
  }

  // Delete case permanently
  function confirmDeleteCase (caseItem: CaseDisplay) {
    console.log('[Dashboard] Abrindo diálogo de exclusão para:', caseItem.caseNumber)
    caseToDelete.value = caseItem
    showDeleteConfirm.value = true
  }

  async function deleteCasePermanently () {
    if (caseToDelete.value) {
      console.log('[Dashboard] Excluindo permanentemente:', caseToDelete.value.caseNumber)
      const success = await casesStore.deleteCase(caseToDelete.value.id)
      if (success) {
        console.log(`[Dashboard] Caso ${caseToDelete.value.caseNumber} excluído permanentemente`)
      } else {
        console.error('[Dashboard] Falha ao excluir caso:', casesStore.error.value)
      }
    }
    showDeleteConfirm.value = false
    caseToDelete.value = null
  }

  function cancelDelete () {
    showDeleteConfirm.value = false
    caseToDelete.value = null
  }

  // Empty trash function
  async function emptyTrash () {
    const trashCases = cases.value.filter(c => c.location === 'trash')
    if (trashCases.length === 0) {
      showEmptyTrashConfirm.value = false
      return
    }

    isEmptyingTrash.value = true
    console.log(`[Dashboard] Limpando lixeira: ${trashCases.length} casos`)

    let successCount = 0
    let failCount = 0

    for (const caseItem of trashCases) {
      try {
        const success = await casesStore.deleteCase(caseItem.id)
        if (success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`[Dashboard] Erro ao excluir caso ${caseItem.caseNumber}:`, error)
        failCount++
      }
    }

    isEmptyingTrash.value = false
    showEmptyTrashConfirm.value = false

    if (failCount === 0) {
      showSuccessMessage(`Lixeira limpa! ${successCount} ${successCount === 1 ? 'caso excluído' : 'casos excluídos'}.`)
    } else {
      showSuccessMessage(`${successCount} casos excluídos, ${failCount} falharam.`)
    }

    console.log(`[Dashboard] Lixeira limpa: ${successCount} excluídos, ${failCount} falhas`)
  }

  // Invite collaborator functions
  function openInviteCollaboratorDialog (caseItem: CaseDisplay) {
    inviteCollaboratorCase.value = caseItem
    collaboratorSearch.value = ''
    collaboratorSearchResults.value = []
    showInviteCollaboratorDialog.value = true
  }

  function closeInviteCollaboratorDialog () {
    showInviteCollaboratorDialog.value = false
    inviteCollaboratorCase.value = null
    collaboratorSearch.value = ''
    collaboratorSearchResults.value = []
  }

  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  async function searchCollaborators () {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    const query = collaboratorSearch.value.trim()
    if (query.length < 2) {
      collaboratorSearchResults.value = []
      return
    }

    searchDebounceTimer = setTimeout(async () => {
      isSearchingCollaborators.value = true
      try {
        collaboratorSearchResults.value = await usersApi.search(query)
      } catch (err) {
        console.error('[Dashboard] Erro ao buscar colaboradores:', err)
        collaboratorSearchResults.value = []
      } finally {
        isSearchingCollaborators.value = false
      }
    }, 300)
  }

  async function inviteCollaborator (userId: string) {
    if (!inviteCollaboratorCase.value) return

    isInvitingCollaborator.value = true
    try {
      await casesApi.addCollaborator(inviteCollaboratorCase.value.id, userId, 'collaborator')
      console.log('[Dashboard] Colaborador adicionado com sucesso')
      closeInviteCollaboratorDialog()
      // Refresh cases to show updated collaborators
      await casesStore.fetchCases()
    } catch (err) {
      console.error('[Dashboard] Erro ao adicionar colaborador:', err)
    } finally {
      isInvitingCollaborator.value = false
    }
  }

  onMounted(async () => {
    // Initialize auth from storage and validate token
    const isValid = await authStore.initFromStorage()

    if (!isValid) {
      // Not authenticated, redirect to login
      router.push('/')
      return
    }

    // Load data from API
    await Promise.all([
      casesStore.fetchCases(),
      notificationsStore.fetchNotifications(),
    ])

    // Fetch slides for all cases to check processing status
    await fetchAllCasesSlides()

    // Start polling if there are any processing slides
    if (hasProcessingSlides()) {
      startProcessingPolling()
    }
  })

  onUnmounted(() => {
    stopProcessingPolling()
    // Clear edge tracking
    edgeProcessingFiles.value.clear()
  })

  // Watch for case changes to refresh slides
  // Use a shallow comparison to avoid triggering on every render
  let lastPaginatedCaseIds: string[] = []
  watch(paginatedCases, async newCases => {
    const newCaseIds = newCases.map(c => c.id).join(',')
    const oldCaseIds = lastPaginatedCaseIds.join(',')

    // Only fetch if the case IDs actually changed
    if (newCaseIds !== oldCaseIds) {
      lastPaginatedCaseIds = newCases.map(c => c.id)
      await fetchAllCasesSlides()
      if (hasProcessingSlides()) {
        startProcessingPolling()
      }
    }
  }, { immediate: true })
</script>

<style scoped lang="scss">
// Apple-like color palette
$color-bg: #F2F2F7;
$color-bg-dark: #000000;
$color-surface: #ffffff;
$color-surface-dark: #1C1C1E;
$color-border: #E5E5EA;
$color-border-dark: #38383A;
$color-text: #1C1C1E;
$color-text-dark: #FFFFFF;
$color-muted: #8E8E93;
$color-primary: #007AFF;
$color-accent: #34C759;

.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

// Header - Apple-like minimal design
.dashboard-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 20px;
  background: rgba(var(--v-theme-surface), 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.brand-name {
  font-family: 'SF Pro Display', 'Inter', system-ui, sans-serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.header-divider {
  width: 1px;
  height: 16px;
  background: rgba(var(--v-theme-on-surface), 0.15);
}

.header-subtitle {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.5);
  letter-spacing: 0.01em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.06);
    color: rgb(var(--v-theme-on-surface));
  }

  &:active {
    transform: scale(0.95);
  }
}

.user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;

  :deep(.v-avatar) {
    flex-shrink: 0;
  }

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.98);
  }
}

// User Avatar - Custom implementation
.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  overflow: hidden;
  flex-shrink: 0;

  &.large {
    width: 40px;
    height: 40px;
  }

  &.has-image {
    background: transparent;
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-initials {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: white;

  .large & {
    font-size: 0.9rem;
  }
}

// User Menu - Apple-like dropdown
.user-menu {
  min-width: 240px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.1);
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.user-menu-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-menu-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-email {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-list {
  padding: 4px 8px !important;

  .v-list-item {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 0.8125rem;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.05);
    }
  }

  .v-list-item__prepend > .v-icon {
    opacity: 0.7;
    margin-inline-end: 12px;
  }
}

.theme-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.theme-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 8px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.logout-item {
  color: rgba(var(--v-theme-error), 0.9);

  .v-list-item__prepend > .v-icon {
    color: rgba(var(--v-theme-error), 0.9);
  }
}

// Main
.dashboard-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 24px 16px;
  overflow: hidden;
}

// Quick Actions - Compact Apple-like bar
.quick-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface), 0.6);
  border: 1px solid rgba(var(--v-border-color), 0.08);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.new-case-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  background: rgb(var(--v-theme-primary));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.9);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &.drag-over {
    background: rgba(var(--v-theme-primary), 0.85);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2);
  }
}

.supported-formats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.formats-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

// Segment Control - Apple-style tabs
.segment-control {
  display: flex;
  padding: 3px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  gap: 2px;
}

.segment-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(.active) {
    color: rgba(var(--v-theme-on-surface), 0.8);
    background: rgba(var(--v-theme-on-surface), 0.04);
  }

  &.active {
    background: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  &.drag-over {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
  }
}

.segment-label {
  white-space: nowrap;
}

.segment-count {
  font-size: 0.6875rem;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 9px;
  color: rgba(var(--v-theme-on-surface), 0.6);

  .segment-btn.active & {
    background: rgba(var(--v-theme-primary), 0.15);
    color: rgb(var(--v-theme-primary));
  }
}

// Toolbar Layout
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  padding-bottom: 12px;
}

.toolbar-left {
  padding-bottom: 12px;
}

// Search Container - Native Apple-style
.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  pointer-events: none;
}

.search-input {
  width: 200px;
  height: 32px;
  padding: 0 32px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.2s ease;

  &::placeholder {
    color: rgba(var(--v-theme-on-surface), 0.4);
  }

  &:focus {
    outline: none;
    background: rgba(var(--v-theme-surface), 1);
    border-color: rgba(var(--v-theme-primary), 0.4);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
  }
}

.search-clear {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: rgba(var(--v-theme-on-surface), 0.15);
  border: none;
  border-radius: 50%;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.25);
    color: rgb(var(--v-theme-on-surface));
  }
}

// Filter Button - Apple-style
.empty-trash-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-error));

  :deep(.v-icon) {
    color: rgb(var(--v-theme-error)) !important;
  }

  &:hover {
    background: rgba(var(--v-theme-error), 0.15);
    border-color: rgba(var(--v-theme-error), 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
}

.filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  :deep(.v-icon) {
    color: rgba(var(--v-theme-on-surface), 0.6) !important;
    font-size: 16px;
  }

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.1);

    :deep(.v-icon) {
      color: rgb(var(--v-theme-on-surface)) !important;
    }
  }

  &.active {
    background: rgba(var(--v-theme-primary), 0.1);
    border-color: rgba(var(--v-theme-primary), 0.2);

    :deep(.v-icon) {
      color: rgb(var(--v-theme-primary)) !important;
    }
  }
}

.filter-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-primary));
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 8px;
}

// Upload Section
.upload-section {
  margin-bottom: 40px;
}

.upload-zone {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(var(--v-theme-primary), 0.02);

  &:hover,
  &.drag-over {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.06);
    transform: translateY(-2px);
  }

  &.has-files {
    cursor: default;
    border-style: solid;
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.04);
  }
}

// Add slides dialog styles
.add-slides-zone {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(var(--v-theme-primary), 0.02);

  &:hover {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.05);
  }
}

.selected-files-list {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 50%;
  color: rgb(var(--v-theme-primary));
}

.upload-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.upload-subtitle {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  font-weight: 500;
}

.upload-hint {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0;
}

.files-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;

  .files-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-width: 100%;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 8px 12px;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 8px;
    max-width: 250px;
  }

  .file-name {
    font-size: 13px;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.files-actions {
  display: flex;
  gap: 12px;
}

.upload-formats {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

// Format Tag - Apple-like pill
.format-tag {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  text-transform: uppercase;
}

.files-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.files-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant));
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-error), 0.1);
    color: rgb(var(--v-theme-error));
  }
}

.open-viewer-btn {
  min-width: 200px;
}

// Cases Section
.cases-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; // Important for flex children to respect overflow
  overflow: hidden;
}

// Cases Toolbar - Clean Apple-like
.cases-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}

// Inbox Tabs
.inbox-tabs {
  display: flex;
  gap: 4px;
}

.inbox-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border-radius: 8px 8px 0 0;

  &:hover {
    color: rgb(var(--v-theme-on-surface));
    background: rgba(var(--v-theme-on-surface), 0.04);
  }

  &.active {
    color: rgb(var(--v-theme-primary));
    border-bottom-color: rgb(var(--v-theme-primary));
  }

  // Drag-over state (when dragging a card over the tab)
  &.drag-over {
    background: rgba(var(--v-theme-primary), 0.15);
    color: rgb(var(--v-theme-primary));
    border-bottom-color: rgb(var(--v-theme-primary));
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.2);

    .tab-count {
      background: rgba(var(--v-theme-primary), 0.2);
      color: rgb(var(--v-theme-primary));
    }
  }
}

.tab-count {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface-variant));

  .inbox-tab.active & {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
  }
}

// Empty State - Apple-like minimal
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 16px;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 20px 0 6px;
  letter-spacing: -0.01em;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin: 0;
  max-width: 280px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.section-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-field {
  width: 200px;
}

// Filter Popover - Apple-like dropdown
.filter-popover {
  min-width: 260px;
  background: rgb(var(--v-theme-surface));
  border-radius: 14px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(var(--v-border-color), 0.08);
  overflow: hidden;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.filter-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.01em;
}

.filter-reset {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
}

.filter-body {
  padding: 6px 16px 16px;
}

.filter-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.filter-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-segment {
  display: flex;
  padding: 3px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  gap: 2px;
}

.filter-segment-btn {
  flex: 1;
  height: 30px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(.active) {
    color: rgba(var(--v-theme-on-surface), 0.8);
  }

  &.active {
    background: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.filter-select {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all 0.15s ease;

  &:focus {
    outline: none;
    border-color: rgba(var(--v-theme-primary), 0.5);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
  }

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }
}

.filter-footer {
  padding: 12px 16px 14px;
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.filter-apply-btn {
  width: 100%;
  height: 36px;
  background: rgb(var(--v-theme-primary));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.9);
  }

  &:active {
    transform: scale(0.98);
  }
}

// Cases Grid - Apple-like layout
.cases-scroll-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  // Hide scrollbar but keep scroll functionality
  scrollbar-width: none; // Firefox
  -ms-overflow-style: none; // IE/Edge

  &::-webkit-scrollbar {
    display: none; // Chrome/Safari
  }
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-content: start;
  padding-bottom: 8px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

// Pagination - Apple-like minimal
.pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
  background: rgb(var(--v-theme-background));
}

.pagination-info {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

// Case Card Styles - Apple-like clean design
.case-card {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border-color: rgba(var(--v-border-color), 0.15);

    .card-menu-btn {
      opacity: 1;
    }

    .case-thumbnail {
      transform: scale(1.02);
    }
  }

  &.is-collab {
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: rgb(var(--v-theme-secondary));
      border-radius: 12px 0 0 12px;
    }
  }

  // Drag state
  &.dragging {
    opacity: 0.5;
    transform: scale(0.98) rotate(1deg);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
  }
}

// Case Thumbnail - Apple-like
.case-thumbnail {
  transition: transform 0.25s ease;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 12px 12px 0 0;
}

.thumbnail-overlay {
  position: absolute;
  top: 10px;
  right: 10px;

  .v-chip {
    font-size: 0.65rem;
    font-weight: 600;
    height: 22px;
    padding: 0 8px;
    border-radius: 6px;
  }
}

.case-placeholder {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  position: relative;
  border-radius: 12px 12px 0 0;

  .v-icon {
    opacity: 0.3;
  }

  .status-chip-placeholder {
    position: absolute;
    top: 10px;
    right: 10px;
  }
}

// Processing Overlay - Apple-like with gradient
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.92) 0%, rgba(88, 86, 214, 0.92) 100%);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.v-theme--medicalDark .processing-overlay {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.92) 0%, rgba(94, 92, 230, 0.92) 100%);
}

.processing-overlay-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  width: 100%;
}

.stage-icon-container {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-icon-bg {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 10px;
}

.stage-icon {
  position: relative;
  z-index: 1;
}

.icon-pulse {
  animation: iconPulse 1.5s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.progress-ring-container {
  flex-shrink: 0;
}

.progress-percent {
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
}

.stage-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stage-label {
  font-size: 13px;
  color: white;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.progress-bar-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
}

.progress-bar-fill {
  height: 100%;
  background: white;
  transition: width 0.3s ease;
  border-radius: 0 2px 2px 0;
}

// Case Card Typography - Apple-like
.case-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgb(var(--v-theme-on-surface));
}

.case-subtitle {
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.case-number {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.5);
  letter-spacing: 0.01em;
}

// Card Menu Button
.card-menu-btn {
  opacity: 0;
  transition: opacity 0.15s ease;
}

// Apple-like Context Menu
.apple-menu {
  min-width: 200px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 12px;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.1),
    0 10px 40px rgba(0, 0, 0, 0.15),
    0 2px 10px rgba(0, 0, 0, 0.1);
}

.v-theme--medicalDark .apple-menu {
  background: rgba(40, 40, 42, 0.85);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.1),
    0 10px 40px rgba(0, 0, 0, 0.4),
    0 2px 10px rgba(0, 0, 0, 0.3);
}

.apple-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  cursor: pointer;
  transition: background-color 0.1s ease;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.12);
  }

  &:active {
    background: rgba(var(--v-theme-primary), 0.2);
  }

  .v-icon {
    opacity: 0.7;
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }

  &.destructive {
    color: #FF3B30;

    .v-icon {
      color: #FF3B30;
      opacity: 1;
    }

    &:hover {
      background: rgba(255, 59, 48, 0.12);
    }

    &:active {
      background: rgba(255, 59, 48, 0.2);
    }
  }
}

.apple-menu-divider {
  height: 1px;
  margin: 6px 12px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}

// Apple-like Alert Dialog
.apple-alert-dialog {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 14px;
  padding: 24px;
  text-align: center;
  box-shadow:
    0 0 0 0.5px rgba(0, 0, 0, 0.1),
    0 25px 50px rgba(0, 0, 0, 0.25);
}

.v-theme--medicalDark .apple-alert-dialog {
  background: rgba(44, 44, 46, 0.95);
  box-shadow:
    0 0 0 0.5px rgba(255, 255, 255, 0.1),
    0 25px 50px rgba(0, 0, 0, 0.5);
}

.alert-icon {
  margin-bottom: 12px;

  .v-icon {
    background: rgba(255, 59, 48, 0.1);
    border-radius: 50%;
    padding: 12px;
  }
}

.alert-title {
  font-size: 17px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 8px 0;
}

.alert-message {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0 0 20px 0;

  strong {
    color: rgb(var(--v-theme-on-surface));
    font-weight: 600;
  }
}

.alert-actions {
  display: flex;
  gap: 12px;
}

.alert-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &.cancel {
    background: rgba(var(--v-theme-on-surface), 0.08);
    color: rgb(var(--v-theme-on-surface));

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.12);
    }

    &:active {
      background: rgba(var(--v-theme-on-surface), 0.16);
      transform: scale(0.98);
    }
  }

  &.destructive {
    background: #FF3B30;
    color: white;

    &:hover {
      background: #FF453A;
    }

    &:active {
      background: #E63329;
      transform: scale(0.98);
    }
  }
}

// Case Meta - Apple-like
.case-meta {
  padding-top: 4px !important;
  padding-bottom: 14px !important;
}

// Patient Info Row - Apple-like badges
.patient-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.patient-badge {
  display: flex;
  align-items: baseline;
  gap: 3px;
  padding: 4px 10px;
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 8px;

  .patient-age {
    font-size: 1rem;
    font-weight: 700;
    color: rgb(var(--v-theme-primary));
    letter-spacing: -0.02em;
  }

  .patient-age-label {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(var(--v-theme-primary), 0.7);
  }
}

.patient-sex-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;

  &.male {
    background: rgba(10, 132, 255, 0.1);
    color: rgb(10, 132, 255);
  }

  &.female {
    background: rgba(255, 45, 85, 0.1);
    color: rgb(255, 45, 85);
  }
}

.slides-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);

  .v-icon {
    opacity: 0.7;
  }
}

// Processing Status Badge - Apple-like
.processing-status-badge {
  margin-top: 10px;
}

.status-badge-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;

  &.success {
    background: rgba(52, 199, 89, 0.12);
    color: rgb(52, 199, 89);
  }

  &.warning {
    background: rgba(255, 149, 0, 0.12);
    color: rgb(255, 149, 0);
  }

  &.info {
    background: rgba(0, 122, 255, 0.12);
    color: rgb(0, 122, 255);
    animation: pulseStatus 2s ease-in-out infinite;
  }

  &.error {
    background: rgba(255, 59, 48, 0.12);
    color: rgb(255, 59, 48);
  }

  .status-progress {
    padding-left: 4px;
    border-left: 1px solid currentColor;
    opacity: 0.7;
    margin-left: 2px;
  }
}

@keyframes pulseStatus {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

// Case Footer - Apple-like
.case-footer {
  padding: 10px 14px !important;
  min-height: 42px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.case-date {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.4);
  display: flex;
  align-items: center;
}

// Report Button - Apple-like
.report-btn {
  margin-right: 6px;
  border-radius: 6px !important;
  transition: all 0.15s ease;

  &:not(:disabled):hover {
    transform: scale(1.08);
  }

  &:disabled {
    opacity: 0.35;
  }
}

.bg-warning-subtle {
  background: rgba(var(--v-theme-warning), 0.08) !important;
}

// Notifications Dialog - Apple-like
.notification-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);

  span {
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.7);
    letter-spacing: -0.01em;
  }
}

// Invitation List - Apple-like
.invitation-list {
  padding: 12px;
}

.invitation-card {
  padding: 16px;
  margin-bottom: 10px;
  background: rgba(var(--v-theme-warning), 0.05);
  border: 1px solid rgba(var(--v-theme-warning), 0.15);
  border-radius: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.invitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.invitation-case-id {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.01em;
}

.invitation-date {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

// Invitation Details - Apple-like
.invitation-patient,
.invitation-roi,
.invitation-from {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 6px;

  .v-icon {
    opacity: 0.5;
  }
}

.invitation-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);

  .v-btn {
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 8px;
  }
}

.has-new-messages {
  background: rgba(var(--v-theme-secondary), 0.06);
}

// Empty Notifications - Apple-like
.empty-notifications {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  gap: 14px;

  .v-icon {
    opacity: 0.3;
  }

  p {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.4);
    margin: 0;
  }
}

// Profile Dialog
.profile-dialog {
  .profile-avatar-section {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .profile-name-section {
    flex: 1;
  }

  .profile-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    margin: 0 0 4px;
  }

  .profile-email {
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface-variant));
    margin: 0;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .profile-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .profile-label {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface-variant));
  }

  .profile-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
  }

  .avatar-upload-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
  }

  .avatar-upload-wrapper {
    position: relative;
    cursor: pointer;

    &:hover .avatar-overlay {
      opacity: 1;
    }
  }

  .avatar-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .profile-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .editable-field,
  .readonly-field {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    min-height: 44px;
  }

  .editable-field {
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);

      .edit-icon {
        opacity: 1;
      }
    }
  }

  .readonly-field {
    cursor: default;
  }

  .field-icon {
    color: rgb(var(--v-theme-on-surface-variant));
    flex-shrink: 0;
  }

  .field-value {
    flex: 1;
    font-size: 0.9rem;
    color: rgb(var(--v-theme-on-surface));

    &.field-name {
      font-size: 1.1rem;
      font-weight: 600;
      text-align: center;
    }

    &.field-placeholder {
      color: rgb(var(--v-theme-on-surface-variant));
      font-style: italic;
    }

    &.field-muted {
      color: rgb(var(--v-theme-on-surface-variant));
      font-size: 0.8rem;
    }
  }

  .edit-icon {
    color: rgb(var(--v-theme-on-surface-variant));
    opacity: 0;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
  }

  .inline-edit {
    flex: 1;
  }
}

// Invite Collaborator Dialog
.invite-collaborator-dialog {
  .case-info {
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface-variant));
    display: flex;
    align-items: center;
  }

  .search-loading,
  .no-results,
  .search-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 8px;
    color: rgb(var(--v-theme-on-surface-variant));

    p {
      margin: 0;
      font-size: 0.875rem;
    }
  }

  .search-loading {
    flex-direction: row;
  }

  .search-results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 280px;
    overflow-y: auto;
  }

  .user-result {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);

      .add-icon {
        opacity: 1;
      }
    }
  }

  .user-avatar-small {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;

    &.has-image {
      background: transparent;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-initials {
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }
  }

  .user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 0.75rem;
    color: rgb(var(--v-theme-on-surface-variant));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-spec {
    font-size: 0.7rem;
    color: rgb(var(--v-theme-primary));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add-icon {
    opacity: 0.5;
    transition: opacity 0.15s ease;
    flex-shrink: 0;
  }
}

// Responsive
@media (max-width: 600px) {
  .dashboard-header {
    padding: 12px 16px;
  }

  .user-name {
    display: none;
  }

  .dashboard-main {
    padding: 24px 16px;
  }

  .upload-zone {
    padding: 32px 16px;
  }

  .cases-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-actions {
    padding-bottom: 0;
  }

  .inbox-tabs {
    justify-content: center;
  }

  .tab-label {
    display: none;
  }

  .search-field {
    flex: 1;
    width: auto;
  }
}

// Page transition (similar to v-tabs)
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

// New Case Dialog
// New Case Dialog - Apple-like
.new-case-dialog {
  background: rgb(var(--v-theme-surface));
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

.dialog-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.01em;
}

.dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.5);
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.1);
    color: rgb(var(--v-theme-on-surface));
  }
}

.dialog-body {
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-bottom: 12px;
}

.section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 10px;
  text-transform: none;
  letter-spacing: 0;
}

.form-field {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 6px;
}

.field-input,
.field-select {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 10px;
  font-size: 0.9375rem;
  color: rgb(var(--v-theme-on-surface));
  transition: all 0.15s ease;

  &::placeholder {
    color: rgba(var(--v-theme-on-surface), 0.35);
  }

  &:focus {
    outline: none;
    border-color: rgba(var(--v-theme-primary), 0.5);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.1);
  }
}

.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
  cursor: pointer;
}

.form-row-native {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.slides-list-native {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.slide-item-native {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-border-color), 0.08);
  border-radius: 10px;
}

.slide-name-native {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(var(--v-theme-error), 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: rgb(var(--v-theme-error));
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-error), 0.2);
  }
}

.add-slides-native {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  background: transparent;
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.04);
    border-color: rgba(var(--v-theme-primary), 0.5);
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}

.btn-cancel {
  height: 36px;
  padding: 0 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.06);
    color: rgb(var(--v-theme-on-surface));
  }
}

.btn-primary {
  height: 36px;
  padding: 0 20px;
  background: rgb(var(--v-theme-primary));
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(.disabled) {
    filter: brightness(1.05);
  }

  &:active:not(.disabled) {
    transform: scale(0.98);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Processing Dialog
.processing-dialog {
  .processing-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }

  .processing-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .processing-icon-inner {
    position: absolute;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .processing-case-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .processing-case-id {
    font-size: 0.9rem;
    font-weight: 600;
    font-family: monospace;
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.1);
    padding: 4px 10px;
    border-radius: 4px;
  }

  .processing-slides {
    font-size: 0.8rem;
    color: rgb(var(--v-theme-on-surface-variant));
  }

  .processing-step-label {
    font-size: 0.95rem;
    font-weight: 500;
    color: rgb(var(--v-theme-on-surface));
    margin: 0;
    min-height: 24px;
  }

  .processing-steps {
    display: flex;
    gap: 8px;
  }

  .processing-step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(var(--v-theme-on-surface), 0.2);
    transition: all 0.3s ease;

    &.active {
      background: rgb(var(--v-theme-primary));
      transform: scale(1.3);
    }

    &.completed {
      background: rgb(var(--v-theme-primary));
    }
  }

  .processing-skeleton {
    width: 100%;
    margin-top: 8px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(var(--v-theme-on-surface), 0.03);
    padding: 12px;
  }

  .skeleton-tiles {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    justify-content: center;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// Upload Dialog (Enhanced UX for large files)
// Upload Dialog - Apple-like
.upload-dialog {
  border-radius: 16px !important;

  .upload-dialog-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .upload-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .upload-icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
  }

  .upload-icon-bg {
    position: absolute;
    animation: pulse 2s ease-in-out infinite;
  }

  .upload-circular {
    position: absolute;
  }

  .upload-percent {
    font-size: 2.25rem;
    font-weight: 700;
    color: rgb(var(--v-theme-primary));
    font-family: 'SF Mono', 'Roboto Mono', monospace;
    letter-spacing: -0.02em;
  }

  .upload-file-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  .upload-file-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .upload-file-counter {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.5);
  }

  .upload-progress-section {
    width: 100%;
    padding: 0 8px;
  }

  .upload-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    padding: 16px 12px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    border-radius: 14px;
  }

  .upload-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    padding: 10px 4px;
    border-radius: 10px;
    transition: background 0.15s;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);
    }
  }

  .stat-icon {
    opacity: 0.7;
  }

  .stat-label {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(var(--v-theme-on-surface), 0.4);
    white-space: nowrap;
  }

  .stat-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
    font-family: 'SF Mono', 'Roboto Mono', monospace;
    white-space: nowrap;
  }

  .upload-case-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
    color: rgb(var(--v-theme-primary));
    font-weight: 500;
    padding: 8px 16px;
    background: rgba(var(--v-theme-primary), 0.08);
    border-radius: 20px;
  }

  .upload-tip {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.6);
    text-align: left;
    line-height: 1.5;
    padding: 12px 16px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    border-radius: 10px;

    .v-icon {
      flex-shrink: 0;
    }
  }
}
</style>

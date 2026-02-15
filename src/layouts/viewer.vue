<template>
  <v-app>
    <!-- Mobile Header Bar -->
    <div v-if="mobile && !focusMode" class="mobile-header-bar">
      <!-- Back to Dashboard Button -->
      <v-btn
        class="back-btn-mobile"
        icon
        size="small"
        variant="text"
        @click="goToDashboard"
      >
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>

      <!-- Case Menu (with status and location) -->
      <v-menu :close-on-content-click="false" location="bottom" offset="4">
        <template #activator="{ props }">
          <div v-bind="props" class="mobile-case-selector">
            <v-icon class="mr-2" size="20">mdi-folder-open</v-icon>
            <div class="mobile-case-info">
              <span class="mobile-case-name">{{ viewerControls.state.value.caseName || 'Nenhum caso' }}</span>
              <span class="mobile-slide-name">{{ currentSlideName }}</span>
            </div>
            <v-icon size="18">mdi-chevron-down</v-icon>
          </div>
        </template>

        <div class="mobile-case-dropdown">
          <!-- Slides Section -->
          <div class="dropdown-header">
            <span class="dropdown-title">Lâminas</span>
            <v-chip color="secondary" size="x-small" variant="tonal">{{ caseSlides.length }}</v-chip>
          </div>
          <div class="mobile-slides-scroll">
            <div
              v-for="(slide, index) in caseSlides"
              :key="slide.id"
              class="slide-item"
              :class="{ 'slide-item--active': slide.id === activeSlideId }"
              @click="selectSlide(slide)"
            >
              <v-icon
                class="slide-icon"
                :color="slide.id === activeSlideId ? 'primary' : undefined"
                size="18"
              >
                {{ slide.id === activeSlideId ? 'mdi-checkbox-marked-circle' : 'mdi-image-outline' }}
              </v-icon>
              <div class="slide-info">
                <div class="slide-label-row">
                  <span class="slide-item-name">Lâmina {{ index + 1 }}</span>
                  <v-chip class="slide-stain-chip" size="x-small" variant="text">{{ slide.stain }}</v-chip>
                </div>
                <span class="slide-id-text">{{ slide.name }}</span>
              </div>
              <v-icon v-if="slide.id === activeSlideId" class="check-icon" color="primary" size="16">mdi-check</v-icon>
            </div>
          </div>

          <v-divider class="my-1" />

          <!-- Location Section -->
          <div class="dropdown-header">
            <span class="dropdown-title">Localização</span>
            <v-chip :color="caseLocationColor" size="x-small" variant="tonal">{{ caseLocationLabel }}</v-chip>
          </div>
          <div
            class="case-action-item"
            :class="{ 'case-action-item--active': caseLocation === 'inbox' }"
            @click="caseLocation !== 'inbox' && moveCaseTo('inbox')"
          >
            <v-icon :color="caseLocation === 'inbox' ? 'primary' : undefined" size="18">mdi-inbox</v-icon>
            <span>Caixa de Entrada</span>
            <v-icon v-if="caseLocation === 'inbox'" class="ml-auto" color="primary" size="14">mdi-check</v-icon>
          </div>
          <div
            class="case-action-item"
            :class="{ 'case-action-item--active': caseLocation === 'archived' }"
            @click="caseLocation !== 'archived' && moveCaseTo('archived')"
          >
            <v-icon :color="caseLocation === 'archived' ? 'secondary' : undefined" size="18">mdi-archive</v-icon>
            <span>Arquivados</span>
            <v-icon v-if="caseLocation === 'archived'" class="ml-auto" color="secondary" size="14">mdi-check</v-icon>
          </div>
          <div
            class="case-action-item"
            :class="{
              'case-action-item--active': caseLocation === 'trash',
              'case-action-item--danger': caseLocation !== 'trash'
            }"
            @click="caseLocation !== 'trash' ? showTrashConfirm = true : null"
          >
            <v-icon :color="caseLocation === 'trash' ? 'error' : undefined" size="18">mdi-trash-can</v-icon>
            <span>Lixeira</span>
            <v-icon v-if="caseLocation === 'trash'" class="ml-auto" color="error" size="14">mdi-check</v-icon>
          </div>
        </div>
      </v-menu>

    </div>

    <!-- Right Panel (Desktop) - hidden in read-only mode -->
    <v-navigation-drawer
      v-if="!mobile && !isReadOnly.value"
      v-model="rightPanel"
      class="right-panel"
      :class="{ 'is-resizing': isResizingPanel }"
      location="right"
      :width="rightPanelWidth"
    >
      <!-- Resize Handle -->
      <div class="panel-resize-handle" @mousedown="startPanelResize">
        <div class="resize-handle-indicator" />
      </div>

      <div class="panel-tabs-row">
        <v-tabs v-model="activeTab" class="panel-tabs-grow" color="primary" height="56" show-arrows>
          <v-tab prepend-icon="mdi-information" value="info">
            <span class="tab-label">Info</span>
          </v-tab>
          <v-tab prepend-icon="mdi-map-marker" value="annotations">
            <span class="tab-label">Notas</span>
          </v-tab>
          <v-tab prepend-icon="mdi-robot" value="ai">
            <span class="tab-label">IA</span>
          </v-tab>
        </v-tabs>
        <v-btn
          class="panel-close-btn"
          icon
          size="x-small"
          variant="text"
          @click="rightPanel = false"
        >
          <v-icon size="18">mdi-chevron-right</v-icon>
          <v-tooltip activator="parent" location="bottom">Fechar Painel</v-tooltip>
        </v-btn>
      </div>
      <v-tabs-window v-model="activeTab">
        <!-- Annotations Section -->
        <v-tabs-window-item value="annotations">
          <!-- Lista de Notas (quando nenhuma selecionada) -->
          <div v-if="!selectedAnnotation" class="annotations-panel">
            <!-- Header -->
            <div class="panel-section-header">
              <div class="d-flex align-center justify-space-between px-4 py-3">
                <div class="d-flex align-center ga-2">
                  <v-icon color="primary" size="20">mdi-map-marker-multiple</v-icon>
                  <span class="text-subtitle-2 font-weight-medium">Regiões de Interesse</span>
                </div>
                <v-tooltip location="bottom" text="Mostrar/ocultar marcações">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      :color="viewerControls.state.value.showMarkers ? 'primary' : 'default'"
                      :icon="viewerControls.state.value.showMarkers ? 'mdi-eye' : 'mdi-eye-off'"
                      size="small"
                      variant="text"
                      @click="viewerControls.state.value.showMarkers = !viewerControls.state.value.showMarkers"
                    />
                  </template>
                </v-tooltip>
              </div>
            </div>

            <!-- Annotations List -->
            <div class="annotations-scroll">
              <div v-if="annotations.length > 0" class="annotations-list pa-3">
                <div
                  v-for="annotation in annotations"
                  :key="annotation.id"
                  class="roi-card"
                  :class="{
                    'has-unread': annotation.unreadCount > 0,
                    'is-resolved': annotation.status === 'resolved'
                  }"
                  @click="selectAnnotation(annotation)"
                >
                  <!-- ROI Preview & Color -->
                  <div class="roi-color-indicator" :style="{ backgroundColor: annotation.color }" />

                  <div class="roi-content">
                    <!-- Header Row -->
                    <div class="d-flex align-center justify-space-between mb-1">
                      <div class="d-flex align-center ga-2">
                        <v-icon :color="annotation.color" size="16">
                          {{ annotation.type === 'rectangle' ? 'mdi-vector-square' : annotation.type === 'arrow' ?
                            'mdi-arrow-top-right' : 'mdi-draw' }}
                        </v-icon>
                        <span class="roi-name">{{ annotation.name }}</span>
                      </div>
                      <div class="d-flex align-center ga-1">
                        <v-chip
                          class="priority-chip"
                          :color="getPriorityColor(annotation.priority)"
                          size="x-small"
                          variant="flat"
                        >
                          {{ annotation.priority === 'urgent' ? '!' : annotation.priority === 'high' ? '!!' : '' }}
                        </v-chip>
                        <v-badge
                          v-if="annotation.unreadCount > 0"
                          class="unread-badge"
                          color="error"
                          :content="annotation.unreadCount"
                        />
                      </div>
                    </div>

                    <!-- Status & Participants -->
                    <div class="d-flex align-center justify-space-between">
                      <v-chip
                        :color="annotation.status === 'resolved' ? 'success' :
                          annotation.status === 'pending-review' ? 'warning' : 'info'"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ getStatusLabel(annotation.status) }}
                      </v-chip>

                      <!-- Participants Avatars -->
                      <div class="participants-avatars">
                        <v-avatar
                          v-for="(participant, idx) in annotation.participants.slice(0, 3)"
                          :key="participant.id"
                          class="participant-avatar"
                          :color="participant.role === 'ai' ? 'secondary' : 'primary'"
                          size="22"
                          :style="{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: 3 - idx }"
                        >
                          <v-icon v-if="participant.role === 'ai'" size="14">mdi-robot</v-icon>
                          <span v-else class="text-caption font-weight-bold">{{ participant.name.charAt(0) }}</span>
                        </v-avatar>
                        <v-avatar
                          v-if="annotation.participants.length > 3"
                          class="participant-avatar"
                          color="grey-darken-1"
                          size="22"
                          style="margin-left: -8px"
                        >
                          <span class="text-caption">+{{ annotation.participants.length - 3 }}</span>
                        </v-avatar>
                      </div>
                    </div>

                    <!-- Last Message Preview -->
                    <div v-if="getLastMessage(annotation)" class="last-message mt-2">
                      <div class="d-flex align-center ga-1 text-caption text-medium-emphasis">
                        <v-icon size="12">{{ getLastMessage(annotation)?.authorId ===
                          'ai-pathologist' ? 'mdi-robot' : 'mdi-account' }}</v-icon>
                        <span class="message-preview">
                          {{ getLastMessage(annotation)?.content.substring(0, 50) }}{{
                            (getLastMessage(annotation)?.content.length ?? 0) > 50 ? '...' : '' }}
                        </span>
                      </div>
                      <span class="message-time">{{ formatDate(annotation.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state-container">
                <div class="empty-state-content">
                  <div class="empty-icon-wrapper">
                    <v-icon class="empty-icon" color="primary" size="48">mdi-selection-marker</v-icon>
                  </div>
                  <h3 class="text-subtitle-1 font-weight-medium mb-1">Nenhuma região marcada</h3>
                  <p class="text-caption text-medium-emphasis text-center mb-4">
                    Selecione uma área de interesse na lâmina para iniciar uma discussão colaborativa
                  </p>
                  <v-btn color="primary" prepend-icon="mdi-plus" variant="tonal">
                    Criar ROI
                  </v-btn>
                </div>
              </div>
            </div>
          </div>

          <!-- Discussion View (quando uma anotação está selecionada) -->
          <div v-else class="discussion-panel">
            <!-- Discussion Header -->
            <div class="discussion-header">
              <div class="d-flex align-center ga-2 px-3 py-2">
                <v-btn icon size="small" variant="text" @click="closeDiscussion">
                  <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <div class="roi-indicator" :style="{ backgroundColor: selectedAnnotation.color }" />
                <div class="flex-grow-1">
                  <v-text-field
                    v-if="isEditingAnnotationName"
                    v-model="editingAnnotationName"
                    autofocus
                    class="annotation-name-input"
                    density="compact"
                    hide-details
                    variant="plain"
                    @blur="saveAnnotationName"
                    @keyup.enter="saveAnnotationName"
                    @keyup.escape="cancelEditAnnotationName"
                  />
                  <div
                    v-else
                    class="text-subtitle-2 font-weight-medium editable-name"
                    @click="startEditAnnotationName"
                  >
                    {{ selectedAnnotation.name }}
                    <v-icon class="edit-icon" size="14">mdi-pencil</v-icon>
                  </div>
                  <div class="d-flex align-center ga-2">
                    <div class="text-caption text-medium-emphasis">
                      {{ selectedAnnotation.participants.length }} participantes
                    </div>
                    <v-chip
                      v-if="selectedAnnotation.status === 'resolved'"
                      color="success"
                      prepend-icon="mdi-check-circle"
                      size="x-small"
                      variant="tonal"
                    >
                      Resolvido
                    </v-chip>
                  </div>
                </div>
                <v-menu location="bottom end" offset="6" transition="scale-transition">
                  <template #activator="{ props }">
                    <v-btn icon size="small" variant="text" v-bind="props">
                      <v-icon>mdi-dots-horizontal</v-icon>
                    </v-btn>
                  </template>
                  <v-list class="apple-context-menu" density="compact">
                    <v-list-item
                      prepend-icon="mdi-crosshairs-gps"
                      @click="focusAnnotation(selectedAnnotation.id)"
                    >
                      <v-list-item-title>Ir para região</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      prepend-icon="mdi-account-plus-outline"
                      @click="openInviteDialog"
                    >
                      <v-list-item-title>Convidar patologista</v-list-item-title>
                    </v-list-item>
                    <v-list-item
                      :prepend-icon="selectedAnnotation.status === 'resolved' ? 'mdi-arrow-u-left-top' : 'mdi-check-circle-outline'"
                      @click="toggleAnnotationResolved"
                    >
                      <v-list-item-title>{{ selectedAnnotation.status === 'resolved' ? 'Reabrir discussão' : 'Marcar como resolvido' }}</v-list-item-title>
                    </v-list-item>
                    <div class="apple-menu-divider" />
                    <v-list-item
                      class="apple-menu-destructive"
                      prepend-icon="mdi-trash-can-outline"
                      @click="deleteSelectedROI"
                    >
                      <v-list-item-title>Excluir ROI</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>

              <!-- Participants Bar -->
              <div class="participants-bar px-3 pb-2">
                <div class="d-flex align-center ga-1 flex-wrap">
                  <v-chip
                    v-for="participant in selectedAnnotation.participants"
                    :key="participant.id"
                    class="participant-chip"
                    :color="participant.role === 'ai' ? 'secondary' : participant.role === 'owner' ? 'primary' : 'default'"
                    size="small"
                    :variant="participant.isOnline ? 'flat' : 'outlined'"
                  >
                    <template #prepend>
                      <v-icon v-if="participant.role === 'ai'" size="14">mdi-robot</v-icon>
                      <v-badge v-else :color="participant.isOnline ? 'success' : 'grey'" dot inline>
                        <v-icon size="14">mdi-account</v-icon>
                      </v-badge>
                    </template>
                    {{ participant.name.split(' ')[0] }}
                  </v-chip>
                </div>
              </div>
            </div>

            <!-- Messages Thread -->
            <div class="messages-container">
              <div class="messages-scroll">
                <div
                  v-for="message in selectedAnnotation.messages"
                  :key="message.id"
                  class="message-item"
                  :class="{ 'message-own': message.authorId === currentUser.id }"
                >
                  <!-- System Message -->
                  <div v-if="message.type === 'system'" class="system-message">
                    <v-icon class="mr-1" size="14">mdi-information</v-icon>
                    {{ message.content }}
                  </div>

                  <!-- Regular Message -->
                  <template v-else>
                    <!-- Avatar -->
                    <v-avatar
                      class="message-avatar"
                      color="primary"
                      size="36"
                    >
                      <img
                        v-if="getParticipant(message.authorId)?.avatar"
                        :alt="getParticipant(message.authorId)?.name"
                        referrerpolicy="no-referrer"
                        :src="getParticipant(message.authorId)?.avatar"
                        style="width: 100%; height: 100%; object-fit: cover;"
                      >
                      <span v-else class="avatar-letter">{{ getParticipant(message.authorId)?.name.charAt(0) }}</span>
                    </v-avatar>

                    <!-- Message Content -->
                    <div class="message-body">
                      <!-- Header: Name + DateTime -->
                      <div class="message-header">
                        <span class="message-author-name">Dr. {{ getParticipant(message.authorId)?.name }}</span>
                        <span class="message-datetime">{{ formatMessageDateTime(message.timestamp) }}</span>
                      </div>

                      <!-- Content -->
                      <div
                        v-if="editingMessageId !== message.id"
                        class="message-text"
                      >
                        {{ message.content }}
                      </div>

                      <!-- Edit Mode -->
                      <div v-else class="message-edit-container">
                        <v-textarea
                          v-model="editingMessageContent"
                          auto-grow
                          autofocus
                          class="message-edit-input"
                          density="compact"
                          hide-details
                          rows="2"
                          variant="outlined"
                          @keydown.enter.exact.prevent="saveMessageEdit(message)"
                          @keydown.escape="cancelMessageEdit"
                        />
                        <div class="message-edit-actions">
                          <v-btn
                            color="primary"
                            size="small"
                            variant="flat"
                            @click="saveMessageEdit(message)"
                          >
                            Salvar
                          </v-btn>
                          <v-btn
                            size="small"
                            variant="text"
                            @click="cancelMessageEdit"
                          >
                            Cancelar
                          </v-btn>
                        </div>
                      </div>

                      <!-- Edited indicator -->
                      <span v-if="message.editedAt" class="message-edited-badge">
                        (editado)
                      </span>
                    </div>

                    <!-- Actions Menu (only for own messages) -->
                    <div v-if="message.authorId === currentUser.id && editingMessageId !== message.id" class="message-actions">
                      <v-menu location="bottom end" offset="6" transition="scale-transition">
                        <template #activator="{ props }">
                          <v-btn
                            v-bind="props"
                            class="message-menu-btn"
                            icon
                            size="x-small"
                            variant="text"
                          >
                            <v-icon size="16">mdi-dots-horizontal</v-icon>
                          </v-btn>
                        </template>
                        <v-list class="apple-context-menu" density="compact">
                          <v-list-item
                            prepend-icon="mdi-pencil-outline"
                            @click="startMessageEdit(message)"
                          >
                            <v-list-item-title>Editar</v-list-item-title>
                          </v-list-item>
                          <div class="apple-menu-divider" />
                          <v-list-item
                            class="apple-menu-destructive"
                            prepend-icon="mdi-trash-can-outline"
                            @click="confirmDeleteMessage(message)"
                          >
                            <v-list-item-title>Remover</v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </div>
                  </template>
                </div>

                <!-- Loading state -->
                <div v-if="isLoadingMessages" class="messages-empty">
                  <v-progress-circular color="primary" indeterminate size="32" />
                  <p class="text-caption text-medium-emphasis mt-2">Carregando mensagens...</p>
                </div>

                <!-- Empty state -->
                <div v-else-if="selectedAnnotation.messages.length === 0" class="messages-empty">
                  <v-icon color="grey-lighten-1" size="40">mdi-message-text-outline</v-icon>
                  <p class="text-caption text-medium-emphasis mt-2">Nenhuma mensagem ainda</p>
                  <p class="text-caption text-medium-emphasis">Inicie a discussão sobre esta região</p>
                </div>
              </div>
            </div>

            <!-- Delete Message Confirmation Dialog -->
            <v-dialog v-model="showDeleteMessageDialog" max-width="360">
              <v-card class="delete-message-dialog">
                <v-card-title class="text-h6">Remover mensagem?</v-card-title>
                <v-card-text class="text-body-2 text-medium-emphasis">
                  Esta ação não pode ser desfeita.
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn variant="text" @click="showDeleteMessageDialog = false">Cancelar</v-btn>
                  <v-btn color="error" variant="flat" @click="deleteMessage">Remover</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

            <!-- Message Input -->
            <div class="ai-chat-input-container">
              <v-textarea
                v-model="newMessage"
                auto-grow
                class="ai-chat-input"
                density="compact"
                hide-details
                max-rows="4"
                placeholder="Digite sua observação..."
                rows="1"
                variant="outlined"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <v-btn
                class="ai-send-btn"
                color="primary"
                :disabled="!newMessage.trim()"
                icon
                :loading="isSendingMessage"
                @click="sendMessage"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </div>
          </div>
        </v-tabs-window-item>

        <!-- AI Case Discussion Section -->
        <v-tabs-window-item value="ai">
          <div class="ai-coming-soon">
            <v-icon color="secondary" size="64">mdi-robot-outline</v-icon>
            <h3 class="text-h6 font-weight-medium mt-4 mb-2">Assistente de IA</h3>
            <p class="text-body-2 text-medium-emphasis text-center" style="max-width: 280px;">
              Em breve você poderá conversar com a IA para auxiliar na análise das lâminas.
            </p>
            <v-chip class="mt-4" color="secondary" variant="tonal">
              Em breve
            </v-chip>
          </div>
        </v-tabs-window-item>

        <!-- Info Section -->
        <v-tabs-window-item value="info">
          <div class="info-panel">
            <!-- User -->
            <div class="info-user-card">
              <v-avatar :color="authStore.user?.avatar ? undefined : 'primary'" size="36">
                <v-img v-if="authStore.user?.avatar" cover :src="authStore.user.avatar" />
                <span v-else class="text-caption font-weight-bold">{{ authStore.userInitials }}</span>
              </v-avatar>
              <div class="info-user-text">
                <span class="info-user-name">{{ authStore.userName }}</span>
                <span class="info-user-role">{{ authStore.user?.specialization || 'Patologista' }}</span>
              </div>
            </div>

            <v-divider />

            <!-- Caso -->
            <div class="info-section">
              <div class="info-section-header">
                <v-icon color="primary" size="18">mdi-folder-open</v-icon>
                <span class="info-section-title">Caso</span>
              </div>
              <div class="info-case-name">{{ viewerControls.state.value.caseName || 'Nenhum caso' }}</div>

              <!-- Patient Data (from PathoWeb) -->
              <div v-if="patientData" class="info-patient-data mt-2">
                <div v-if="patientData.patientName" class="info-patient-row">
                  <span class="info-patient-label">Paciente</span>
                  <span class="info-patient-value">{{ patientData.patientName }}</span>
                </div>
                <div v-if="patientData.patientId" class="info-patient-row">
                  <span class="info-patient-label">ID</span>
                  <span class="info-patient-value">{{ patientData.patientId }}</span>
                </div>
                <div v-if="patientData.age" class="info-patient-row">
                  <span class="info-patient-label">Idade</span>
                  <span class="info-patient-value">{{ patientData.age }} anos</span>
                </div>
                <div v-if="patientData.doctor" class="info-patient-row">
                  <span class="info-patient-label">Solicitante</span>
                  <span class="info-patient-value">{{ patientData.doctor }}</span>
                </div>
              </div>

              <!-- Mini Access Log -->
              <div v-if="accessLog.length > 0" class="info-access-log mt-3">
                <div v-for="entry in accessLog" :key="entry.id" class="info-log-entry">
                  <v-avatar :color="entry.avatar ? undefined : 'grey'" size="20">
                    <v-img v-if="entry.avatar" cover :src="entry.avatar" />
                    <span v-else style="font-size: 9px; font-weight: 700;">{{ entry.initials }}</span>
                  </v-avatar>
                  <span class="info-log-text">{{ entry.name }}</span>
                  <span class="info-log-time">{{ entry.time }}</span>
                </div>
              </div>
            </div>

            <v-divider />

            <!-- Lâmina atual -->
            <div class="info-section">
              <div class="info-section-header">
                <v-icon color="primary" size="18">mdi-microscope</v-icon>
                <span class="info-section-title">Lâmina</span>
              </div>

              <!-- Combobox para trocar lâmina -->
              <v-select
                v-if="caseSlides.length > 1"
                class="info-slide-select mb-3"
                density="compact"
                hide-details
                :item-title="slideSelectTitle"
                item-value="id"
                :items="caseSlides"
                :model-value="activeSlideId"
                variant="outlined"
                @update:model-value="onSlideSelectChange"
              >
                <template #prepend-inner>
                  <v-icon color="primary" size="18">mdi-image-outline</v-icon>
                </template>
              </v-select>

              <!-- Label da lâmina quando só tem uma -->
              <div v-else class="info-slide-single mb-3">
                <v-icon color="primary" size="16">mdi-image-outline</v-icon>
                <span>{{ currentSlideLabel }}</span>
              </div>

              <!-- Slide Details -->
              <div class="details-card">
                <template v-for="(detail, index) in slideDetails" :key="detail.label">
                  <div class="detail-item">
                    <div class="detail-row">
                      <span class="detail-label text-caption text-medium-emphasis">{{ detail.label }}</span>
                      <span class="detail-value text-body-2 font-weight-medium">{{ detail.value }}</span>
                    </div>
                  </div>
                  <v-divider v-if="index < slideDetails.length - 1" />
                </template>
              </div>
            </div>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>

    </v-navigation-drawer>

    <!-- Mobile Bottom Sheet Panel -->
    <v-bottom-sheet v-if="mobile" v-model="mobilePanel" class="mobile-panel-sheet" inset>
      <v-card class="mobile-panel-card">
        <!-- Sheet Handle -->
        <div class="sheet-handle">
          <div class="handle-bar" />
        </div>

        <!-- Mobile Tabs -->
        <v-tabs
          v-model="activeTab"
          color="primary"
          density="compact"
          grow
          height="48"
        >
          <v-tab value="info">
            <v-icon size="20">mdi-information</v-icon>
            <span class="ml-1 text-caption">Info</span>
          </v-tab>
          <v-tab value="annotations">
            <v-icon size="20">mdi-map-marker</v-icon>
            <span class="ml-1 text-caption">Notas</span>
          </v-tab>
          <v-tab value="ai">
            <v-icon size="20">mdi-robot</v-icon>
            <span class="ml-1 text-caption">IA</span>
          </v-tab>
        </v-tabs>

        <v-divider />

        <!-- Mobile Panel Content -->
        <div class="mobile-panel-content">
          <v-tabs-window v-model="activeTab">
            <!-- Mobile Annotations -->
            <v-tabs-window-item value="annotations">
              <div v-if="!selectedAnnotation" class="mobile-annotations-list">
                <div v-if="annotations.length > 0" class="pa-3">
                  <div
                    v-for="annotation in annotations"
                    :key="annotation.id"
                    class="mobile-roi-card"
                    @click="selectAnnotation(annotation)"
                  >
                    <div class="roi-color-dot" :style="{ backgroundColor: annotation.color }" />
                    <div class="roi-info">
                      <span class="roi-name">{{ annotation.name }}</span>
                      <span class="roi-status">{{ getStatusLabel(annotation.status) }}</span>
                    </div>
                    <v-badge v-if="annotation.unreadCount > 0" color="error" :content="annotation.unreadCount" inline />
                    <v-icon size="16">mdi-chevron-right</v-icon>
                  </div>
                </div>
                <div v-else class="mobile-empty-state">
                  <v-icon color="primary" size="40">mdi-selection-marker</v-icon>
                  <p class="text-caption text-medium-emphasis mt-2">Nenhuma região marcada</p>
                </div>
              </div>
              <div v-else class="mobile-discussion">
                <div class="mobile-discussion-header">
                  <v-btn icon size="small" variant="text" @click="closeDiscussion">
                    <v-icon>mdi-arrow-left</v-icon>
                  </v-btn>
                  <div class="roi-color-dot" :style="{ backgroundColor: selectedAnnotation.color }" />
                  <div class="mobile-roi-name-container">
                    <v-text-field
                      v-if="isEditingAnnotationName"
                      v-model="editingAnnotationName"
                      autofocus
                      class="mobile-roi-name-input"
                      density="compact"
                      hide-details
                      variant="plain"
                      @blur="saveAnnotationName"
                      @keyup.enter="saveAnnotationName"
                      @keyup.escape="cancelEditAnnotationName"
                    />
                    <div
                      v-else
                      class="mobile-roi-name-editable"
                      @click="startEditAnnotationName"
                    >
                      <span class="font-weight-medium">{{ selectedAnnotation.name }}</span>
                      <v-icon class="ml-1" size="14">mdi-pencil</v-icon>
                    </div>
                  </div>
                  <!-- Mobile ROI Action Buttons -->
                  <div class="mobile-roi-actions">
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="focusAnnotation(selectedAnnotation.id); mobilePanel = false"
                    >
                      <v-icon size="18">mdi-crosshairs-gps</v-icon>
                      <v-tooltip activator="parent" location="bottom">Ir para região</v-tooltip>
                    </v-btn>
                    <v-btn
                      color="error"
                      icon
                      size="small"
                      variant="text"
                      @click="deleteSelectedROI"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="bottom">Excluir ROI</v-tooltip>
                    </v-btn>
                  </div>
                </div>
                <div class="mobile-messages">
                  <div v-if="isLoadingMessages" class="mobile-messages-loading">
                    <v-progress-circular color="primary" indeterminate size="24" />
                  </div>
                  <template v-else>
                    <div
                      v-for="message in selectedAnnotation.messages.slice(-5)"
                      :key="message.id"
                      class="mobile-message"
                      :class="{ 'own': message.authorId === currentUser.id, 'ai': message.authorId === 'ai-pathologist' }"
                    >
                      <div v-if="message.authorId !== currentUser.id" class="mobile-message-author">
                        <v-avatar
                          :color="message.authorId === 'ai-pathologist' ? 'secondary' : 'primary'"
                          size="20"
                        >
                          <v-icon v-if="message.authorId === 'ai-pathologist'" size="12">mdi-robot</v-icon>
                          <span v-else class="text-caption">{{ getParticipant(message.authorId)?.name.charAt(0) }}</span>
                        </v-avatar>
                        <span class="mobile-author-name">Dr. {{ getParticipant(message.authorId)?.name.split(' ')[0] }}</span>
                      </div>
                      <span class="message-text">{{ message.content }}</span>
                    </div>
                  </template>
                </div>
                <div class="mobile-input-row">
                  <v-text-field
                    v-model="newMessage"
                    class="mobile-message-input"
                    density="compact"
                    hide-details
                    placeholder="Mensagem..."
                    variant="outlined"
                    @keydown.enter="sendMessage"
                  />
                  <v-btn color="primary" icon size="small" @click="sendMessage">
                    <v-icon size="18">mdi-send</v-icon>
                  </v-btn>
                </div>
              </div>
            </v-tabs-window-item>

            <!-- Mobile AI Chat -->
            <v-tabs-window-item value="ai">
              <div class="mobile-ai-coming-soon">
                <v-icon color="secondary" size="40">mdi-robot-outline</v-icon>
                <p class="text-caption text-medium-emphasis mt-2">Assistente de IA</p>
                <v-chip class="mt-2" color="secondary" size="small" variant="tonal">
                  Em breve
                </v-chip>
              </div>
            </v-tabs-window-item>

            <!-- Mobile Info -->
            <v-tabs-window-item value="info">
              <div class="mobile-details pa-3">
                <div class="info-case-name mb-3">{{ viewerControls.state.value.caseName || 'Nenhum caso' }}</div>

                <!-- Slide switcher -->
                <v-select
                  v-if="caseSlides.length > 1"
                  class="info-slide-select mb-3"
                  density="compact"
                  hide-details
                  :item-title="slideSelectTitle"
                  item-value="id"
                  :items="caseSlides"
                  :model-value="activeSlideId"
                  variant="outlined"
                  @update:model-value="onSlideSelectChange"
                >
                  <template #prepend-inner>
                    <v-icon color="primary" size="18">mdi-image-outline</v-icon>
                  </template>
                </v-select>

                <div v-for="detail in slideDetails.slice(0, 6)" :key="detail.label" class="mobile-detail-item">
                  <span class="detail-label">{{ detail.label }}</span>
                  <span class="detail-value">{{ detail.value }}</span>
                </div>
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </div>
      </v-card>
    </v-bottom-sheet>

    <!-- Mobile Bottom Navigation -->
    <v-bottom-navigation v-if="mobile && !focusMode" v-model="mobileNavTab" class="mobile-bottom-nav" grow>
      <v-btn value="theme" @click="toggleTheme">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        <span>{{ isDark ? 'Claro' : 'Escuro' }}</span>
      </v-btn>
      <v-btn value="tools" @click="mobileToolsMenu = true">
        <v-icon>mdi-tools</v-icon>
        <span>Ferramentas</span>
      </v-btn>
      <v-btn value="panel" @click="mobilePanel = true">
        <v-badge v-if="totalUnread > 0" color="error" :content="totalUnread" floating>
          <v-icon>mdi-message-text</v-icon>
        </v-badge>
        <v-icon v-else>mdi-message-text</v-icon>
        <span>Painel</span>
      </v-btn>
      <v-btn value="focus" @click="toggleFocusMode">
        <v-icon>mdi-eye</v-icon>
        <span>Foco</span>
      </v-btn>
    </v-bottom-navigation>

    <!-- Mobile Tools Menu -->
    <v-bottom-sheet v-if="mobile" v-model="mobileToolsMenu" inset>
      <v-card>
        <v-card-title class="text-subtitle-2">Ferramentas</v-card-title>
        <v-divider />
        <div class="mobile-tools-grid pa-4">
          <v-btn
            :color="activeTool === 'pan' ? 'primary' : 'default'"
            stacked
            variant="tonal"
            @click="selectTool('pan'); mobileToolsMenu = false"
          >
            <v-icon>mdi-hand-back-right</v-icon>
            <span class="text-caption">Navegar</span>
          </v-btn>
          <v-btn
            stacked
            variant="tonal"
            @click="viewerControls.zoomIn()"
          >
            <v-icon>mdi-plus</v-icon>
            <span class="text-caption">Zoom +</span>
          </v-btn>
          <v-btn
            stacked
            variant="tonal"
            @click="viewerControls.zoomOut()"
          >
            <v-icon>mdi-minus</v-icon>
            <span class="text-caption">Zoom -</span>
          </v-btn>
          <v-btn
            stacked
            variant="tonal"
            @click="viewerControls.resetView()"
          >
            <v-icon>mdi-fit-to-screen</v-icon>
            <span class="text-caption">Ajustar</span>
          </v-btn>
          <template v-if="!isReadOnly.value">
            <v-btn
              :color="activeTool === 'roi-rect' ? 'primary' : 'default'"
              stacked
              variant="tonal"
              @click="selectTool('roi-rect'); mobileToolsMenu = false"
            >
              <v-icon>mdi-vector-square</v-icon>
              <span class="text-caption">Retângulo</span>
            </v-btn>
            <v-btn
              :color="activeTool === 'roi-arrow' ? 'primary' : 'default'"
              stacked
              variant="tonal"
              @click="selectTool('roi-arrow'); mobileToolsMenu = false"
            >
              <v-icon>mdi-arrow-top-right</v-icon>
              <span class="text-caption">Seta</span>
            </v-btn>
            <v-btn
              :color="activeTool === 'measure' ? 'primary' : 'default'"
              stacked
              variant="tonal"
              @click="selectTool('measure'); mobileToolsMenu = false"
            >
              <v-icon>mdi-ruler</v-icon>
              <span class="text-caption">Medir</span>
            </v-btn>
          </template>
          <v-btn
            stacked
            variant="tonal"
            @click="toggleTheme()"
          >
            <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            <span class="text-caption">Tema</span>
          </v-btn>
        </div>
      </v-card>
    </v-bottom-sheet>

    <!-- Main Viewer Area -->
    <v-main class="viewer-main" :class="{ 'viewer-main-mobile': mobile }">
      <!-- Studio-Grade Floating Toolbar (Desktop Only) -->
      <div
        v-if="!mobile"
        v-show="showToolbar"
        class="studio-toolbar"
        :class="{ 'toolbar-hidden': !showToolbar }"
      >
        <div class="studio-toolbar-content">
          <!-- Back to Dashboard Button -->
          <div class="tool-item">
            <button class="studio-btn studio-btn-back" @click="goToDashboard">
              <div class="btn-glow" />
              <v-icon class="btn-icon">mdi-arrow-left</v-icon>
              <div class="btn-tooltip">Voltar ao Dashboard</div>
            </button>
          </div>

          <div class="tool-separator" />

          <!-- Theme Toggle Button -->
          <div class="tool-item">
            <button class="studio-btn" @click="toggleTheme">
              <div class="btn-glow" />
              <v-icon class="btn-icon">{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
              <div class="btn-tooltip">{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</div>
            </button>
          </div>

          <div class="tool-separator" />

          <!-- Tool Button: Navigate -->
          <div class="tool-item">
            <button class="studio-btn" :class="{ 'is-active': activeTool === 'pan' }" @click="selectTool('pan')">
              <div class="btn-glow" />
              <v-icon class="btn-icon">mdi-hand-back-right</v-icon>
              <div class="btn-tooltip">Navegar</div>
            </button>
          </div>

          <div class="tool-separator" />

          <!-- Zoom Controls -->
          <div class="tool-item">
            <button
              class="studio-btn studio-btn-action"
              :disabled="!viewerControls.isViewerReady.value"
              @click="viewerControls.zoomIn"
            >
              <div class="btn-glow" />
              <v-icon class="btn-icon">mdi-plus</v-icon>
              <div class="btn-tooltip">Ampliar</div>
            </button>
          </div>

          <div class="tool-item">
            <button
              class="studio-btn studio-btn-action"
              :disabled="!viewerControls.isViewerReady.value"
              @click="viewerControls.zoomOut"
            >
              <div class="btn-glow" />
              <v-icon class="btn-icon">mdi-minus</v-icon>
              <div class="btn-tooltip">Reduzir</div>
            </button>
          </div>

          <div class="tool-item">
            <button
              class="studio-btn studio-btn-action"
              :disabled="!viewerControls.isViewerReady.value"
              @click="viewerControls.resetView"
            >
              <div class="btn-glow" />
              <v-icon class="btn-icon">mdi-fit-to-screen</v-icon>
              <div class="btn-tooltip">Ajustar</div>
            </button>
          </div>

          <template v-if="!isReadOnly.value">
            <div class="tool-separator" />

            <!-- ROI Tools -->
            <div class="tool-item">
              <button
                class="studio-btn"
                :class="{ 'is-active': activeTool === 'roi-rect' }"
                @click="selectTool('roi-rect')"
              >
                <div class="btn-glow" />
                <v-icon class="btn-icon">mdi-vector-square</v-icon>
                <div class="btn-tooltip">Retângulo</div>
              </button>
            </div>

            <div class="tool-item">
              <button
                class="studio-btn"
                :class="{ 'is-active': activeTool === 'roi-arrow' }"
                @click="selectTool('roi-arrow')"
              >
                <div class="btn-glow" />
                <v-icon class="btn-icon">mdi-arrow-top-right</v-icon>
                <div class="btn-tooltip">Seta</div>
              </button>
            </div>

            <div class="tool-separator" />

            <!-- Measure Tool -->
            <div class="tool-item">
              <button
                class="studio-btn"
                :class="{ 'is-active': activeTool === 'measure' }"
                @click="selectTool('measure')"
              >
                <div class="btn-glow" />
                <v-icon class="btn-icon">mdi-ruler</v-icon>
                <div class="btn-tooltip">Medir</div>
              </button>
            </div>
          </template>

          <div class="tool-separator" />

          <!-- Focus Mode Toggle -->
          <div class="tool-item">
            <button
              class="studio-btn"
              :class="{ 'studio-btn-focus-active': focusMode }"
              @click="toggleFocusMode"
            >
              <div class="btn-glow" />
              <v-icon class="btn-icon">{{ focusMode ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }}</v-icon>
              <div class="btn-tooltip">{{ focusMode ? 'Sair do Foco' : 'Modo Foco' }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Panel Toggle Button (when closed, Desktop only) -->
      <v-btn
        v-if="!mobile && !rightPanel && !focusMode && !isReadOnly.value"
        class="panel-toggle-btn"
        color="primary"
        elevation="4"
        icon
        size="small"
        @click="rightPanel = true"
      >
        <v-icon>mdi-chevron-left</v-icon>
        <v-tooltip activator="parent" location="left">Mostrar Painel</v-tooltip>
      </v-btn>

      <!-- Viewer Container (OpenSeadragon will mount here) -->
      <div id="viewer-container" class="viewer-container" @mouseleave="onMouseLeave" @mousemove="onMouseMove">
        <!-- Router view for page content -->
        <router-view />
      </div>

      <!-- Fullscreen Exit Button (only in fullscreen) -->
      <v-btn
        v-if="isFullscreen"
        class="fullscreen-exit-btn"
        color="surface"
        elevation="4"
        icon
        size="small"
        @click="toggleFullscreen"
      >
        <v-icon>mdi-fullscreen-exit</v-icon>
        <v-tooltip activator="parent" location="left">Sair da Tela Cheia</v-tooltip>
      </v-btn>

      <!-- Mobile Focus Mode Exit Button -->
      <v-btn
        v-if="mobile && focusMode"
        class="mobile-focus-exit-btn"
        color="primary"
        elevation="4"
        rounded="pill"
        size="small"
        @click="toggleFocusMode"
      >
        <v-icon start>mdi-eye-outline</v-icon>
        Sair do Foco
      </v-btn>

      <!-- Floating Status Card (Google Maps style) -->
      <div v-show="!focusMode" class="status-card" :class="{ 'status-card-mobile': mobile }">
        <div class="status-content">
          <!-- Magnification Info -->
          <div class="status-item" :class="{ 'status-digital-zoom': viewerControls.state.value.isDigitalZoom }">
            <v-icon class="status-icon" size="16">mdi-magnify</v-icon>
            <span v-if="!mobile" class="status-label">
              {{ viewerControls.state.value.isDigitalZoom ? 'Digital:' : 'Mag:' }}
            </span>
            <strong class="status-value">{{ viewerControls.state.value.magnification }}x</strong>
            <v-chip
              v-if="viewerControls.state.value.appMag && !mobile"
              class="status-native-mag"
              density="compact"
              size="x-small"
              variant="outlined"
            >
              {{ viewerControls.state.value.appMag }}x ótico
            </v-chip>
          </div>

          <!-- Escala (Desktop only) -->
          <div v-if="!mobile" class="status-separator" />
          <div v-if="!mobile" class="status-item">
            <v-icon class="status-icon" size="16">mdi-ruler</v-icon>
            <span class="status-label">Escala:</span>
            <strong class="status-value">{{ viewerControls.state.value.scaleBar }}</strong>
          </div>

          <!-- Tiles (Desktop only) -->
          <div v-if="!mobile" class="status-separator" />
          <div v-if="!mobile" class="status-item">
            <v-icon class="status-icon" size="16">mdi-image</v-icon>
            <strong class="status-value">{{ viewerControls.state.value.tilesLoaded }}</strong>
            <span class="status-label">tiles</span>
          </div>

          <!-- Tile Source Badge (Local/Cloud) -->
          <div v-if="edgeFirstState && edgeFirstState.origin.value !== 'unknown'" class="status-separator" />
          <TileSourceBadge
            v-if="edgeFirstState && edgeFirstState.origin.value !== 'unknown'"
            :edge-agent-id="edgeFirstState.edgeAgentId.value"
            :edge-available="edgeFirstState.edgeAvailable.value"
            :fallback-reason="edgeFirstState.fallbackReason.value"
            :origin="edgeFirstState.origin.value"
          />

          <!-- Loading Indicator -->
          <div v-if="!viewerControls.isViewerReady.value" class="status-separator" />
          <div v-if="!viewerControls.isViewerReady.value" class="status-item status-loading">
            <v-icon class="status-icon mdi-spin" size="16">mdi-loading</v-icon>
            <span v-if="!mobile" class="status-label">{{ viewerControls.loadingProgress.value }}</span>
          </div>

          <!-- Coordinates (Desktop only) -->
          <div v-if="!mobile && viewerControls.state.value.mouseCoords" class="status-separator" />
          <div v-if="!mobile && viewerControls.state.value.mouseCoords" class="status-item status-coords">
            <v-icon class="status-icon" size="16">mdi-crosshairs-gps</v-icon>
            <span class="status-label">
              X: {{ viewerControls.state.value.mouseCoords.x }},
              Y: {{ viewerControls.state.value.mouseCoords.y }}
            </span>
          </div>
        </div>
      </div>
    </v-main>

    <!-- Delete ROI Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="error">mdi-alert-circle</v-icon>
          Confirmar Exclusão
        </v-card-title>
        <v-card-text>
          Tem certeza que deseja excluir a região <strong>"{{ roiToDeleteName }}"</strong>?
          <br><br>
          Esta ação não pode ser desfeita.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelDeleteROI">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteROI">
            Excluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Invite Pathologist Dialog -->
    <v-dialog v-model="inviteDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="primary">mdi-account-plus</v-icon>
          Adicionar Patologista
        </v-card-title>

        <v-tabs
          v-model="inviteMode"
          class="invite-tabs"
          color="primary"
          density="comfortable"
          grow
        >
          <v-tab value="select">
            <v-icon class="mr-2" size="18">mdi-account-group</v-icon>
            Colaboradores
          </v-tab>
          <v-tab value="email">
            <v-icon class="mr-2" size="18">mdi-email-outline</v-icon>
            Convidar por E-mail
          </v-tab>
        </v-tabs>

        <v-card-text class="pt-4 pb-2">
          <!-- Select from existing pathologists -->
          <div v-if="inviteMode === 'select'">
            <div v-if="availableToInvite.length > 0" class="pathologist-list">
              <div
                v-for="pathologist in availableToInvite"
                :key="pathologist.id"
                class="pathologist-item"
                :class="{ 'pathologist-item--selected': selectedPathologists.includes(pathologist.id) }"
                @click="selectedPathologists.includes(pathologist.id)
                  ? selectedPathologists = selectedPathologists.filter(id => id !== pathologist.id)
                  : selectedPathologists.push(pathologist.id)"
              >
                <v-checkbox
                  class="flex-grow-0"
                  density="compact"
                  hide-details
                  :model-value="selectedPathologists.includes(pathologist.id)"
                  @click.stop="selectedPathologists.includes(pathologist.id)
                    ? selectedPathologists = selectedPathologists.filter(id => id !== pathologist.id)
                    : selectedPathologists.push(pathologist.id)"
                />
                <v-avatar :color="pathologist.isOnline ? 'primary' : 'grey'" size="36">
                  <span class="text-white text-caption">{{ pathologist.name.split(' ').map(n => n[0]).slice(0, 2).join('') }}</span>
                </v-avatar>
                <div class="pathologist-info">
                  <div class="pathologist-name">{{ pathologist.name }}</div>
                  <div class="pathologist-specialty">{{ pathologist.specialty }}</div>
                </div>
                <v-chip
                  :color="pathologist.isOnline ? 'success' : 'grey'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ pathologist.isOnline ? 'Online' : 'Offline' }}
                </v-chip>
              </div>
            </div>
            <v-alert
              v-else
              color="warning"
              density="compact"
              icon="mdi-account-off"
              variant="tonal"
            >
              Todos os colaboradores já participam desta discussão.
            </v-alert>
          </div>

          <!-- Invite by email -->
          <div v-else>
            <v-text-field
              v-model="inviteEmail"
              autofocus
              class="mb-2"
              density="comfortable"
              hide-details="auto"
              label="E-mail do patologista"
              placeholder="exemplo@hospital.com"
              prepend-inner-icon="mdi-email-outline"
              type="email"
              variant="outlined"
            />
            <v-alert
              class="mt-3"
              color="info"
              density="compact"
              icon="mdi-information"
              variant="tonal"
            >
              O patologista receberá um e-mail com o link para acessar esta discussão.
            </v-alert>
          </div>

          <!-- Role selection (for both modes) -->
          <v-divider class="my-4" />
          <div class="text-caption text-medium-emphasis mb-2">Permissão</div>
          <v-radio-group v-model="inviteRole" class="mt-0" hide-details inline>
            <v-radio label="Colaborador (pode comentar)" value="invited" />
            <v-radio label="Co-proprietário" value="owner" />
          </v-radio-group>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="inviteDialog = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :disabled="inviteMode === 'select' ? selectedPathologists.length === 0 : !inviteEmail.trim()"
            :loading="inviteSending"
            variant="flat"
            @click="sendInvite"
          >
            <v-icon class="mr-1">{{ inviteMode === 'select' ? 'mdi-account-plus' : 'mdi-send' }}</v-icon>
            {{ inviteMode === 'select' ? `Adicionar (${selectedPathologists.length})` : 'Enviar Convite' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Case Search Dialog -->
    <v-dialog v-model="caseSearchDialog" max-width="600" scrollable>
      <v-card class="case-search-card">
        <v-card-title class="d-flex align-center ga-2 pa-4">
          <v-icon color="primary">mdi-magnify</v-icon>
          Buscar Caso
          <v-spacer />
          <v-btn icon size="small" variant="text" @click="caseSearchDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <div class="pa-4">
          <v-text-field
            v-model="caseSearchQuery"
            autofocus
            class="case-search-input"
            clearable
            density="comfortable"
            hide-details
            placeholder="Buscar por ID, paciente, órgão ou patologista..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />

          <!-- Filters -->
          <div class="d-flex ga-2 mt-3 flex-wrap">
            <v-chip
              v-for="filter in caseFilters"
              :key="filter.value"
              :color="activeCaseFilter === filter.value ? 'primary' : 'default'"
              size="small"
              :variant="activeCaseFilter === filter.value ? 'flat' : 'outlined'"
              @click="activeCaseFilter = filter.value"
            >
              {{ filter.label }}
            </v-chip>
          </div>
        </div>

        <v-divider />

        <v-card-text class="pa-0 case-search-results">
          <!-- Results -->
          <v-list v-if="filteredCases.length > 0" class="py-0">
            <v-list-item
              v-for="caseItem in filteredCases"
              :key="caseItem.id"
              class="case-result-item"
              @click="selectCase(caseItem)"
            >
              <template #prepend>
                <v-avatar :color="getCaseStatusColor(caseItem.status)" size="40">
                  <v-icon color="white" size="20">mdi-folder-open</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ caseItem.id }} - {{ caseItem.patientName }}
              </v-list-item-title>
              <v-list-item-subtitle class="d-flex align-center ga-2 mt-1">
                <span class="d-flex align-center ga-1">
                  <v-icon size="12">mdi-human</v-icon>
                  {{ caseItem.organ }}
                </span>
                <span class="text-medium-emphasis">•</span>
                <span class="d-flex align-center ga-1">
                  <v-icon size="12">mdi-image-multiple</v-icon>
                  {{ caseItem.slidesCount }} lâminas
                </span>
                <span class="text-medium-emphasis">•</span>
                <span class="d-flex align-center ga-1">
                  <v-icon size="12">mdi-calendar</v-icon>
                  {{ caseItem.date }}
                </span>
              </v-list-item-subtitle>

              <template #append>
                <div class="d-flex flex-column align-end ga-1">
                  <v-chip
                    :color="getCaseStatusColor(caseItem.status)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ getCaseStatusLabel(caseItem.status) }}
                  </v-chip>
                  <span class="text-caption text-medium-emphasis">{{ caseItem.assignedTo }}</span>
                </div>
              </template>
            </v-list-item>
          </v-list>

          <!-- Empty State -->
          <div v-else class="empty-search-state">
            <v-icon color="medium-emphasis" size="48">mdi-folder-search-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-2">
              {{ caseSearchQuery ? 'Nenhum caso encontrado' : 'Digite para buscar casos' }}
            </p>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <span class="text-caption text-medium-emphasis">
            {{ filteredCases.length }} caso(s) encontrado(s)
          </span>
          <v-spacer />
          <v-btn variant="text" @click="caseSearchDialog = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Trash Confirmation Dialog -->
    <v-dialog v-model="showTrashConfirm" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-trash-can-outline</v-icon>
          Mover para Lixeira
        </v-card-title>
        <v-card-text>
          Tem certeza que deseja mover este caso para a lixeira? Você poderá restaurá-lo posteriormente.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTrashConfirm = false">Cancelar</v-btn>
          <v-btn color="warning" variant="tonal" @click="confirmMoveToTrash">Mover para Lixeira</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="error">mdi-delete-forever</v-icon>
          Excluir Permanentemente
        </v-card-title>
        <v-card-text>
          <strong>Atenção:</strong> Esta ação não pode ser desfeita. O caso e todos os seus dados serão excluídos permanentemente.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteCase">Excluir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
  import type { MeasurementResult, ROI } from '@/composables/useViewer'
  import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
  import type { TileSourceOrigin } from '@/composables/useEdgeFirstTileSource'
  import TileSourceBadge from '@/components/TileSourceBadge.vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay, useTheme } from 'vuetify'
  import { useViewer } from '@/composables/useViewer'
  import { annotationsApi } from '@/api/annotations'
  import type { Annotation as ApiAnnotation, Message as ApiMessage } from '@/api/types'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const route = useRoute()

  function goToDashboard () {
    router.push('/dashboard')
  }

  // Viewer Controls (global state)
  const viewerControls = useViewer()

  // Edge-first tile source state (injected from viewer page)
  interface EdgeFirstState {
    origin: { value: TileSourceOrigin }
    edgeAgentId: { value: string }
    edgeAvailable: { value: boolean }
    fallbackReason: { value: string | null }
    isLoading: { value: boolean }
  }
  const edgeFirstState = inject<EdgeFirstState | null>('edgeFirstTileSource', null)

  // Read-only mode (magic links: no annotations/drawing)
  const isReadOnly = inject<{ value: boolean }>('viewerReadOnly', ref(false))

  // Theme
  const theme = useTheme()
  const isDark = computed(() => theme.global.name.value === 'medicalDark')

  // Responsive
  const { mobile } = useDisplay()

  // State Management
  const rightPanel = ref(!mobile.value) // Closed by default on mobile
  const focusMode = ref(false) // Ultra-minimal focus mode
  const activeTab = ref('info')
  const activeTool = ref('pan')

  // Mobile-specific state
  const mobilePanel = ref(false)
  const mobileToolsMenu = ref(false)
  const mobileNavTab = ref<string | null>(null)
  const isFullscreen = ref(false)
  const showToolbar = ref(true)


  // Case Slides - Using shared state from composable
  // The page sets slides via viewerControls.setSlides() after loading from API
  const caseSlides = computed(() => viewerControls.state.value.slides)
  const activeSlideId = computed(() => viewerControls.state.value.activeSlideId)

  // Get slide index (1-based) for display
  function getSlideIndex (slideId: string): number {
    const index = caseSlides.value.findIndex(s => s.id === slideId)
    return index === -1 ? 0 : index + 1
  }

  // Get slide label like "Lâmina 1"
  function getSlideLabel (slideId: string): string {
    const index = getSlideIndex(slideId)
    return index > 0 ? `Lâmina ${index}` : ''
  }

  const currentSlideIndex = computed(() => getSlideIndex(activeSlideId.value))

  const currentSlideLabel = computed(() => {
    return currentSlideIndex.value > 0 ? `Lâmina ${currentSlideIndex.value}` : 'Nenhuma lâmina'
  })

  const currentSlideName = computed(() => {
    const slide = caseSlides.value.find(s => s.id === activeSlideId.value)
    if (!slide) return 'Nenhuma lâmina'
    const label = currentSlideLabel.value
    return `${label} · ${slide.stain}`
  })

  function selectSlide (slide: { id: string, name: string, stain: string, tileSource: string }) {
    viewerControls.setActiveSlideId(slide.id)
    // Update slide info in viewer
    viewerControls.setSlideInfo(
      viewerControls.state.value.caseName,
      slide.name,
    )
    console.log('[Layout] Selected slide:', slide.name)
    // The page will handle loading the new tile source via onSlideChange callback
  }

  // Slide select helpers for v-select combobox
  function slideSelectTitle (slide: { id: string, name: string, stain: string }) {
    const idx = caseSlides.value.findIndex(s => s.id === slide.id) + 1
    return `Lâmina ${idx} · ${slide.name}`
  }

  function onSlideSelectChange (slideId: string) {
    const slide = caseSlides.value.find(s => s.id === slideId)
    if (slide) selectSlide(slide)
  }

  // Patient data from extension (via magic link JWT)
  const patientData = computed(() => viewerControls.state.value.patientData)

  // Mini access log (who accessed this case recently)
  const accessLog = computed(() => {
    const entries = []
    // Current user always first
    if (authStore.user) {
      entries.push({
        id: authStore.user.id,
        name: authStore.user.name || 'Você',
        avatar: authStore.user.avatar,
        initials: (authStore.user.name || 'U').slice(0, 2).toUpperCase(),
        time: 'agora',
      })
    }
    return entries
  })

  // Delete confirmation dialog
  const deleteDialog = ref(false)
  const roiToDelete = ref<number | null>(null)
  const roiToDeleteName = ref('')

  // Case Management
  type CaseLocationType = 'inbox' | 'archived' | 'trash'
  const caseLocation = ref<CaseLocationType>('inbox')
  const showTrashConfirm = ref(false)
  const showDeleteConfirm = ref(false)

  const caseLocationLabel = computed(() => {
    switch (caseLocation.value) {
      case 'inbox': { return 'Caixa de Entrada'
      }
      case 'archived': { return 'Arquivado'
      }
      case 'trash': { return 'Na Lixeira'
      }
      default: { return 'Desconhecido'
      }
    }
  })

  const caseLocationColor = computed(() => {
    switch (caseLocation.value) {
      case 'inbox': { return 'primary'
      }
      case 'archived': { return 'secondary'
      }
      case 'trash': { return 'error'
      }
      default: { return 'default'
      }
    }
  })

  const caseLocationIcon = computed(() => {
    switch (caseLocation.value) {
      case 'inbox': { return 'mdi-inbox'
      }
      case 'archived': { return 'mdi-archive'
      }
      case 'trash': { return 'mdi-trash-can'
      }
      default: { return 'mdi-help'
      }
    }
  })

  function moveCaseTo (location: CaseLocationType) {
    caseLocation.value = location
    console.log(`[Case] Moved to ${location}`)
    // TODO: Update in backend
  }

  function confirmMoveToTrash () {
    moveCaseTo('trash')
    showTrashConfirm.value = false
  }

  function confirmDeleteCase () {
    console.log('[Case] Permanently deleted')
    showDeleteConfirm.value = false
    // TODO: Delete from backend and navigate to dashboard
    router.push('/dashboard')
  }

  // Invite pathologist dialog
  const inviteDialog = ref(false)
  const inviteMode = ref<'select' | 'email'>('select')
  const inviteEmail = ref('')
  const inviteRole = ref<'invited' | 'owner'>('invited')
  const inviteSending = ref(false)
  const selectedPathologists = ref<string[]>([])

  // Available pathologists (mock data - would come from API)
  const availablePathologists = ref([
    { id: 'path-1', name: 'Dr. Ricardo Mendes', specialty: 'Dermatopatologia', avatar: '', isOnline: true },
    { id: 'path-2', name: 'Dra. Fernanda Lima', specialty: 'Citopatologia', avatar: '', isOnline: true },
    { id: 'path-3', name: 'Dr. Carlos Eduardo', specialty: 'Patologia Cirúrgica', avatar: '', isOnline: false },
    { id: 'path-4', name: 'Dra. Beatriz Santos', specialty: 'Neuropatologia', avatar: '', isOnline: false },
    { id: 'path-5', name: 'Dr. André Costa', specialty: 'Hematopatologia', avatar: '', isOnline: true },
  ])

  // Right Panel Resizing
  const MIN_PANEL_WIDTH = 400
  const MAX_PANEL_WIDTH = 800
  const rightPanelWidth = ref(MIN_PANEL_WIDTH)
  const isResizingPanel = ref(false)

  function startPanelResize (e: MouseEvent) {
    if (mobile.value) return
    e.preventDefault()
    isResizingPanel.value = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onPanelResize)
    document.addEventListener('mouseup', stopPanelResize)
  }

  function onPanelResize (e: MouseEvent) {
    if (!isResizingPanel.value) return
    const newWidth = window.innerWidth - e.clientX
    rightPanelWidth.value = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth))
  }

  function stopPanelResize () {
    isResizingPanel.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onPanelResize)
    document.removeEventListener('mouseup', stopPanelResize)
  }

  // ===========================================
  // CASE SEARCH
  // ===========================================
  interface CaseItem {
    id: string
    patientName: string
    organ: string
    slidesCount: number
    date: string
    status: 'pending' | 'in-progress' | 'completed' | 'urgent'
    assignedTo: string
  }

  const caseSearchDialog = ref(false)
  const caseSearchQuery = ref('')
  const activeCaseFilter = ref('all')

  const caseFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'in-progress', label: 'Em Análise' },
    { value: 'urgent', label: 'Urgentes' },
    { value: 'completed', label: 'Finalizados' },
  ]

  const allCases = ref<CaseItem[]>([
    { id: 'CASO-2026-001', patientName: 'Maria Silva', organ: 'Fígado', slidesCount: 4, date: '02/01/2026', status: 'in-progress', assignedTo: 'Dr. Carlos Silva' },
    { id: 'CASO-2026-002', patientName: 'João Santos', organ: 'Pulmão', slidesCount: 6, date: '02/01/2026', status: 'urgent', assignedTo: 'Dra. Ana Costa' },
    { id: 'CASO-2026-003', patientName: 'Ana Oliveira', organ: 'Mama', slidesCount: 3, date: '01/01/2026', status: 'pending', assignedTo: 'Dr. Carlos Silva' },
    { id: 'CASO-2025-498', patientName: 'Pedro Costa', organ: 'Próstata', slidesCount: 8, date: '30/12/2025', status: 'completed', assignedTo: 'Dr. Roberto Mendes' },
    { id: 'CASO-2025-497', patientName: 'Lucia Ferreira', organ: 'Tireoide', slidesCount: 2, date: '29/12/2025', status: 'completed', assignedTo: 'Dra. Ana Costa' },
    { id: 'CASO-2025-496', patientName: 'Carlos Mendes', organ: 'Rim', slidesCount: 5, date: '28/12/2025', status: 'pending', assignedTo: 'Dr. Carlos Silva' },
    { id: 'CASO-2025-495', patientName: 'Fernanda Lima', organ: 'Pele', slidesCount: 3, date: '27/12/2025', status: 'in-progress', assignedTo: 'Dr. Roberto Mendes' },
    { id: 'CASO-2025-494', patientName: 'Ricardo Alves', organ: 'Cólon', slidesCount: 7, date: '26/12/2025', status: 'urgent', assignedTo: 'Dra. Ana Costa' },
  ])

  const filteredCases = computed(() => {
    let result = allCases.value

    // Filter by status
    if (activeCaseFilter.value !== 'all') {
      result = result.filter(c => c.status === activeCaseFilter.value)
    }

    // Filter by search query
    if (caseSearchQuery.value) {
      const query = caseSearchQuery.value.toLowerCase()
      result = result.filter(c =>
        c.id.toLowerCase().includes(query)
        || c.patientName.toLowerCase().includes(query)
        || c.organ.toLowerCase().includes(query)
        || c.assignedTo.toLowerCase().includes(query),
      )
    }

    return result
  })

  function openCaseSearch () {
    caseSearchQuery.value = ''
    activeCaseFilter.value = 'all'
    caseSearchDialog.value = true
  }

  function selectCase (caseItem: CaseItem) {
    console.log('[Layout] Selected case:', caseItem.id)
    viewerControls.setSlideInfo(caseItem.id, `Lâmina 001 · ${caseItem.organ}`)
    caseSearchDialog.value = false
  }

  function getCaseStatusColor (status: string): string {
    const colors: Record<string, string> = {
      'pending': 'info',
      'in-progress': 'primary',
      'completed': 'success',
      'urgent': 'error',
    }
    return colors[status] || 'grey'
  }

  function getCaseStatusLabel (status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'in-progress': 'Em Análise',
      'completed': 'Finalizado',
      'urgent': 'Urgente',
    }
    return labels[status] || status
  }

  // ===========================================
  // ANNOTATIONS & DISCUSSION SYSTEM
  // ===========================================

  // Types
  interface Participant {
    id: string
    name: string
    role: 'owner' | 'invited' | 'ai'
    avatar?: string
    specialty?: string
    isOnline?: boolean
  }

  interface Message {
    id: string
    authorId: string
    content: string
    timestamp: Date
    editedAt?: Date
    type: 'text' | 'ai-analysis' | 'ai-suggestion' | 'system'
    aiConfidence?: number
    aiFindings?: Array<{ label: string, value: string, severity?: 'low' | 'medium' | 'high' }>
  }

  interface Annotation {
    id: number
    name: string
    type: 'rectangle' | 'arrow' | 'freehand'
    color: string
    coordinates: { x: number, y: number, width?: number, height?: number }
    owner: Participant
    participants: Participant[]
    messages: Message[]
    createdAt: Date
    updatedAt: Date
    status: 'open' | 'resolved' | 'pending-review'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    unreadCount: number
  }

  // AI Pathologist Agent
  const aiAgent: Participant = {
    id: 'ai-pathologist',
    name: 'PathAI Assistant',
    role: 'ai',
    specialty: 'Histopatologia Geral',
    isOnline: true,
  }

  // Current User from auth store
  const authStore = useAuthStore()
  const currentUser = computed<Participant>(() => ({
    id: authStore.user?.id || 'anonymous',
    name: authStore.user?.name || 'Usuário',
    role: 'owner',
    avatar: authStore.user?.avatar,
    specialty: authStore.user?.specialization || '',
    isOnline: true,
  }))

  // Sample Participants (AI removed - coming soon)
  const sampleParticipants: Participant[] = [
    currentUser.value,
    {
      id: 'user-2',
      name: 'Dra. Ana Costa',
      role: 'invited',
      specialty: 'Oncopatologia',
      isOnline: true,
    },
    {
      id: 'user-3',
      name: 'Dr. Roberto Mendes',
      role: 'invited',
      specialty: 'Citopatologia',
      isOnline: false,
    },
  ]

  // Annotations State - loaded from API
  const annotations = ref<Annotation[]>([])
  const isLoadingAnnotations = ref(false)

  // Convert API annotation to local annotation format
  function apiToLocalAnnotation (apiAnn: ApiAnnotation): Annotation {
    // Convert coordinates, converting null to undefined
    const coordinates: { x: number, y: number, width?: number, height?: number } = {
      x: apiAnn.coordinates.x,
      y: apiAnn.coordinates.y,
    }
    if (apiAnn.coordinates.width != null) {
      coordinates.width = apiAnn.coordinates.width
    }
    if (apiAnn.coordinates.height != null) {
      coordinates.height = apiAnn.coordinates.height
    }

    return {
      id: apiAnn.id,
      name: apiAnn.name,
      type: apiAnn.type as 'rectangle' | 'arrow' | 'freehand',
      color: apiAnn.color,
      coordinates,
      owner: currentUser.value,
      participants: [currentUser.value],
      messages: [],
      status: apiAnn.status.replace('_', '-') as 'open' | 'resolved' | 'pending-review',
      priority: apiAnn.priority as 'low' | 'normal' | 'high' | 'urgent',
      unreadCount: 0,
      createdAt: new Date(apiAnn.createdAt),
      updatedAt: new Date(apiAnn.updatedAt),
    }
  }

  // Load annotations from API for the current slide
  async function loadAnnotations (slideId: string) {
    if (!slideId) return

    isLoadingAnnotations.value = true
    try {
      const apiAnnotations = await annotationsApi.getBySlide(slideId)
      annotations.value = apiAnnotations.map(apiToLocalAnnotation)
      console.log('[Layout] Loaded', annotations.value.length, 'annotations for slide', slideId)
    } catch (err) {
      console.error('[Layout] Failed to load annotations:', err)
    } finally {
      isLoadingAnnotations.value = false
    }
  }

  // Watch for slide changes to load annotations
  watch(
    () => activeSlideId.value,
    (newSlideId) => {
      if (newSlideId) {
        loadAnnotations(newSlideId)
      } else {
        annotations.value = []
      }
    },
    { immediate: true },
  )

  // Total unread messages (for mobile badge)
  const totalUnread = computed(() => annotations.value.reduce((acc, a) => acc + a.unreadCount, 0))

  // Selected annotation for discussion view
  const selectedAnnotation = ref<Annotation | null>(null)

  // New message input
  const newMessage = ref('')
  const isSendingMessage = ref(false)
  const isLoadingMessages = ref(false)
  const aiAgentEnabled = ref(false) // AI participation disabled (coming soon)

  // Message editing
  const editingMessageId = ref<string | null>(null)
  const editingMessageContent = ref('')
  const showDeleteMessageDialog = ref(false)
  const messageToDelete = ref<Message | null>(null)

  function startMessageEdit (message: Message) {
    editingMessageId.value = message.id
    editingMessageContent.value = message.content
  }

  function cancelMessageEdit () {
    editingMessageId.value = null
    editingMessageContent.value = ''
  }

  function saveMessageEdit (message: Message) {
    if (!editingMessageContent.value.trim() || !selectedAnnotation.value) return

    const idx = selectedAnnotation.value.messages.findIndex(m => m.id === message.id)
    if (idx !== -1) {
      selectedAnnotation.value.messages[idx].content = editingMessageContent.value.trim()
      selectedAnnotation.value.messages[idx].editedAt = new Date()
    }

    cancelMessageEdit()
  }

  function confirmDeleteMessage (message: Message) {
    messageToDelete.value = message
    showDeleteMessageDialog.value = true
  }

  function deleteMessage () {
    if (!messageToDelete.value || !selectedAnnotation.value) return

    const idx = selectedAnnotation.value.messages.findIndex(m => m.id === messageToDelete.value!.id)
    if (idx !== -1) {
      selectedAnnotation.value.messages.splice(idx, 1)
    }

    showDeleteMessageDialog.value = false
    messageToDelete.value = null
  }

  function formatMessageDateTime (date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    if (diffDays === 0) {
      return `Hoje às ${timeStr}`
    } else if (diffDays === 1) {
      return `Ontem às ${timeStr}`
    } else if (diffDays < 7) {
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
      return `${dayName} às ${timeStr}`
    } else {
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      return `${dateStr} às ${timeStr}`
    }
  }

  // ===========================================
  // AI CASE DISCUSSION (Global Slide Analysis)
  // ===========================================
  const aiCaseMessages = ref<Message[]>([])
  const aiCaseNewMessage = ref('')
  const isAICaseTyping = ref(false)

  function startAICaseAnalysis () {
    isAICaseTyping.value = true

    // Simulate AI initial analysis
    setTimeout(() => {
      const initialAnalysis: Message = {
        id: `ai-case-${Date.now()}`,
        authorId: 'ai-pathologist',
        content: 'Análise inicial da lâmina concluída. Identifiquei os seguintes achados principais:',
        timestamp: new Date(),
        type: 'ai-analysis',
        aiConfidence: 89,
        aiFindings: [
          { label: 'Padrão arquitetural', value: 'Parênquima hepático com arquitetura lobular preservada' },
          { label: 'Alterações portais', value: 'Infiltrado inflamatório linfocitário moderado em espaços-porta', severity: 'medium' },
          { label: 'Parênquima', value: 'Hepatócitos com discreta balonização centrolobular' },
          { label: 'Fibrose', value: 'Fibrose portal e septal incipiente (F1-F2)', severity: 'medium' },
          { label: 'Sugestão diagnóstica', value: 'Hepatite crônica com atividade leve a moderada', severity: 'high' },
        ],
      }
      aiCaseMessages.value.push(initialAnalysis)
      isAICaseTyping.value = false
    }, 2000)
  }

  async function sendAICaseMessage () {
    if (!aiCaseNewMessage.value.trim() || isAICaseTyping.value) return

    // Add user message
    const userMessage: Message = {
      id: `user-case-${Date.now()}`,
      authorId: currentUser.value.id,
      content: aiCaseNewMessage.value.trim(),
      timestamp: new Date(),
      type: 'text',
    }
    aiCaseMessages.value.push(userMessage)
    aiCaseNewMessage.value = ''
    isAICaseTyping.value = true

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-case-${Date.now()}`,
        authorId: 'ai-pathologist',
        content: 'Analisando sua pergunta em contexto com os achados da lâmina...',
        timestamp: new Date(),
        type: 'ai-suggestion',
        aiConfidence: 85,
        aiFindings: [
          { label: 'Observação', value: 'Sua pergunta foi correlacionada com os achados morfológicos identificados' },
          { label: 'Recomendação', value: 'Considere avaliar as regiões de interesse já marcadas para detalhes específicos' },
        ],
      }
      aiCaseMessages.value.push(aiResponse)
      isAICaseTyping.value = false
    }, 1500)
  }

  // Annotation name editing
  const isEditingAnnotationName = ref(false)
  const editingAnnotationName = ref('')

  function startEditAnnotationName () {
    if (selectedAnnotation.value) {
      editingAnnotationName.value = selectedAnnotation.value.name
      isEditingAnnotationName.value = true
    }
  }

  async function saveAnnotationName () {
    if (selectedAnnotation.value && editingAnnotationName.value.trim()) {
      const newName = editingAnnotationName.value.trim()
      const annotationId = selectedAnnotation.value.id

      // Optimistic update
      selectedAnnotation.value.name = newName
      const annotation = annotations.value.find(a => a.id === annotationId)
      if (annotation) {
        annotation.name = newName
      }
      syncAnnotationsToViewer()

      // Save to API
      try {
        await annotationsApi.update(annotationId, { name: newName })
        console.log('[Layout] Annotation name updated:', annotationId, newName)
      } catch (err) {
        console.error('[Layout] Failed to update annotation name:', err)
      }
    }
    isEditingAnnotationName.value = false
  }

  function cancelEditAnnotationName () {
    isEditingAnnotationName.value = false
  }

  // Convert API message to local message format
  function apiToLocalMessage (apiMsg: ApiMessage): Message {
    return {
      id: apiMsg.id,
      authorId: apiMsg.authorId,
      content: apiMsg.content,
      timestamp: new Date(apiMsg.createdAt),
      type: apiMsg.type.replace('_', '-') as Message['type'],
      aiConfidence: apiMsg.aiConfidence ?? undefined,
      aiFindings: apiMsg.aiFindings ?? undefined,
    }
  }

  // Discussion actions
  async function selectAnnotation (annotation: Annotation) {
    selectedAnnotation.value = annotation
    // Reset unread count
    annotation.unreadCount = 0
    // Focus on viewer
    focusAnnotation(annotation.id)
    // Open mobile panel if on mobile
    if (mobile.value) {
      mobilePanel.value = true
    }

    // Load messages from API if not already loaded
    if (annotation.messages.length === 0) {
      isLoadingMessages.value = true
      try {
        const apiMessages = await annotationsApi.getMessages(annotation.id)
        annotation.messages = apiMessages.map(apiToLocalMessage)
        console.log('[Layout] Loaded', annotation.messages.length, 'messages for annotation', annotation.id)
      } catch (err) {
        console.error('[Layout] Failed to load messages:', err)
      } finally {
        isLoadingMessages.value = false
      }
    }
  }

  function closeDiscussion () {
    selectedAnnotation.value = null
    // Reset zoom to 1x when closing discussion
    viewerControls.resetView()
  }

  async function sendMessage () {
    if (!newMessage.value.trim() || !selectedAnnotation.value || isSendingMessage.value) return

    const content = newMessage.value.trim()
    const annotationId = selectedAnnotation.value.id
    newMessage.value = ''
    isSendingMessage.value = true

    try {
      // Save to API
      const savedMessage = await annotationsApi.sendMessage(annotationId, { content })

      // Add to local state with API response
      const message: Message = {
        id: savedMessage.id?.toString() || `msg-${Date.now()}`,
        authorId: currentUser.value.id,
        content: savedMessage.content || content,
        timestamp: new Date(savedMessage.createdAt || Date.now()),
        type: 'text',
      }

      selectedAnnotation.value.messages.push(message)
      selectedAnnotation.value.updatedAt = new Date()
      console.log('[Layout] Message saved:', annotationId, message.id)
    } catch (err) {
      console.error('[Layout] Failed to save message:', err)
      // Fallback: add locally even if API fails
      const message: Message = {
        id: `msg-${Date.now()}`,
        authorId: currentUser.value.id,
        content,
        timestamp: new Date(),
        type: 'text',
      }
      selectedAnnotation.value.messages.push(message)
      selectedAnnotation.value.updatedAt = new Date()
    } finally {
      isSendingMessage.value = false
    }

    // Only trigger AI response if AI agent is enabled
    if (aiAgentEnabled.value) {
      isSendingMessage.value = true

      // Simulate AI response after user message
      setTimeout(() => {
        if (selectedAnnotation.value) {
          // Generate contextual AI response based on user message
          const userMsg = message.content.toLowerCase()
          let aiContent = ''
          let aiFindings: Array<{ label: string, value: string, severity?: 'high' | 'medium' | 'low' }> = []
          let aiConfidence = 88

          if (userMsg.includes('melanoma') || userMsg.includes('maligno') || userMsg.includes('tumor')) {
            aiContent = 'Concordo com sua observação sobre características atípicas. A presença de assimetria celular e padrão de crescimento irregular são indicativos relevantes. Recomendo análise imunohistoquímica complementar para confirmação diagnóstica.'
            aiFindings = [
              { label: 'Padrão identificado', value: 'Proliferação melanocítica atípica', severity: 'high' },
              { label: 'Correlação', value: 'Achados consistentes com sua observação' },
              { label: 'Sugestão', value: 'Solicitar marcadores S-100 e HMB-45' },
            ]
            aiConfidence = 94
          } else if (userMsg.includes('inflamação') || userMsg.includes('infiltrado') || userMsg.includes('inflamatório')) {
            aiContent = 'Sua observação sobre o componente inflamatório é pertinente. O padrão do infiltrado sugere processo reativo. Avaliar correlação clínica para determinar etiologia.'
            aiFindings = [
              { label: 'Tipo de infiltrado', value: 'Predominantemente linfocítico' },
              { label: 'Distribuição', value: 'Perivascular e intersticial' },
              { label: 'Recomendação', value: 'Correlacionar com história clínica' },
            ]
            aiConfidence = 86
          } else if (userMsg.includes('normal') || userMsg.includes('benigno') || userMsg.includes('sem alterações')) {
            aiContent = 'Concordo com sua avaliação. Os achados morfológicos são compatíveis com tecido dentro dos limites da normalidade para este tipo de amostra.'
            aiFindings = [
              { label: 'Avaliação', value: 'Sem atipias significativas' },
              { label: 'Arquitetura', value: 'Preservada' },
            ]
            aiConfidence = 92
          } else {
            aiContent = `Obrigado pela sua observação sobre "${message.content.slice(0, 50)}${message.content.length > 50 ? '...' : ''}". Analisei a região marcada e identifiquei características relevantes que podem auxiliar no diagnóstico diferencial.`
            aiFindings = [
              { label: 'Análise', value: 'Observação registrada e correlacionada com achados anteriores' },
              { label: 'Sugestão', value: 'Considere marcar outras áreas de interesse para comparação' },
            ]
            aiConfidence = 85
          }

          const aiResponse: Message = {
            id: `msg-${Date.now()}`,
            authorId: 'ai-pathologist',
            content: aiContent,
            timestamp: new Date(),
            type: 'ai-suggestion',
            aiConfidence,
            aiFindings,
          }
          selectedAnnotation.value.messages.push(aiResponse)
        }
        isSendingMessage.value = false
      }, 2000)
    }
  }

  function getParticipant (id: string): Participant | undefined {
    if (id === 'ai-pathologist') return aiAgent
    if (id === currentUser.value.id) return currentUser.value
    return sampleParticipants.find(p => p.id === id)
  }

  function formatTime (date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  function formatDate (date: Date): string {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Hoje'
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
  }

  function getPriorityColor (priority: string): string {
    const colors: Record<string, string> = {
      low: 'success',
      normal: 'info',
      high: 'warning',
      urgent: 'error',
    }
    return colors[priority] || 'grey'
  }

  function getStatusLabel (status: string): string {
    const labels: Record<string, string> = {
      'open': 'Em discussão',
      'resolved': 'Resolvido',
      'pending-review': 'Aguardando revisão',
    }
    return labels[status] || status
  }

  function getLastMessage (annotation: Annotation): Message | undefined {
    const len = annotation.messages.length
    return len > 0 ? annotation.messages[len - 1] : undefined
  }

  // Slide details — built from real metadata
  const slideDetails = computed(() => {
    const s = viewerControls.state.value
    const meta = s.slideMetadata
    const details: { label: string, value: string }[] = []

    if (meta?.originalFilename) {
      details.push({ label: 'Arquivo', value: meta.originalFilename })
    }
    if (meta?.fileFormat) {
      details.push({ label: 'Formato', value: meta.fileFormat.toUpperCase() })
    }
    if (s.imageWidth && s.imageHeight) {
      details.push({ label: 'Dimensões', value: `${s.imageWidth.toLocaleString('pt-BR')} x ${s.imageHeight.toLocaleString('pt-BR')} px` })
    }
    if (s.appMag) {
      details.push({ label: 'Magnificação', value: `${s.appMag}x` })
    }
    if (s.mpp) {
      details.push({ label: 'Resolução', value: `${s.mpp} µm/pixel` })
    }
    if (meta?.fileSize && meta.fileSize !== '0') {
      details.push({ label: 'Tamanho', value: formatFileSize(meta.fileSize) })
    }
    if (meta?.uploadedAt) {
      details.push({ label: 'Recebido em', value: new Date(meta.uploadedAt).toLocaleString('pt-BR') })
    }

    return details
  })

  function formatFileSize (raw: string): string {
    const bytes = Number(raw)
    if (isNaN(bytes) || bytes === 0) return raw
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
  }

  // Toolbar Auto-hide
  let toolbarTimeout: ReturnType<typeof setTimeout> | null = null

  function onMouseMove () {
    if (isFullscreen.value) {
      showToolbar.value = true
      if (toolbarTimeout) clearTimeout(toolbarTimeout)
      toolbarTimeout = setTimeout(() => {
        showToolbar.value = false
      }, 3000)
    }
  }

  function onMouseLeave () {
    if (toolbarTimeout) clearTimeout(toolbarTimeout)
  }

  // Annotation Actions
  function focusAnnotation (id: number) {
    console.log('Focus annotation:', id)
    // Zoom to the annotation on the viewer
    viewerControls.goToROI(id)
  }

  // Convert annotations to ROIs for the viewer
  function syncAnnotationsToViewer () {
    const rois: ROI[] = annotations.value.map(ann => ({
      id: ann.id,
      name: ann.name,
      color: ann.color,
      type: ann.type === 'arrow' ? 'arrow' : 'rectangle',
      coordinates: {
        x: ann.coordinates.x,
        y: ann.coordinates.y,
        width: ann.coordinates.width || 400,
        height: ann.coordinates.height || 300,
      },
      isSelected: ann.id === selectedAnnotation.value?.id,
    }))
    viewerControls.setROIs(rois)
  }

  // Handle ROI click from viewer (opens discussion)
  function handleViewerROIClick (roiId: number) {
    console.log('[Layout] handleViewerROIClick:', roiId)
    const annotation = annotations.value.find(a => a.id === roiId)
    console.log('[Layout] Found annotation:', annotation)
    if (annotation) {
      selectAnnotation(annotation)
      // Ensure we're on the annotations tab
      activeTab.value = 'annotations'
      // Open the right panel if closed
      if (!rightPanel.value) {
        rightPanel.value = true
      }
    }
  }

  // Handle ROI delete from viewer - show confirmation dialog
  function handleViewerROIDelete (roiId: number) {
    console.log('[Layout] handleViewerROIDelete:', roiId)
    const annotation = annotations.value.find(a => a.id === roiId)
    if (annotation) {
      roiToDelete.value = roiId
      roiToDeleteName.value = annotation.name
      deleteDialog.value = true
    }
  }

  // Confirm ROI deletion
  async function confirmDeleteROI () {
    if (roiToDelete.value !== null) {
      const annotationId = roiToDelete.value
      const annotationIndex = annotations.value.findIndex(a => a.id === annotationId)
      const deletedAnnotation = annotations.value[annotationIndex]
      if (annotationIndex !== -1 && deletedAnnotation) {
        // Optimistic update: remove from local state immediately
        annotations.value.splice(annotationIndex, 1)
        if (selectedAnnotation.value?.id === annotationId) {
          selectedAnnotation.value = null
        }
        syncAnnotationsToViewer()

        // Persist to backend
        try {
          await annotationsApi.delete(annotationId)
          console.log('[Layout] Annotation deleted:', annotationId)
        } catch (err) {
          console.error('[Layout] Failed to delete annotation:', err)
          // Rollback: restore the annotation
          annotations.value.splice(annotationIndex, 0, deletedAnnotation)
          syncAnnotationsToViewer()
        }
      }
    }
    cancelDeleteROI()
  }

  // Cancel ROI deletion
  function cancelDeleteROI () {
    deleteDialog.value = false
    roiToDelete.value = null
    roiToDeleteName.value = ''
  }

  // Toggle annotation resolved status
  async function toggleAnnotationResolved () {
    if (!selectedAnnotation.value) return

    const oldStatus = selectedAnnotation.value.status
    const newStatus = oldStatus === 'resolved' ? 'open' : 'resolved'

    // Optimistic update
    selectedAnnotation.value.status = newStatus

    // Add system message
    const statusMessage: Message = {
      id: `msg-${Date.now()}`,
      authorId: currentUser.value.id,
      content: newStatus === 'resolved'
        ? `${currentUser.value.name} marcou esta discussão como resolvida`
        : `${currentUser.value.name} reabriu esta discussão`,
      timestamp: new Date(),
      type: 'system',
    }
    selectedAnnotation.value.messages.push(statusMessage)
    selectedAnnotation.value.updatedAt = new Date()

    // Persist to backend
    try {
      await annotationsApi.update(selectedAnnotation.value.id, { status: newStatus })
      console.log('[Layout] Annotation status updated:', selectedAnnotation.value.id, newStatus)
    } catch (err) {
      console.error('[Layout] Failed to update annotation status:', err)
      // Rollback
      selectedAnnotation.value.status = oldStatus
      selectedAnnotation.value.messages.pop()
    }
  }

  // Open invite pathologist dialog
  function openInviteDialog () {
    inviteMode.value = 'select'
    inviteEmail.value = ''
    inviteRole.value = 'invited'
    selectedPathologists.value = []
    inviteDialog.value = true
  }

  // Get pathologists not already in the discussion
  const availableToInvite = computed(() => {
    if (!selectedAnnotation.value) return availablePathologists.value
    const currentIds = new Set(selectedAnnotation.value.participants.map(p => p.id))
    return availablePathologists.value.filter(p => !currentIds.has(p.id))
  })

  // Send invite to pathologist(s)
  async function sendInvite () {
    if (!selectedAnnotation.value) return

    // Validate based on mode
    if (inviteMode.value === 'email' && !inviteEmail.value.trim()) return
    if (inviteMode.value === 'select' && selectedPathologists.value.length === 0) return

    inviteSending.value = true

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))

    if (inviteMode.value === 'select') {
      // Add selected pathologists
      for (const pathId of selectedPathologists.value) {
        const pathologist = availablePathologists.value.find(p => p.id === pathId)
        if (pathologist) {
          const newParticipant: Participant = {
            id: pathologist.id,
            name: pathologist.name,
            specialty: pathologist.specialty,
            role: inviteRole.value,
            isOnline: pathologist.isOnline,
          }
          selectedAnnotation.value.participants.push(newParticipant)

          // Add system message for each
          const inviteMessage: Message = {
            id: `msg-${Date.now()}-${pathId}`,
            authorId: currentUser.value.id,
            content: `${currentUser.value.name} adicionou ${pathologist.name} à discussão`,
            timestamp: new Date(),
            type: 'system',
          }
          selectedAnnotation.value.messages.push(inviteMessage)
        }
      }
    } else {
      // Invite by email
      const emailName = inviteEmail.value.split('@')[0] || 'Convidado'
      const newParticipant: Participant = {
        id: `user-${Date.now()}`,
        name: emailName.charAt(0).toUpperCase() + emailName.slice(1),
        role: inviteRole.value,
        isOnline: false,
      }
      selectedAnnotation.value.participants.push(newParticipant)

      const inviteMessage: Message = {
        id: `msg-${Date.now()}`,
        authorId: currentUser.value.id,
        content: `${currentUser.value.name} convidou ${newParticipant.name} para a discussão`,
        timestamp: new Date(),
        type: 'system',
      }
      selectedAnnotation.value.messages.push(inviteMessage)
    }

    selectedAnnotation.value.updatedAt = new Date()
    inviteSending.value = false
    inviteDialog.value = false
  }

  // Delete current selected ROI
  function deleteSelectedROI () {
    if (!selectedAnnotation.value) return
    roiToDelete.value = selectedAnnotation.value.id
    roiToDeleteName.value = selectedAnnotation.value.name
    deleteDialog.value = true
  }

  // Handle tool selection
  function selectTool (tool: string) {
    console.log('[Layout] selectTool:', tool)
    activeTool.value = tool

    // Set drawing mode based on tool
    switch (tool) {
      case 'roi-rect': {
        console.log('[Layout] Setting drawing mode to rectangle')
        viewerControls.setDrawingMode('rectangle')

        break
      }
      case 'roi-arrow': {
        console.log('[Layout] Setting drawing mode to arrow')
        viewerControls.setDrawingMode('arrow')

        break
      }
      case 'measure': {
        console.log('[Layout] Setting drawing mode to measure')
        viewerControls.setDrawingMode('measure')

        break
      }
      default: {
        viewerControls.setDrawingMode('none')
      }
    }
    console.log('[Layout] Drawing state after:', viewerControls.drawingState.value)
  }

  // Color palette for new annotations
  const annotationColors = [
    '#E53935', // Red
    '#FB8C00', // Orange
    '#7B1FA2', // Purple
    '#1E88E5', // Blue
    '#43A047', // Green
    '#00ACC1', // Cyan
    '#F4511E', // Deep Orange
    '#8E24AA', // Deep Purple
  ]
  let nextColorIndex = 0

  function getNextColor (): string {
    const color = annotationColors[nextColorIndex % annotationColors.length]!
    nextColorIndex++
    return color
  }

  // Handle drawing complete - create new annotation
  async function handleDrawingComplete (coordinates: { x: number, y: number, width: number, height: number }, type: 'rectangle' | 'arrow') {
    console.log('[Layout] Drawing complete:', type, coordinates)

    const slideId = activeSlideId.value
    if (!slideId) {
      console.error('[Layout] No active slide ID, cannot create annotation')
      return
    }

    const color = getNextColor()
    const name = `ROI ${annotations.value.length + 1}`

    // Optimistically create local annotation with temporary ID
    const tempId = Date.now()
    const localAnnotation: Annotation = {
      id: tempId,
      name,
      type,
      color,
      coordinates,
      owner: currentUser.value,
      participants: [currentUser.value],
      messages: [],
      status: 'open',
      priority: 'normal',
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Add to annotations list immediately (optimistic update)
    annotations.value.push(localAnnotation)

    // Select the new annotation (opens discussion)
    selectAnnotation(localAnnotation)

    // Switch to annotations tab
    activeTab.value = 'annotations'

    // Open right panel if closed
    if (!rightPanel.value) {
      rightPanel.value = true
    }

    // Reset tool to pan mode
    selectTool('pan')

    // Save to API in background
    try {
      const apiAnnotation = await annotationsApi.create(slideId, {
        name,
        color,
        type,
        coordinates,
        priority: 'normal',
      })

      // Update local annotation with real ID from API
      const index = annotations.value.findIndex(a => a.id === tempId)
      if (index !== -1) {
        annotations.value[index]!.id = apiAnnotation.id
        // Update selected annotation if it's the one we just created
        if (selectedAnnotation.value?.id === tempId) {
          selectedAnnotation.value.id = apiAnnotation.id
        }
      }

      console.log('[Layout] Annotation saved to API with ID:', apiAnnotation.id)
    } catch (err) {
      console.error('[Layout] Failed to save annotation:', err)
      // Remove the optimistic annotation on failure
      const index = annotations.value.findIndex(a => a.id === tempId)
      if (index !== -1) {
        annotations.value.splice(index, 1)
      }
      if (selectedAnnotation.value?.id === tempId) {
        selectedAnnotation.value = null
      }
    }
  }

  // Handle ROI moved - update annotation coordinates and persist
  async function handleROIMoved (roiId: number, coordinates: { x: number, y: number, width: number, height: number }) {
    console.log('[Layout] ROI moved:', roiId, coordinates)

    // Find the annotation
    const annotation = annotations.value.find(a => a.id === roiId)
    if (!annotation) {
      console.warn('[Layout] Annotation not found for ROI move:', roiId)
      return
    }

    // Store old coordinates for rollback
    const oldCoordinates = { ...annotation.coordinates }

    // Optimistic update: update local state immediately
    annotation.coordinates = coordinates
    annotation.updatedAt = new Date()

    // Also update selected annotation if it's the same
    if (selectedAnnotation.value?.id === roiId) {
      selectedAnnotation.value.coordinates = coordinates
      selectedAnnotation.value.updatedAt = new Date()
    }

    // Persist to backend
    try {
      await annotationsApi.update(roiId, { coordinates })
      console.log('[Layout] Annotation coordinates updated:', roiId)
    } catch (err) {
      console.error('[Layout] Failed to update annotation coordinates:', err)
      // Rollback
      annotation.coordinates = oldCoordinates
      if (selectedAnnotation.value?.id === roiId) {
        selectedAnnotation.value.coordinates = oldCoordinates
      }
    }
  }

  // Watch annotations and sync to viewer
  watch(
    annotations,
    () => syncAnnotationsToViewer(),
    { deep: true, immediate: true },
  )

  // Watch selected annotation to update viewer selection
  watch(
    () => selectedAnnotation.value?.id,
    newId => {
      viewerControls.selectROI(newId ?? null)
    },
  )

  // Theme Management
  function toggleTheme () {
    theme.global.name.value = isDark.value ? 'medicalLight' : 'medicalDark'
  }

  // Focus Mode Management
  function toggleFocusMode () {
    focusMode.value = !focusMode.value
    // Hide panels in focus mode
    rightPanel.value = focusMode.value ? false : !mobile.value
  }

  // Fullscreen Management
  function toggleFullscreen () {
    if (isFullscreen.value) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  function handleFullscreenChange () {
    isFullscreen.value = !!document.fullscreenElement
  }

  // Handle Escape key to exit focus mode
  function handleKeyDown (event: KeyboardEvent) {
    if (event.key === 'Escape' && focusMode.value) {
      toggleFocusMode()
    }
  }

  // Handle measurement complete - add to persistent measurements
  function handleMeasurementComplete (result: Omit<MeasurementResult, 'id'>) {
    console.log('[Layout] Measurement complete:', result)
    viewerControls.addMeasurement(result)
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    // Register callback for when ROIs are clicked in the viewer
    viewerControls.onROIClick(handleViewerROIClick)
    // Register callback for when ROIs are deleted in the viewer
    viewerControls.onROIDelete(handleViewerROIDelete)
    // Register callback for when ROIs are moved in the viewer
    viewerControls.onROIMoved(handleROIMoved)
    // Register callback for when drawing is complete
    viewerControls.onDrawingComplete(handleDrawingComplete)
    // Register callback for when measurement is complete
    viewerControls.onMeasurementComplete(handleMeasurementComplete)

    // Check for roiId query parameter to auto-select annotation
    const roiIdParam = route.query.roiId
    if (roiIdParam) {
      const roiId = Number(roiIdParam)
      if (!isNaN(roiId)) {
        // Small delay to ensure annotations are loaded
        setTimeout(() => {
          const annotation = annotations.value.find(a => a.id === roiId)
          if (annotation) {
            selectAnnotation(annotation)
            activeTab.value = 'annotations'
            if (!rightPanel.value) {
              rightPanel.value = true
            }
          }
        }, 100)
      }
    }
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    document.removeEventListener('keydown', handleKeyDown)
    if (toolbarTimeout) clearTimeout(toolbarTimeout)
  })
</script>

<style scoped lang="scss">
/* ========================================
   APPLE HUMAN INTERFACE GUIDELINES
   Refined medical pathology viewer
   ======================================== */

// Apple Design Tokens
$apple-blur-standard: blur(20px) saturate(180%);
$apple-blur-heavy: blur(40px) saturate(200%);
$apple-blur-ultra: blur(80px) saturate(220%);
$apple-radius-sm: 8px;
$apple-radius-md: 12px;
$apple-radius-lg: 16px;
$apple-radius-xl: 22px;
$apple-radius-pill: 100px;
$apple-timing: cubic-bezier(0.25, 0.1, 0.25, 1);
$apple-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
$apple-duration-fast: 0.15s;
$apple-duration-normal: 0.25s;
$apple-duration-slow: 0.4s;

// Apple Shadow System
@mixin apple-shadow-sm {
  box-shadow:
    0 0.5px 0 0 rgba(255, 255, 255, 0.15) inset,
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.04);
}

@mixin apple-shadow-md {
  box-shadow:
    0 0.5px 0 0 rgba(255, 255, 255, 0.12) inset,
    0 2px 6px rgba(0, 0, 0, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

@mixin apple-shadow-lg {
  box-shadow:
    0 0.5px 0 0 rgba(255, 255, 255, 0.1) inset,
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 16px 48px rgba(0, 0, 0, 0.12);
}

@mixin apple-shadow-elevated {
  box-shadow:
    0 0.5px 0 0 rgba(255, 255, 255, 0.08) inset,
    0 8px 20px rgba(0, 0, 0, 0.12),
    0 24px 64px rgba(0, 0, 0, 0.16);
}

// Apple Vibrancy Material
@mixin apple-vibrancy($opacity: 0.72) {
  background: rgba(var(--v-theme-surface), $opacity);
  backdrop-filter: $apple-blur-standard;
  -webkit-backdrop-filter: $apple-blur-standard;
}

@mixin apple-vibrancy-heavy($opacity: 0.85) {
  background: rgba(var(--v-theme-surface), $opacity);
  backdrop-filter: $apple-blur-heavy;
  -webkit-backdrop-filter: $apple-blur-heavy;
}

// Apple Border
@mixin apple-border($opacity: 0.08) {
  border: 0.5px solid rgba(var(--v-theme-on-surface), $opacity);
}

// Brand Styles
.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.brand-name {
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Manrope', system-ui, sans-serif;
  font-feature-settings: 'ss01' on, 'ss02' on;
}

.brand-super {
  font-weight: 300;
  letter-spacing: -0.01em;
}

.brand-navi {
  font-weight: 600;
  letter-spacing: -0.02em;
}

// Global text contrast fixes for both themes
:deep(.v-app-bar),
:deep(.v-navigation-drawer),
:deep(.v-footer) {
  color: rgb(var(--v-theme-on-surface));
}

// Fix menu and list text colors
:deep(.v-menu .v-list),
:deep(.v-list) {
  color: rgb(var(--v-theme-on-surface));

  .v-list-item {
    color: rgb(var(--v-theme-on-surface));
  }

  .v-list-item-title,
  .v-list-item-subtitle {
    color: rgb(var(--v-theme-on-surface)) !important;
  }
}

// Fix button text colors
:deep(.v-btn) {
  &:not(.v-btn--variant-elevated):not(.v-btn--variant-flat) {
    color: rgb(var(--v-theme-on-surface));
  }
}

/* ========================================
   APPLE-STYLE MOBILE NAVIGATION BAR
   iOS native-feeling header
   ======================================== */
.mobile-header-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 52px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px 0 4px;
  @include apple-vibrancy(0.88);
  border-bottom: 0.5px solid rgba(var(--v-theme-on-surface), 0.1);
  @include apple-shadow-sm;
}

.back-btn-mobile {
  color: rgb(var(--v-theme-primary)) !important;
  flex-shrink: 0;

  :deep(.v-icon) {
    font-size: 22px;
  }
}

.mobile-case-selector {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: $apple-radius-md;
  cursor: pointer;
  transition: all $apple-duration-fast $apple-timing;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: rgba(var(--v-theme-on-surface), 0.08);
    transform: scale(0.98);
  }
}

.mobile-case-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 1px;
}

.mobile-case-name {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-slide-name {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-surface), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}


/* ========================================
   APPLE-STYLE DROPDOWN MENUS
   Native macOS context menu aesthetics
   ======================================== */
.case-actions-dropdown {
  @include apple-vibrancy-heavy(0.92);
  @include apple-border(0.12);
  border-radius: $apple-radius-md;
  @include apple-shadow-elevated;
  min-width: 240px;
  overflow: hidden;
  animation: appleMenuIn 0.18s $apple-spring both;

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 8px;
  }

  .dropdown-title {
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(var(--v-theme-on-surface), 0.45);
  }
}

@keyframes appleMenuIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.case-action-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 14px;
  margin: 2px 6px;
  border-radius: $apple-radius-sm;
  cursor: pointer;
  transition: all $apple-duration-fast $apple-timing;

  span {
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: rgb(var(--v-theme-on-surface));
  }

  .v-icon {
    opacity: 0.7;
    transition: opacity $apple-duration-fast $apple-timing;
  }

  &:hover {
    background: rgba(var(--v-theme-primary), 0.12);

    .v-icon {
      opacity: 0.9;
    }
  }

  &:active {
    background: rgba(var(--v-theme-primary), 0.18);
    transform: scale(0.98);
  }

  &--active {
    background: rgba(var(--v-theme-primary), 0.08);

    span {
      font-weight: 500;
      color: rgb(var(--v-theme-primary));
    }
  }

  &--danger:hover {
    background: rgba(var(--v-theme-error), 0.12);

    span {
      color: rgb(var(--v-theme-error));
    }

    .v-icon {
      color: rgb(var(--v-theme-error)) !important;
    }
  }
}


.slide-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 14px;
  margin: 2px 6px;
  border-radius: $apple-radius-sm;
  cursor: pointer;
  transition: all $apple-duration-fast $apple-timing;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.1);
  }

  &:active {
    background: rgba(var(--v-theme-primary), 0.16);
    transform: scale(0.98);
  }

  &--active {
    background: rgba(var(--v-theme-primary), 0.12);

    .slide-icon {
      opacity: 1;
      color: rgb(var(--v-theme-primary));
    }

    .slide-item-name {
      color: rgb(var(--v-theme-primary));
      font-weight: 600;
    }
  }

  .slide-icon {
    opacity: 0.5;
    flex-shrink: 0;
    transition: all $apple-duration-fast $apple-timing;
  }

  .slide-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 2px;
  }

  .slide-label-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .slide-item-name {
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: rgb(var(--v-theme-on-surface));
    line-height: 1.3;
    transition: all $apple-duration-fast $apple-timing;
  }

  .slide-stain-chip {
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 10px !important;
    font-weight: 500;
    height: 16px !important;
    padding: 0 5px !important;
    color: rgb(var(--v-theme-secondary)) !important;
    opacity: 0.85;
    border-radius: 4px !important;
  }

  .slide-id-text {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 10px;
    color: rgba(var(--v-theme-on-surface), 0.4);
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .slide-stain {
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface), 0.5);
    line-height: 1.2;
  }

  .check-icon {
    flex-shrink: 0;
    color: rgb(var(--v-theme-primary));
  }
}

/* ========================================
   APPLE-STYLE FLOATING TOOLBAR
   macOS Control Center inspired
   ======================================== */

.studio-toolbar {
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1001;

  // Apple vibrancy material
  @include apple-vibrancy(0.68);
  @include apple-border(0.1);
  border-radius: $apple-radius-lg;
  @include apple-shadow-lg;

  padding: 8px;
  width: 56px;

  // Signature inner highlight
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    pointer-events: none;
  }

  transition: all $apple-duration-slow $apple-timing;

  &.toolbar-hidden {
    opacity: 0;
    transform: translateY(-50%) translateX(-16px) scale(0.94);
    pointer-events: none;
  }

  &.toolbar-mobile {
    left: 50%;
    top: auto;
    bottom: 24px;
    transform: translateX(-50%);
    width: auto;
    padding: 6px 12px;
    border-radius: $apple-radius-pill;

    &.toolbar-hidden {
      opacity: 0;
      transform: translateX(-50%) translateY(16px) scale(0.94);
    }
  }
}

.studio-toolbar-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-item {
  animation: appleToolFadeIn $apple-duration-normal $apple-spring backwards;

  @for $i from 1 through 12 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.025}s;
    }
  }
}

@keyframes appleToolFadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.tool-separator {
  height: 1px;
  margin: 6px 10px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(var(--v-theme-on-surface), 0.08) 20%,
    rgba(var(--v-theme-on-surface), 0.08) 80%,
    transparent 100%
  );
}

/* ========================================
   APPLE-STYLE TOOLBAR BUTTON
   SF Symbol-inspired with haptic feedback feel
   ======================================== */
.studio-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: $apple-radius-sm;
  background: transparent;
  cursor: pointer;
  outline: none;
  color: rgba(var(--v-theme-on-surface), 0.6);
  -webkit-tap-highlight-color: transparent;

  transition: all $apple-duration-normal $apple-timing;

  // Hover/active background
  .btn-glow {
    position: absolute;
    inset: 0;
    border-radius: $apple-radius-sm;
    background: transparent;
    transition: all $apple-duration-fast $apple-timing;
  }

  // Icon with Apple-like weight
  .btn-icon {
    position: relative;
    z-index: 1;
    font-size: 20px;
    transition: all $apple-duration-fast $apple-spring;
  }

  // Apple-style tooltip
  .btn-tooltip {
    position: absolute;
    left: 58px;
    white-space: nowrap;
    padding: 6px 10px;
    border-radius: $apple-radius-sm;
    @include apple-vibrancy-heavy(0.95);
    @include apple-border(0.15);
    @include apple-shadow-sm;
    color: rgb(var(--v-theme-on-surface));
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.01em;
    opacity: 0;
    transform: translateX(-6px) scale(0.96);
    pointer-events: none;
    transition: all $apple-duration-fast $apple-spring;
    z-index: 10;
  }

  // Hover State
  &:hover:not(:disabled) {
    color: rgb(var(--v-theme-on-surface));

    .btn-glow {
      background: rgba(var(--v-theme-on-surface), 0.07);
    }

    .btn-icon {
      transform: scale(1.06);
    }

    .btn-tooltip {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  // Active/Selected State - Apple blue highlight
  &.is-active {
    color: rgb(var(--v-theme-primary));

    .btn-glow {
      background: rgba(var(--v-theme-primary), 0.14);
      box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.25);
    }

    .btn-icon {
      transform: scale(1.02);
    }

    &:hover {
      .btn-glow {
        background: rgba(var(--v-theme-primary), 0.18);
      }

      .btn-icon {
        transform: scale(1.08);
      }
    }
  }

  // Press State - haptic feedback simulation
  &:active:not(:disabled) {
    transform: scale(0.92);
    transition-duration: 0.05s;

    .btn-glow {
      background: rgba(var(--v-theme-on-surface), 0.12);
    }
  }

  // Disabled State
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  // Action Buttons (zoom controls)
  &.studio-btn-action:hover:not(:disabled):not(.is-active) {
    color: rgba(var(--v-theme-on-surface), 0.9);

    .btn-glow {
      background: rgba(var(--v-theme-on-surface), 0.08);
    }

    .btn-icon {
      transform: scale(1.1);
    }
  }

  // Back Button - primary accent
  &.studio-btn-back {
    color: rgb(var(--v-theme-primary));

    &:hover {
      .btn-glow {
        background: rgba(var(--v-theme-primary), 0.12);
      }

      .btn-icon {
        transform: translateX(-2px) scale(1.04);
      }
    }
  }

  // Focus Mode Active
  &.studio-btn-focus-active {
    color: rgb(var(--v-theme-primary));

    .btn-glow {
      background: rgba(var(--v-theme-primary), 0.15);
      box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.3);
    }

    &:hover {
      .btn-glow {
        background: rgba(var(--v-theme-primary), 0.2);
        box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.4);
      }

      .btn-icon {
        transform: scale(1.08);
      }
    }
  }
}

/* ========================================
   APPLE-STYLE MOBILE TOOLBAR
   iOS dock-inspired compact controls
   ======================================== */
.studio-toolbar-mobile {
  display: flex;
  align-items: center;
  gap: 4px;
}

.studio-btn-compact {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: none;
  border-radius: $apple-radius-sm;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.65);
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: all $apple-duration-fast $apple-timing;

  :deep(.v-icon) {
    transition: all $apple-duration-fast $apple-spring;
    font-size: 21px;
  }

  &:active:not(:disabled) {
    transform: scale(0.88);
    background: rgba(var(--v-theme-on-surface), 0.08);
  }

  &.is-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.14);

    :deep(.v-icon) {
      transform: scale(1.05);
    }
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  // Focus Mode Active (mobile)
  &.studio-btn-focus-active {
    color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.15);
    box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.25);
  }
}

.compact-sep {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: $apple-radius-pill;
}

// Panel Toggle Button - Apple capsule style
.panel-toggle-btn {
  position: fixed;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  @include apple-vibrancy(0.8);
  @include apple-border(0.12);
  border-radius: $apple-radius-pill !important;
  @include apple-shadow-sm;
  transition: all $apple-duration-normal $apple-spring;

  &:hover {
    transform: translateY(-50%) scale(1.06);
    @include apple-shadow-md;
  }

  &:active {
    transform: translateY(-50%) scale(0.96);
  }
}

// Fullscreen Exit Button
.fullscreen-exit-btn {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 200;
  @include apple-vibrancy(0.85);
  @include apple-shadow-sm;
  border-radius: $apple-radius-sm !important;
  transition: all $apple-duration-fast $apple-timing;

  &:hover {
    transform: scale(1.06);
    @include apple-shadow-md;
  }

  &:active {
    transform: scale(0.94);
  }
}

.viewer-main {
  position: relative;
  overflow: hidden;
  padding-top: 0 !important;
}

.viewer-container {
  width: 100%;
  height: 100%;
  background: #0a0a0a;
  position: relative;
}

/* ========================================
   APPLE-STYLE STATUS BAR
   Refined floating info chip
   ======================================== */

.status-card {
  position: fixed;
  bottom: 12px;
  left: 84px; // Clear of toolbar
  z-index: 100;
  @include apple-vibrancy(0.75);
  @include apple-border(0.12);
  border-radius: $apple-radius-md;
  @include apple-shadow-sm;
  padding: 8px 14px;

  transition: all $apple-duration-normal $apple-timing;
  animation: appleStatusIn $apple-duration-slow $apple-spring backwards;

  &:hover {
    @include apple-shadow-md;
  }

  &.status-card-mobile {
    left: 12px;
    bottom: 70px;
    padding: 6px 10px;
  }
}

@keyframes appleStatusIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.status-content {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;

  &.status-loading {
    color: rgb(var(--v-theme-warning));
  }

  &.status-digital-zoom {
    .status-value {
      color: rgb(var(--v-theme-warning));
    }
    .status-label {
      color: rgb(var(--v-theme-warning));
      opacity: 0.8;
    }
  }

  &.status-coords {
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-variant-numeric: tabular-nums;
  }
}

.status-icon {
  opacity: 0.6;
  flex-shrink: 0;
}

.status-label {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 400;
  font-size: 11px;
  letter-spacing: 0.01em;
}

.status-value {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  letter-spacing: -0.02em;
}

.status-native-mag {
  margin-left: 4px;
  font-size: 10px !important;
  height: 18px !important;
  opacity: 0.7;
}

.status-separator {
  width: 1px;
  height: 14px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  flex-shrink: 0;
}

/* ========================================
   APPLE-STYLE SIDEBAR PANEL
   Native macOS sidebar aesthetics
   ======================================== */

.right-panel {
  @include apple-border(0.08);
  border-right: none;
  border-top: none;
  border-bottom: none;
  position: relative;
  background: rgba(var(--v-theme-surface), 0.92);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);

  &.is-resizing {
    transition: none !important;
    user-select: none;
  }
}

// Panel Resize Handle
.panel-resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover,
  &:active {
    .resize-handle-indicator {
      opacity: 1;
      background: rgb(var(--v-theme-primary));
      height: 64px;
    }
  }
}

.resize-handle-indicator {
  width: 4px;
  height: 40px;
  border-radius: $apple-radius-pill;
  background: rgba(var(--v-theme-on-surface), 0.12);
  opacity: 0;
  transition: all $apple-duration-normal $apple-spring;
}

.right-panel:hover .resize-handle-indicator {
  opacity: 0.4;
}

// Panel tabs row with close button
.panel-tabs-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.panel-tabs-grow {
  flex: 1;
  min-width: 0;
}

.panel-close-btn {
  flex-shrink: 0;
  margin-right: 8px;
  opacity: 0.5;
  transition: opacity $apple-duration-fast $apple-timing;

  &:hover {
    opacity: 1;
  }
}

// Panel Header & Tabs - Apple Segmented Control Style
.panel-header {
  background: transparent;
}

.panel-tabs {
  :deep(.v-tabs) {
    background: transparent;
  }

  :deep(.v-tab) {
    text-transform: none;
    letter-spacing: -0.01em;
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-weight: 500;
    font-size: 13px;
    min-width: 0;
    padding: 0 14px;
    transition: all $apple-duration-fast $apple-timing;

    &:hover:not(.v-tab--selected) {
      background: rgba(var(--v-theme-on-surface), 0.04);
    }

    &.v-tab--selected {
      color: rgb(var(--v-theme-primary));
      font-weight: 600;
    }
  }

  :deep(.v-tab__slider) {
    height: 2.5px;
    border-radius: $apple-radius-pill;
    background: rgb(var(--v-theme-primary));
  }
}

.tab-content-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
}

.tab-label {
  white-space: nowrap;
}

// Panel Content Area
.panel-content {
  height: calc(100vh - 56px - 64px);
  overflow-y: auto;
  overflow-x: hidden;

  // Apple-style scrollbar
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(var(--v-theme-on-surface), 0.15);
    border-radius: $apple-radius-pill;
    border: 2px solid transparent;
    background-clip: padding-box;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.25);
      background-clip: padding-box;
    }
  }
}

.tab-content {
  padding: 16px 20px;
  animation: appleTabIn $apple-duration-normal $apple-timing;
}

@keyframes appleTabIn {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Section Headers - Apple Style */
.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 0.5px solid rgba(var(--v-theme-on-surface), 0.08);
}

/* ========================================
   APPLE-STYLE ANNOTATIONS LIST
   iOS Settings-inspired cards
   ======================================== */

.annotations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.annotation-card {
  background: rgba(var(--v-theme-surface-variant), 0.25);
  @include apple-border(0.08);
  border-radius: $apple-radius-md;
  cursor: pointer;
  transition: all $apple-duration-normal $apple-timing;

  &:hover {
    background: rgba(var(--v-theme-surface-variant), 0.4);
    border-color: rgba(var(--v-theme-primary), 0.15);
    transform: translateY(-1px);
    @include apple-shadow-sm;
  }

  &:active {
    transform: scale(0.99);
    background: rgba(var(--v-theme-primary), 0.08);
  }
}

.annotation-delete-btn {
  opacity: 0;
  transition: all $apple-duration-fast $apple-timing;

  .annotation-card:hover & {
    opacity: 0.7;
  }

  &:hover {
    opacity: 1 !important;
    background: rgba(var(--v-theme-error), 0.12);
    color: rgb(var(--v-theme-error));
  }
}

.empty-state {
  border-radius: $apple-radius-md;
  background: rgba(var(--v-theme-surface-variant), 0.2);
  padding: 24px 16px;
}

/* ========================================
   AI TAB STYLES
   ======================================== */

.ai-feature-card {
  background: rgba(var(--v-theme-surface-variant), 0.2);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.feature-active {
    background: rgba(var(--v-theme-surface-variant), 0.4);
    border-color: rgba(var(--v-theme-primary), 0.15);
    box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.08);
  }

  &:hover {
    background: rgba(var(--v-theme-surface-variant), 0.35);
  }
}

.ai-switch {
  :deep(.v-selection-control__input) {
    transition: transform 0.2s ease;
  }

  &:hover :deep(.v-selection-control__input) {
    transform: scale(1.08);
  }
}

.opacity-control {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========================================
   INFO TAB STYLES
   ======================================== */

.info-panel {
  // No own scroll — the v-navigation-drawer handles it
}

.info-section {
  padding: 16px;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.info-case-name {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.4;
}

.info-slides-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-slide-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
  }

  &--active {
    background: rgba(var(--v-theme-primary), 0.08);
  }
}

.info-slide-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-slide-name {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.info-slide-id {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// User card
.info-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.info-user-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-user-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-user-role {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

// Patient data
.info-patient-data {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  align-items: baseline;
}

.info-patient-row {
  display: contents;
  font-size: 13px;
  line-height: 1.4;
}

.info-patient-label {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  min-width: 60px;
  flex-shrink: 0;
}

.info-patient-value {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

// Access log
.info-access-log {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-log-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.info-log-text {
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-log-time {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  flex-shrink: 0;
}

// Slide select & single
.info-slide-select {
  :deep(.v-field) {
    border-radius: 8px;
    font-size: 13px;
  }
}

.info-slide-single {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.details-card {
  background: rgba(var(--v-theme-surface-variant), 0.2);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 10px;
  overflow: hidden;
}

.detail-item {
  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.02);
  }
}

.detail-row {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.2s ease;
}

.detail-label {
  display: flex;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
}

.detail-value {
  color: rgb(var(--v-theme-on-surface));
  word-break: break-word;
}

/* ========================================
   RESPONSIVE ADJUSTMENTS
   ======================================== */

@media (max-width: 960px) {
  .panel-toggle-btn {
    display: none; // Hide on mobile, use topbar button instead
  }

  .studio-toolbar {
    &.toolbar-mobile {
      bottom: 70px; // Above status card on mobile
    }
  }

  .status-card {
    font-size: 11px;

    .status-content {
      gap: 8px;
    }

    .status-value {
      font-size: 11px;
    }
  }

  // Right Panel mobile adjustments
  .tab-content {
    padding: 16px;
  }

  .panel-content {
    height: calc(100vh - 56px - 48px); // Adjusted for mobile tabs
  }

  .section-header {
    margin-bottom: 12px;
    padding-bottom: 10px;
  }

  .annotation-card,
  .layer-card,
  .ai-feature-card,
  .opacity-card,
  .details-card {
    border-radius: 8px;
  }
}

@media (max-width: 600px) {
  .status-card {
    padding: 6px 10px !important;
    font-size: 10px;

    .status-icon {
      font-size: 14px !important;
    }

    .status-value {
      font-size: 10px;
    }
  }

  .studio-toolbar {
    &.toolbar-mobile {
      bottom: 60px; // Adjust for smaller mobile
    }
  }
}

/* ========================================
   ANNOTATIONS & DISCUSSION SYSTEM
   Professional collaborative pathology UI
   ======================================== */

/* Annotations Panel */
.annotations-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-section-header {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.new-roi-btn {
  text-transform: none;
  letter-spacing: 0;
}

.annotations-scroll {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
}

/* ROI Cards */
.roi-card {
  display: flex;
  background: rgba(var(--v-theme-surface-variant), 0.2);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(var(--v-theme-surface-variant), 0.4);
    border-color: rgba(var(--v-theme-primary), 0.2);
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  &.has-unread {
    border-left: 3px solid rgb(var(--v-theme-error));

    .roi-color-indicator {
      display: none;
    }
  }

  &.is-resolved {
    opacity: 0.7;
    background: rgba(var(--v-theme-success), 0.08);
    border-color: rgba(var(--v-theme-success), 0.2);

    .roi-name {
      text-decoration: line-through;
      opacity: 0.7;
    }

    &:hover {
      opacity: 1;
    }
  }
}

.roi-color-indicator {
  width: 4px;
  flex-shrink: 0;
}

.roi-content {
  flex: 1;
  padding: 12px;
  min-width: 0;
}

.roi-name {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priority-chip {
  min-width: 20px;
  font-weight: 700;
}

.participants-avatars {
  display: flex;
  align-items: center;
}

.participant-avatar {
  border: 2px solid rgb(var(--v-theme-surface));
  font-size: 10px;
}

.last-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.message-preview {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-time {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  flex-shrink: 0;
}

/* Empty State */
.empty-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 24px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 240px;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon {
  opacity: 0.6;
}

/* Discussion Panel */
.discussion-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
}

.discussion-header {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.roi-indicator {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.editable-name {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.08);

    .edit-icon {
      opacity: 1;
    }
  }

  .edit-icon {
    opacity: 0;
    transition: opacity 0.15s ease;
    color: rgba(var(--v-theme-on-surface), 0.5);
  }
}

.annotation-name-input {
  font-size: 0.875rem;
  font-weight: 500;
  margin: -4px 0;

  :deep(.v-field__input) {
    padding: 0;
    min-height: unset;
    font-size: 0.875rem;
    font-weight: 500;
  }

  :deep(.v-field) {
    padding: 0;
  }
}

.participants-bar {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.04);
}

.participant-chip {
  font-size: 11px;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.messages-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Message Item - New Design */
.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  position: relative;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.03);

    .message-actions {
      opacity: 1;
    }
  }

  &.message-own {
    .message-author-name {
      color: rgb(var(--v-theme-primary));
    }
  }
}

.message-avatar {
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .avatar-letter {
    font-size: 14px;
    font-weight: 600;
    color: white;
  }
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
}

.message-author-name {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.2;
}

.message-datetime {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  white-space: nowrap;
}

.message-text {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.85);
  word-wrap: break-word;
}

.message-edited-badge {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
  margin-left: 4px;
}

/* Message Actions */
.message-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message-menu-btn {
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.08);
  }
}

.message-actions-menu {
  min-width: 140px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  .v-list-item {
    min-height: 40px;
    font-size: 13px;
  }
}

/* ========================================
   Apple-like Context Menu
   ======================================== */
:deep(.apple-context-menu) {
  min-width: 200px !important;
  padding: 4px !important;
  border-radius: 12px !important;
  background: rgba(var(--v-theme-surface), 0.82) !important;
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow:
    0 0 0 0.5px rgba(var(--v-theme-on-surface), 0.08),
    0 8px 40px rgba(0, 0, 0, 0.22),
    0 2px 8px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden;

  .v-list-item {
    min-height: 34px !important;
    padding: 0 10px !important;
    margin: 1px 0;
    border-radius: 7px !important;
    font-size: 13px;
    letter-spacing: -0.01em;
    color: rgb(var(--v-theme-on-surface));
    transition: background 0.12s ease;

    &:hover {
      background: rgba(var(--v-theme-primary), 0.12) !important;
    }

    .v-list-item__prepend {
      .v-icon {
        font-size: 18px !important;
        opacity: 0.72;
        margin-inline-end: 10px;
      }
    }

    .v-list-item-title {
      font-size: 13px !important;
      font-weight: 400;
      letter-spacing: -0.01em;
    }
  }

  .apple-menu-divider {
    height: 1px;
    margin: 4px 10px;
    background: rgba(var(--v-theme-on-surface), 0.1);
  }

  .apple-menu-destructive {
    color: rgb(var(--v-theme-error)) !important;

    .v-list-item-title {
      color: rgb(var(--v-theme-error)) !important;
    }

    .v-list-item__prepend .v-icon {
      color: rgb(var(--v-theme-error)) !important;
      opacity: 0.9;
    }

    &:hover {
      background: rgba(var(--v-theme-error), 0.1) !important;
    }
  }
}

/* Message Edit */
.message-edit-container {
  margin-top: 4px;
}

.message-edit-input {
  :deep(.v-field) {
    border-radius: 10px;
  }

  :deep(.v-field__input) {
    font-size: 14px;
    line-height: 1.5;
  }
}

.message-edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}

/* Messages Empty State */
.messages-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

/* Delete Dialog */
.delete-message-dialog {
  border-radius: 16px;
}

/* System Message */
.system-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 20px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 8px auto;
}

.ai-badge {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-secondary), 0.2);
  color: rgb(var(--v-theme-secondary));
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.message-content {
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
  word-wrap: break-word;
}

/* AI Findings Card */
.ai-findings-card {
  margin-top: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-secondary), 0.15);
}

.confidence-bar {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.confidence-value {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-secondary));
}

.findings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finding-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.finding-label {
  display: flex;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.finding-value {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.4;
}

/* Typing Indicator */
.typing-bubble {
  min-width: 80px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(var(--v-theme-secondary), 0.6);
    animation: typingBounce 1.4s ease-in-out infinite;

    &:nth-child(1) {
      animation-delay: 0s;
    }

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typingBounce {

  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.6;
  }

  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* Animations */
.roi-card {
  animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;

  @for $i from 1 through 10 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.05}s;
    }
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.message-wrapper {
  animation: messageSlideIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .discussion-panel {
    height: calc(100vh - 100px);
  }

  .messages-scroll {
    padding: 12px;
  }

  .message-bubble {
    max-width: 92%;
    padding: 8px 12px;
  }

  .ai-findings-card {
    padding: 10px;
  }
}

/* ===========================================
   AI CASE CHAT PANEL
   =========================================== */

.ai-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 56px);
  padding: 24px;
  background: rgb(var(--v-theme-surface));
}

.mobile-ai-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 56px);
  background: rgb(var(--v-theme-surface));
}

.ai-chat-header {
  flex-shrink: 0;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.ai-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-success));
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.case-context-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.04);
}

.context-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.context-divider {
  width: 1px;
  height: 12px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.ai-messages-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.ai-messages-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-welcome-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
  text-align: center;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(var(--v-theme-secondary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.ai-case-message-wrapper {
  display: flex;
  flex-direction: column;
  animation: messageSlideIn 0.3s ease-out;
}

.ai-case-message-wrapper.message-own {
  align-items: flex-end;
}

.ai-case-message {
  max-width: 90%;
  padding: 12px 16px;
  border-radius: 4px;
}

.ai-case-message.ai-message {
  background: rgba(var(--v-theme-secondary), 0.08);
  border: 1px solid rgba(var(--v-theme-secondary), 0.12);
  border-radius: 4px 4px 4px 0;
}

.ai-case-message.user-message {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
  border-radius: 4px 4px 0 4px;
}

.ai-case-message .message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ai-case-message .author-name {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.ai-badge-minimal {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  background: rgba(var(--v-theme-secondary), 0.15);
  color: rgb(var(--v-theme-secondary));
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ai-case-message .message-body {
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}

.ai-case-message .message-timestamp {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-top: 8px;
  text-align: right;
}

.ai-case-findings {
  margin-top: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-secondary), 0.1);
}

.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.confidence-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.confidence-bar-container {
  flex: 1;
  height: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-bar-fill {
  height: 100%;
  background: rgb(var(--v-theme-secondary));
  border-radius: 2px;
  transition: width 0.5s ease-out;
}

.confidence-indicator .confidence-value {
  font-size: 11px;
  font-weight: 700;
  color: rgb(var(--v-theme-secondary));
  min-width: 32px;
  text-align: right;
}

.findings-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finding-item-minimal {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.finding-label-minimal {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.finding-value-minimal {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  line-height: 1.4;
}

.ai-typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(var(--v-theme-secondary), 0.5);
    animation: typingBounce 1.4s ease-in-out infinite;

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

/* AI Chat Input - Square, Minimalist Design */
.ai-chat-input-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.ai-chat-input {
  flex: 1;

  :deep(.v-field) {
    border-radius: 4px;
    font-size: 13px;
    background: rgba(var(--v-theme-surface-variant), 0.3);
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  }

  :deep(.v-field:hover) {
    border-color: rgba(var(--v-theme-on-surface), 0.15);
    background: rgba(var(--v-theme-surface-variant), 0.4);
  }

  :deep(.v-field--focused) {
    border-color: rgba(var(--v-theme-secondary), 0.4);
    background: rgba(var(--v-theme-surface), 0.9);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-secondary), 0.08);
  }

  :deep(.v-field__outline) {
    display: none;
  }

  :deep(.v-field__input) {
    padding: 12px 14px;
    min-height: 44px;
  }

  :deep(.v-field__input::placeholder) {
    color: rgba(var(--v-theme-on-surface), 0.35);
  }
}

.ai-send-btn {
  flex-shrink: 0;
  border-radius: 4px !important;
  height: 44px !important;
  width: 44px !important;
}

/* Responsive adjustments for AI Chat */
@media (max-width: 600px) {
  .ai-chat-panel {
    height: calc(100vh - 100px);
  }

  .ai-messages-scroll {
    padding: 12px;
  }

  .ai-case-message {
    max-width: 95%;
    padding: 10px 12px;
  }

  .ai-chat-input-container {
    padding: 12px;
  }
}


/* Mobile Case Dropdown */
.mobile-case-dropdown {
  min-width: 280px;
  max-width: 320px;
  background: rgba(var(--v-theme-surface), 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;
  }

  .dropdown-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(var(--v-theme-on-surface), 0.5);
  }

  .slide-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.12s ease;

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);
    }

    &--active {
      background: rgba(var(--v-theme-primary), 0.06);
    }

    .slide-info {
      flex: 1;
      min-width: 0;

      .slide-label-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .slide-item-name {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: rgb(var(--v-theme-on-surface));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .slide-stain-chip {
        font-size: 10px !important;
        font-weight: 500;
        height: 16px !important;
        padding: 0 4px !important;
        color: rgb(var(--v-theme-secondary)) !important;
        opacity: 0.8;
      }

      .slide-id-text {
        display: block;
        font-size: 10px;
        color: rgba(var(--v-theme-on-surface), 0.4);
        font-family: 'Roboto Mono', monospace;
        letter-spacing: -0.3px;
      }

      .slide-stain {
        display: block;
        font-size: 11px;
        color: rgba(var(--v-theme-on-surface), 0.6);
      }
    }
  }

  .case-action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.12s ease;

    span {
      font-size: 13px;
      color: rgb(var(--v-theme-on-surface));
    }

    &:hover {
      background: rgba(var(--v-theme-on-surface), 0.04);
    }

    &--active {
      background: rgba(var(--v-theme-primary), 0.06);

      span {
        font-weight: 500;
      }
    }

    &--danger:hover {
      background: rgba(var(--v-theme-error), 0.08);

      span {
        color: rgb(var(--v-theme-error));
      }
    }
  }
}

.mobile-slides-scroll {
  max-height: 150px;
  overflow-y: auto;
}

.mobile-case-status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

/* ===========================================
   INVITE PATHOLOGIST DIALOG
   =========================================== */

.invite-tabs {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pathologist-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
}

.pathologist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(var(--v-theme-on-surface), 0.04);
  }

  &--selected {
    background: rgba(var(--v-theme-primary), 0.08);

    &:hover {
      background: rgba(var(--v-theme-primary), 0.12);
    }
  }
}

.pathologist-info {
  flex: 1;
  min-width: 0;
}

.pathologist-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pathologist-specialty {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
}

/* ===========================================
   CASE SEARCH DIALOG
   =========================================== */

.case-search-card {
  border-radius: 12px !important;
  overflow: hidden;
}

.case-search-input {
  :deep(.v-field) {
    border-radius: 8px;
  }
}

.case-search-results {
  max-height: 400px;
  overflow-y: auto;
}

.case-result-item {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }

  &:last-child {
    border-bottom: none;
  }
}

.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

/* ===========================================
   MOBILE UI COMPONENTS
   =========================================== */

.viewer-main-mobile {
  padding-top: 56px !important; /* Space for mobile header bar */
  padding-bottom: 56px !important; /* Space for bottom nav */
}

/* ========================================
   APPLE-STYLE MOBILE TAB BAR
   iOS Tab Bar aesthetics
   ======================================== */
.mobile-bottom-nav {
  @include apple-vibrancy(0.9);
  border-top: 0.5px solid rgba(var(--v-theme-on-surface), 0.1);
  @include apple-shadow-sm;
  overflow: visible !important;

  :deep(.v-bottom-navigation__content) {
    overflow: visible !important;
  }

  :deep(.v-btn) {
    overflow: visible !important;
    font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 10px;
    letter-spacing: 0;
    transition: all $apple-duration-fast $apple-timing;

    &:active {
      transform: scale(0.92);
    }

    .v-icon {
      font-size: 24px;
      margin-bottom: 2px;
    }
  }

  :deep(.v-badge) {
    overflow: visible !important;
  }
}

/* Apple-Style Bottom Sheets */
.mobile-panel-sheet {
  z-index: 2000 !important;
}

.mobile-panel-card {
  border-radius: $apple-radius-xl $apple-radius-xl 0 0 !important;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  @include apple-vibrancy-heavy(0.96);
}

.sheet-handle {
  padding: 10px 0 6px;
  display: flex;
  justify-content: center;
}

.handle-bar {
  width: 36px;
  height: 5px;
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: $apple-radius-pill;
}

.mobile-panel-content {
  flex: 1;
  overflow-y: auto;
  max-height: calc(70vh - 100px);
}

/* Mobile Annotations List */
.mobile-annotations-list {
  min-height: 200px;
}

.mobile-roi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:active {
    background: rgba(var(--v-theme-primary), 0.1);
  }
}

.roi-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  flex-shrink: 0;
}

.roi-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.roi-name {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.roi-status {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.mobile-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

/* Mobile Discussion */
.mobile-discussion {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mobile-discussion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.mobile-roi-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.mobile-roi-name-container {
  flex: 1;
  min-width: 0;
}

.mobile-roi-name-input {
  :deep(.v-field) {
    font-size: 14px;
    font-weight: 500;
  }

  :deep(.v-field__input) {
    padding: 4px 0;
    min-height: 28px;
  }
}

.mobile-roi-name-editable {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover,
  &:active {
    background: rgba(var(--v-theme-on-surface), 0.08);
  }

  .v-icon {
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }

  &:hover .v-icon,
  &:active .v-icon {
    opacity: 1;
  }
}

.mobile-messages {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.mobile-messages-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 60px;
}

.mobile-message {
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 85%;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  align-self: flex-start;

  &.own {
    background: rgba(var(--v-theme-primary), 0.15);
    align-self: flex-end;
  }

  &.ai {
    background: rgba(var(--v-theme-secondary), 0.12);
    border-left: 3px solid rgb(var(--v-theme-secondary));
  }
}

.mobile-message-author {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.mobile-author-name {
  font-size: 11px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
}

.message-text {
  font-size: 13px;
  line-height: 1.4;
}

.mobile-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  background: rgb(var(--v-theme-surface));
}

.mobile-message-input {
  flex: 1;

  :deep(.v-field) {
    border-radius: 20px;
    font-size: 14px;
  }

  :deep(.v-field__input) {
    padding: 8px 14px;
    min-height: 38px;
  }
}

/* Mobile AI Chat */
.mobile-ai-chat {
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.mobile-ai-messages {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

/* Mobile Details */
.mobile-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);

  &:last-child {
    border-bottom: none;
  }
}

.detail-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

/* Mobile Tools Grid */
.mobile-tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.mobile-tools-grid .v-btn {
  height: 70px !important;
  border-radius: 12px !important;
}

/* Mobile Status Card */
.status-card-mobile {
  left: 12px !important;
  right: auto !important;
  bottom: 68px !important;
  padding: 6px 10px !important;

  .status-content {
    gap: 6px;
  }

  .status-value {
    font-size: 12px;
  }
}

/* Mobile Focus Exit Button */
.mobile-focus-exit-btn {
  position: fixed !important;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 0 20px !important;
}

</style>

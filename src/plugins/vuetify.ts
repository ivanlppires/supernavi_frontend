/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify, type ThemeDefinition } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'

// Apple-like Color Palette for Medical/Pathology
const medicalLightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    'primary': '#007AFF', // Apple blue
    'secondary': '#5856D6', // Apple purple
    'accent': '#34C759', // Apple green
    'error': '#FF3B30', // Apple red
    'warning': '#FF9500', // Apple orange
    'info': '#5AC8FA', // Apple light blue
    'success': '#34C759', // Apple green
    'background': '#F2F2F7', // Apple light gray
    'surface': '#FFFFFF', // Pure white surface
    'surface-variant': '#E5E5EA', // Apple gray 5
    'surface-bright': '#FFFFFF',
    'on-surface': '#1C1C1E', // Apple label
    'on-surface-variant': '#8E8E93', // Apple secondary label
    'on-background': '#1C1C1E', // Apple label
    'on-primary': '#FFFFFF', // White text on primary
    'on-secondary': '#FFFFFF', // White text on secondary
    'on-accent': '#FFFFFF', // White text on accent
    'on-error': '#FFFFFF',
    'on-warning': '#FFFFFF',
    'on-info': '#000000',
    'on-success': '#FFFFFF',
  },
}

const medicalDarkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    'primary': '#0A84FF', // Apple blue (dark)
    'secondary': '#5E5CE6', // Apple purple (dark)
    'accent': '#30D158', // Apple green (dark)
    'error': '#FF453A', // Apple red (dark)
    'warning': '#FF9F0A', // Apple orange (dark)
    'info': '#64D2FF', // Apple light blue (dark)
    'success': '#30D158', // Apple green (dark)
    'background': '#000000', // Pure black
    'surface': '#1C1C1E', // Apple elevated surface
    'surface-variant': '#2C2C2E', // Apple secondary surface
    'surface-bright': '#2C2C2E',
    'on-surface': '#FFFFFF', // White text
    'on-surface-variant': '#8E8E93', // Apple secondary label (dark)
    'on-background': '#FFFFFF', // White text on background
    'on-primary': '#FFFFFF', // White text on primary
    'on-secondary': '#FFFFFF', // White text on secondary
    'on-accent': '#FFFFFF', // White text on accent
    'on-error': '#FFFFFF',
    'on-warning': '#000000',
    'on-info': '#000000',
    'on-success': '#FFFFFF',
  },
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'medicalLight',
    themes: {
      medicalLight: medicalLightTheme,
      medicalDark: medicalDarkTheme,
    },
    variations: {
      colors: ['primary', 'secondary', 'accent'],
      lighten: 2,
      darken: 2,
    },
  },
  defaults: {
    VBtn: {
      style: 'text-transform: none;', // Remove ALL CAPS
      rounded: 'lg',
    },
    VCard: {
      rounded: 'lg',
      elevation: 2,
    },
    VSheet: {
      rounded: 'lg',
    },
    VTextField: {
      rounded: 'lg',
    },
    VAutocomplete: {
      rounded: 'lg',
    },
  },
})

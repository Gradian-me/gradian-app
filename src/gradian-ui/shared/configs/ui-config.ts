// UI Configuration

export interface UIConfig {
  HOME_URL: string;
  CARD_INDEX_DELAY: {
    STEP: number;
    MAX: number;
    SKELETON_MAX: number;
  };
}

/**
 * Unified form input base classes: height, background, border, disabled, focus, and text/placeholder.
 * Use this (or baseInputClasses from field-styles) for all text-like inputs for consistent appearance.
 */
export const FORM_INPUT_BASE_CLASSES =
  'w-full min-h-11 direction-auto leading-relaxed px-3 py-2.5 border rounded-lg border-gray-300 bg-white text-xs text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-300 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300';

/**
 * Same style idea as form inputs but for textarea: no min-height (use rows), same border/bg/disabled/focus.
 */
export const FORM_TEXTAREA_BASE_CLASSES =
  'w-full direction-auto leading-relaxed px-3 py-2 border rounded-lg border-gray-300 bg-white text-xs text-gray-900 ring-offset-background placeholder:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-300 dark:placeholder:text-gray-400 dark:ring-offset-gray-900 dark:focus-visible:ring-violet-500 dark:focus-visible:border-violet-500 dark:disabled:bg-gray-800/30 dark:disabled:text-gray-300';

/**
 * Select/combobox trigger: same border, bg, disabled, focus ring as inputs, plus open state and cursor.
 */
export const FORM_SELECT_TRIGGER_BASE_CLASSES =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white text-xs text-gray-900 dark:bg-gray-900/60 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 ring-offset-background dark:ring-offset-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-violet-300 dark:focus:ring-violet-500 focus:ring-offset-1 focus:border-violet-400 dark:focus:border-violet-500 data-[state=open]:outline-none data-[state=open]:ring-1 data-[state=open]:ring-violet-300 dark:data-[state=open]:ring-violet-500 data-[state=open]:ring-offset-1 data-[state=open]:border-violet-400 dark:data-[state=open]:border-violet-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800/30 disabled:text-gray-500 dark:disabled:text-gray-300';

/**
 * Shared disabled state for form controls (Toggle, ToggleGroup, etc.) – same idea as input disabled.
 */
export const FORM_FIELD_DISABLED_CLASSES =
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none';

/**
 * Form container with same border radius and border style as TextInput, but alternate (muted) background.
 * Use for ToggleGroup, PopupPicker list area, and similar form-like containers.
 */
export const FORM_CONTAINER_ALT_BG_CLASSES =
  'rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-300 ring-offset-background transition-colors';

// Default UI configuration
const defaultUIConfig: UIConfig = {
  HOME_URL: '/apps',
  CARD_INDEX_DELAY: {
    STEP: 0.05,
    MAX: 0.4,
    SKELETON_MAX: 0.25,
  },
};

// Load configuration (can be extended with environment variable overrides if needed)
function loadUIConfig(): UIConfig {
  return { ...defaultUIConfig };
}

export const UI_PARAMS = loadUIConfig();

// Common URLs (derived from UI_PARAMS)
export const URL_HOME: string = UI_PARAMS.HOME_URL;


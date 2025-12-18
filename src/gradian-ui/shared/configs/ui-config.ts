// UI Configuration

export interface UIConfig {
  HOME_URL: string;
  CARD_INDEX_DELAY: {
    STEP: number;
    MAX: number;
    SKELETON_MAX: number;
  };
}

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


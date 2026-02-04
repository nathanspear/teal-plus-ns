/**
 * Configuration constants for Teal+ Extension
 */

export const SECTION_IDS = [
  'skills', 
  'interests', 
  'certifications', 
  'memberships', 
  'membership',
  'projects', 
  'activities', 
  'publications',
  'software',
  'software-tools',
  'tools',
  'career-highlights',
  'highlights',
  'technical-skills',
  'languages',
  'frameworks'
];

// Alternate IDs Teal may use (e.g. singular form or with UUID suffix)
export const SECTION_ID_ALIASES = {
  certifications: ['certification'],
  memberships: ['membership'],
  activities: ['activity'],
  publications: ['publication'],
  interests: ['interest'],
  languages: ['language'],
  frameworks: ['framework'],
  projects: ['project'],
  skills: ['skill']
};

export const EXTRA_IDS = [
  'education-additional-information-994ca3e3-8454-4f8a-bcfa-54727b6ca182'
];

// Timing configuration
export const TIMING = {
  CLICK_WAIT: 10,              // ms after each click
  YIELD_EVERY: 25,             // yield to browser frequently
  YIELD_MS: 10,                // ms yield duration
  WAIT_SETTLE: 150,            // ms to wait and verify checkbox state changed
  BATCH_SIZE: 5,               // batch size for reliability
  PROGRESS_UPDATE_INTERVAL: 25, // update progress every N checkboxes
  ACCORDION_WAIT: 500,         // ms to wait for accordion to fully open
  CONTENT_SETTLE_WAIT: 400,    // ms to wait for content to settle after opening
  LAZY_LOAD_WAIT: 500,         // ms to wait for lazy-loaded content
  SECTION_PAUSE: 1000          // ms to pause between sections
};

// Licensing configuration (ns version: unlimited use, no trial limit)
export const LICENSE = {
  KEY: 'TEAL_PREMIUM_2025',
  TRIAL_LIMIT: Infinity
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 4.99,
    monthly: true,
    features: [
      '8,000 checkboxes unselected',
      'Basic filtering options',
      'Email support',
      'Standard processing speed'
    ],
    color: '#14b8a6',
    maxCheckboxes: 8000
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    monthly: true,
    features: [
      'Unlimited checkboxes',
      'Advanced filtering & targeting',
      'Export to CSV/JSON',
      'Priority processing speed',
      'Priority support',
      'Custom section targeting',
      'Bulk operations'
    ],
    color: '#8b5cf6',
    maxCheckboxes: Infinity
  }
};

// Default settings
export const DEFAULT_SETTINGS = {
  autoSave: true,
  showProgress: true,
  enableKeyboardShortcuts: true,
  enableRightClick: true,
  customSections: [],
  preserveSelected: [],
  excludeSections: [],
  theme: 'auto',
  language: 'en'
};


/**
 * Timeline Monitor Configuration
 * Centralized configuration for Timeline Monitor features
 */

export const TIMELINE_CONFIG = {
  /** Zoom level settings */
  ZOOM: {
    MIN: 0,
    MAX: 2,
    DEFAULT: 0,
    LEVELS: ['month', 'day', 'time'] as const,
    LABELS: ['Month', 'Day', 'Time'],
  },

  /** Column count for each zoom level */
  COLUMNS: {
    MONTH: 31,
    DAY: 24,
    TIME: 60,
  },

  /** Styling constants */
  STYLES: {
    STAFF_LIST_WIDTH: {
      MOBILE: 140,
      DESKTOP: 200,
    },
    ROW_HEIGHT: 56,
    BAR_HEIGHT: {
      MOBILE: 20,
      DESKTOP: 24,
    },
    COLUMN_WIDTH: {
      MONTH: { MIN: 28, DESKTOP_MIN: 36 },
      DAY: { MIN: 35, DESKTOP_MIN: 50 },
      TIME: { MIN: 10, DESKTOP_MIN: 12 },
    },
  },

  /** Color scheme */
  COLORS: {
    ACTIVE: '#10b981',
    ACTIVE_LIGHT: '#34d399',
    COMPLETED: '#6366f1',
    COMPLETED_LIGHT: '#818cf8',
    WEEKEND: '#fce7f3',
    WEEKEND_DARK: '#fce7f3',
  },

  /** Animation durations (ms) */
  ANIMATION: {
    TRANSITION: 300,
    DELAY_PER_ITEM: 50,
  },

  /** API endpoints */
  API: {
    USERS: '/api/users?role=leader',
    ATTENDANCE: '/api/attendance',
  },

  /** Pusher channels */
  PUSHER: {
    USERS_CHANNEL: 'users',
    ATTENDANCE_EVENT: 'leader-attendance',
    DRIVER_UPDATED_EVENT: 'driver-updated',
  },

  /** Display settings */
  DISPLAY: {
    HISTORY_RECORDS_COUNT: 12,
    DEFAULT_PAGE_SIZE: 50,
  },
} as const;

export type ZoomLevel = typeof TIMELINE_CONFIG.ZOOM.LEVELS[number];

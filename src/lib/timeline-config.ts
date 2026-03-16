/**
 * Timeline Monitor Configuration
 * Centralized configuration for Timeline Monitor features
 */

export const TIMELINE_CONFIG = {
  /** Zoom level settings */
  ZOOM: {
    MIN: 0,
    MAX: 3,
    DEFAULT: 2,
    LEVELS: ['month', 'week', 'day', 'hour'] as const,
    LABELS: ['Month', 'Week', 'Day', 'Hour'],
  },

  /** Column count for each zoom level */
  COLUMNS: {
    MONTH: 31,
    DAY: 24,
    HOUR: 60,
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
      HOUR: { MIN: 10, DESKTOP_MIN: 12 },
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

  /** Scale for continuous timeline (pixels per minute) */
  SCALE: {
    MONTH: 0.05, // 1h = 3px, 1d = 72px
    WEEK: 0.15,  // 1h = 9px, 1d = 216px
    DAY: 1.0,    // 1h = 60px, 1d = 1440px
    HOUR: 4.0,   // 1h = 240px
  },

  /** Animation durations (ms) */
  ANIMATION: {
    TRANSITION: 300,
    DELAY_PER_ITEM: 50,
  },

  /** API endpoints */
  API: {
    USERS: '/api/users?activeOnly=true',
    ATTENDANCE: '/api/attendance',
  },

  /** Pusher channels */
  PUSHER: {
    USERS_CHANNEL: 'users',
    ATTENDANCE_EVENT: 'leader-attendance',
    DRIVER_UPDATED_EVENT: 'driver-updated',
  },

  /** Expected work schedule (for monitoring compliance) */
  SCHEDULE: {
    EXPECTED_START: 8,  // 08:00
    EXPECTED_END: 17,   // 17:00
    LATE_THRESHOLD_MINUTES: 15, // late if > 15 min after expected start
  },

  /** Display settings */
  DISPLAY: {
    HISTORY_RECORDS_COUNT: 12,
    DEFAULT_PAGE_SIZE: 50,
  },
} as const;

export type ZoomLevel = typeof TIMELINE_CONFIG.ZOOM.LEVELS[number];

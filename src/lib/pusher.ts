import Pusher from 'pusher';

export const pusher = new Pusher({
  appId: (process.env.PUSHER_APP_ID || '').trim(),
  key: (process.env.PUSHER_KEY || '').trim(),
  secret: (process.env.PUSHER_SECRET || '').trim(),
  cluster: (process.env.PUSHER_CLUSTER || 'ap1').trim(),
  useTLS: true,
});

export const CHANNELS = {
  CAR_WASH: 'car-wash-feed',
  LEAVE_REQUESTS: 'leave-requests',
  USERS: 'users',
  TASKS: 'tasks',
  DASHBOARD: 'dashboard',
  BRANCHES: 'branches',
};

export const EVENTS = {
  // Car-wash / Moments
  NEW_ACTIVITY: 'new-activity',
  UPDATE_ACTIVITY: 'update-activity',
  DELETE_ACTIVITY: 'delete-activity',
  // Leave
  NEW_LEAVE: 'new-leave-request',
  LEAVE_STATUS_CHANGED: 'leave-status-changed',
  LEAVE_CANCELLED: 'leave-cancelled',
  // Users / Drivers
  DRIVER_ACTIVATED: 'driver-activated',
  DRIVER_UPDATED: 'driver-updated',
  DRIVER_DELETED: 'driver-deleted',
  NEW_DRIVER: 'new-driver',
  // Tasks
  NEW_TASK: 'new-task',
  TASK_UPDATED: 'task-updated',
  TASK_DELETED: 'task-deleted',
  TASK_SUBMITTED: 'task-submitted',
  // Branches
  BRANCH_UPDATED: 'branch-updated',
  BRANCH_CREATED: 'branch-created',
  BRANCH_DELETED: 'branch-deleted',
};

/** Fire-and-forget Pusher trigger — never throws */
export async function triggerPusher(channel: string, event: string, data: Record<string, unknown>) {
  try {
    await pusher.trigger(channel, event, data);
  } catch (err) {
    console.error(`Pusher trigger error [${channel}/${event}]:`, err);
  }
}

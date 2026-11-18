// The pg-boss queue whose scheduled job sends the due birthday notifications.
export const NOTIFICATIONS_QUEUE = 'birthday-notifications';
// Every 15 minutes: a user is due during their chosen local hour and the next one, so they hear within 15 minutes.
export const NOTIFICATIONS_SCHEDULE = '*/15 * * * *';

import { ReminderSettingsDto } from './reminder-settings.dto';

// What a device sends when notifications are turned on; existing settings keep their days and hour.
export type ReminderDevicePreferencesRequest = Pick<ReminderSettingsDto, 'timeZone' | 'locale'>;

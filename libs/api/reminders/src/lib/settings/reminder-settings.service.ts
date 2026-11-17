import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import { AppLocale, ReminderDays, ReminderDevicePreferencesRequest, ReminderSettingsDto } from '@birthday/shared-models';
import { DATABASE, Database, notificationSettings } from '@birthday/api-database';
import { TIME_ZONE_MESSAGE } from '../schemas';

const SETTINGS_COLUMNS = {
  remindOnDay: notificationSettings.remindOnDay,
  remindDayBefore: notificationSettings.remindDayBefore,
  hour: notificationSettings.hour,
  timeZone: notificationSettings.timeZone,
  locale: notificationSettings.locale,
};

const TIME_ZONE_CHECK = 'notification_settings_time_zone_check';

type SettingsRow = { remindOnDay: boolean; remindDayBefore: boolean; hour: number; timeZone: string; locale: AppLocale };

// One settings row per user; every query is limited to the signed-in user.
@Injectable()
export class ReminderSettingsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // `null` when the user has never turned notifications on.
  public async get(userId: string): Promise<ReminderSettingsDto | null> {
    const [row] = await this.db.select(SETTINGS_COLUMNS).from(notificationSettings).where(eq(notificationSettings.userId, userId));

    return row ? toDto(row) : null;
  }

  public async save(userId: string, settings: ReminderSettingsDto): Promise<ReminderSettingsDto> {
    const values = toRow(settings);
    const [row] = await this.db
      .insert(notificationSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: notificationSettings.userId, set: values })
      .returning(SETTINGS_COLUMNS)
      .catch(rejectUnknownTimeZone);

    return toDto(row);
  }

  // Creates the settings with the default days and hour, or keeps them; either way stores this device's time zone and
  // language.
  public async saveDevicePreferences(userId: string, preferences: ReminderDevicePreferencesRequest): Promise<ReminderSettingsDto> {
    const [row] = await this.db
      .insert(notificationSettings)
      .values({ userId, timeZone: preferences.timeZone, locale: preferences.locale })
      .onConflictDoUpdate({ target: notificationSettings.userId, set: { timeZone: preferences.timeZone, locale: preferences.locale } })
      .returning(SETTINGS_COLUMNS)
      .catch(rejectUnknownTimeZone);

    return toDto(row);
  }

  // Changes only the language of existing settings; without settings there is nothing to change.
  public async saveLocale(userId: string, locale: AppLocale): Promise<void> {
    await this.db.update(notificationSettings).set({ locale }).where(eq(notificationSettings.userId, userId));
  }
}

function toDto(row: SettingsRow): ReminderSettingsDto {
  return { days: toDays(row), hour: row.hour, timeZone: row.timeZone, locale: row.locale };
}

// The database keeps two flags, and a check makes sure at least one is on.
function toDays({ remindOnDay, remindDayBefore }: SettingsRow): ReminderDays {
  if (remindOnDay && remindDayBefore) {
    return 'both';
  }

  return remindOnDay ? 'onDay' : 'dayBefore';
}

function toRow(settings: ReminderSettingsDto): SettingsRow {
  return {
    remindOnDay: settings.days !== 'dayBefore',
    remindDayBefore: settings.days !== 'onDay',
    hour: settings.hour,
    timeZone: settings.timeZone,
    locale: settings.locale,
  };
}

// The time zone passed the JavaScript check but not Postgres's list, which is stricter, for example about letter case
// ("europe/berlin"). That is the client's mistake, so it gets the same 400 as any other invalid field.
function rejectUnknownTimeZone(error: unknown): never {
  const cause = error instanceof DrizzleQueryError ? error.cause : undefined;

  if (cause && 'constraint' in cause && cause.constraint === TIME_ZONE_CHECK) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'The request is invalid',
      issues: [{ path: 'timeZone', message: TIME_ZONE_MESSAGE }],
    });
  }

  throw error;
}

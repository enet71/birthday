import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Put } from '@nestjs/common';
import { ReminderSettingsDto } from '@birthday/shared-models';
import { AuthUser, CurrentUser } from '@birthday/api-auth';
import { devicePreferencesSchema, reminderLocaleSchema, reminderSettingsSchema } from '../schemas';
import { ReminderSettingsService } from './reminder-settings.service';

@Controller('reminders/settings')
export class ReminderSettingsController {
  constructor(private readonly settingsService: ReminderSettingsService) {}

  @Get()
  public get(@CurrentUser() user: AuthUser): Promise<ReminderSettingsDto | null> {
    return this.settingsService.get(user.id);
  }

  @Put()
  public save(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<ReminderSettingsDto> {
    return this.settingsService.save(user.id, reminderSettingsSchema.parse(body));
  }

  @Put('device')
  public saveDevicePreferences(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<ReminderSettingsDto> {
    return this.settingsService.saveDevicePreferences(user.id, devicePreferencesSchema.parse(body));
  }

  @Patch('locale')
  @HttpCode(HttpStatus.NO_CONTENT)
  public saveLocale(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<void> {
    return this.settingsService.saveLocale(user.id, reminderLocaleSchema.parse(body).locale);
  }
}

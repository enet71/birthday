import { Controller, Get } from '@nestjs/common';
import { AdminOnly } from '@birthday/api-auth';
import { CelebrityImportsStatusResponse } from '@birthday/shared-models';
import { CelebrityImportsStatusService } from './services';

// The import status for the admin page.
@AdminOnly()
@Controller('admin/celebrity-imports')
export class CelebrityImportsAdminController {
  constructor(private readonly statusService: CelebrityImportsStatusService) {}

  @Get()
  public status(): Promise<CelebrityImportsStatusResponse> {
    return this.statusService.getStatus();
  }
}

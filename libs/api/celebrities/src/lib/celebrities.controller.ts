import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@birthday/api-auth';
import { CelebritiesResponse } from '@birthday/shared-models';
import { celebritiesRequestSchema } from './schemas';
import { CelebritiesService } from './services';

// The people of the public date pages; no sign-in. Invalid parameters fail zod parsing; the API answers that with 400.
@Public()
@Controller('celebrities')
export class CelebritiesController {
  constructor(private readonly celebritiesService: CelebritiesService) {}

  @Get()
  public list(@Query() query: unknown): Promise<CelebritiesResponse> {
    return this.celebritiesService.findByDate(celebritiesRequestSchema.parse(query));
  }
}

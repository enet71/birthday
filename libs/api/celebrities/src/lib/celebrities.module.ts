import { Module } from '@nestjs/common';
import { CelebritiesController } from './celebrities.controller';
import { CelebrityImportsAdminController } from './celebrity-imports-admin.controller';
import { CelebritiesImportService, CelebritiesJobsService, CelebritiesService, CelebrityImportsStatusService, WikimediaClient } from './services';

// Famous people from Wikidata for the public date pages; see README.md.
@Module({
  controllers: [CelebritiesController, CelebrityImportsAdminController],
  providers: [WikimediaClient, CelebritiesImportService, CelebritiesJobsService, CelebritiesService, CelebrityImportsStatusService],
})
export class CelebritiesModule {}

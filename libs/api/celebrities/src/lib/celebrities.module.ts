import { Module } from '@nestjs/common';
import { CelebritiesController } from './celebrities.controller';
import { CelebritiesImportService, CelebritiesJobsService, CelebritiesService, WikimediaClient } from './services';

// Famous people from Wikidata for the public date pages; see README.md.
@Module({
  controllers: [CelebritiesController],
  providers: [WikimediaClient, CelebritiesImportService, CelebritiesJobsService, CelebritiesService],
})
export class CelebritiesModule {}

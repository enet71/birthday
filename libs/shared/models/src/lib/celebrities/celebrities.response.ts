import { CelebrityDto } from './celebrity.dto';

export interface CelebritiesResponse {
  // At most `CELEBRITIES_PAGE_SIZE` people, in the requested order.
  celebrities: CelebrityDto[];
  // How many people match the date and the filters; more pages follow while fewer are loaded.
  total: number;
}

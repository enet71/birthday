import { BirthdayDto } from './birthday.dto';

export type CreateBirthdayRequest = Omit<BirthdayDto, 'id'>;

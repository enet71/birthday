import { Observable } from 'rxjs';
import {
  BirthdayDto,
  CreateBirthdayRequest,
  UpdateBirthdayRequest,
} from '@birthday/shared-models';

export abstract class BirthdaysStorage {
  public abstract getAll(): Observable<BirthdayDto[]>;

  public abstract create(
    request: CreateBirthdayRequest,
  ): Observable<BirthdayDto>;

  public abstract update(
    id: string,
    request: UpdateBirthdayRequest,
  ): Observable<BirthdayDto>;

  public abstract delete(id: string): Observable<void>;
}

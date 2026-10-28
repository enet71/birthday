import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BirthdayDto, CreateBirthdayRequest, UpdateBirthdayRequest } from '@birthday/shared-models';
import { BirthdaysRemoteStorage } from '@birthday/web-birthdays-data-access';
import { SUPABASE_CLIENT, SupabaseDatabaseClient } from '../client';
import { fromSupabase } from '../helpers';
import { Tables, TablesUpdate } from '../types';

const BIRTHDAY_COLUMNS = 'id, name, birth_date';

type BirthdayRow = Pick<Tables<'birthdays'>, 'id' | 'name' | 'birth_date'>;

// RLS limits every query to the signed-in user's rows, and `user_id` defaults to that user on insert.
@Injectable({ providedIn: 'root' })
export class BirthdaysSupabaseService extends BirthdaysRemoteStorage {
  private readonly supabase: SupabaseDatabaseClient = inject(SUPABASE_CLIENT);

  public getAll(): Observable<BirthdayDto[]> {
    return fromSupabase(() => this.supabase.from('birthdays').select(BIRTHDAY_COLUMNS)).pipe(
      map(({ data }) => data.map((row: BirthdayRow) => this.toDto(row))),
    );
  }

  public create(request: CreateBirthdayRequest): Observable<BirthdayDto> {
    return fromSupabase(() =>
      this.supabase.from('birthdays').insert({ name: request.name, birth_date: request.birthDate }).select(BIRTHDAY_COLUMNS).single(),
    ).pipe(map(({ data }) => this.toDto(data)));
  }

  public update(id: string, request: UpdateBirthdayRequest): Observable<BirthdayDto> {
    const changes: TablesUpdate<'birthdays'> = {};

    if (request.name !== undefined) {
      changes.name = request.name;
    }
    if (request.birthDate !== undefined) {
      changes.birth_date = request.birthDate;
    }

    // `single()` fails when no row matched, for example a birthday that was deleted on another device.
    return fromSupabase(() => this.supabase.from('birthdays').update(changes).eq('id', id).select(BIRTHDAY_COLUMNS).single()).pipe(
      map(({ data }) => this.toDto(data)),
    );
  }

  public delete(id: string): Observable<void> {
    return fromSupabase(() => this.supabase.from('birthdays').delete().eq('id', id)).pipe(map(() => undefined));
  }

  private toDto(row: BirthdayRow): BirthdayDto {
    return { id: row.id, name: row.name, birthDate: row.birth_date };
  }
}

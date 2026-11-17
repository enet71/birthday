import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { BirthdayDto, CreateBirthdayRequest, UpdateBirthdayRequest } from '@birthday/shared-models';
import { birthdays, DATABASE, Database } from '@birthday/api-database';

const BIRTHDAY_COLUMNS = {
  id: birthdays.id,
  name: birthdays.name,
  birthDate: birthdays.birthDate,
  relationship: birthdays.relationship,
  notes: birthdays.notes,
};

// Every query is limited to the signed-in user's rows: the API connects as the database owner, without row-level
// security, so this filter is what keeps users apart.
@Injectable()
export class BirthdaysService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  public list(userId: string): Promise<BirthdayDto[]> {
    return this.db.select(BIRTHDAY_COLUMNS).from(birthdays).where(eq(birthdays.userId, userId)).orderBy(asc(birthdays.createdAt));
  }

  public async create(userId: string, request: CreateBirthdayRequest): Promise<BirthdayDto> {
    const [birthday] = await this.db
      .insert(birthdays)
      .values({ userId, name: request.name, birthDate: request.birthDate, relationship: request.relationship, notes: request.notes })
      .returning(BIRTHDAY_COLUMNS);

    return birthday;
  }

  // Another user's birthday answers like a missing one, so its existence is not revealed.
  public async update(userId: string, id: string, request: UpdateBirthdayRequest): Promise<BirthdayDto> {
    const [birthday] = await this.db
      .update(birthdays)
      .set({ name: request.name, birthDate: request.birthDate, relationship: request.relationship, notes: request.notes })
      .where(and(eq(birthdays.id, id), eq(birthdays.userId, userId)))
      .returning(BIRTHDAY_COLUMNS);

    if (!birthday) {
      throw new NotFoundException();
    }
    return birthday;
  }

  // Deleting a birthday that is already gone succeeds, so a repeated delete from two devices is not an error.
  public async delete(userId: string, id: string): Promise<void> {
    await this.db.delete(birthdays).where(and(eq(birthdays.id, id), eq(birthdays.userId, userId)));
  }
}

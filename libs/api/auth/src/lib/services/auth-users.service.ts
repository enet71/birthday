import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, Database, users } from '@birthday/api-database';
import { AuthUser, GoogleProfile } from '../types';

@Injectable()
export class AuthUsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // The first sign-in creates the user; later ones keep the email and name in step with the Google account.
  public async upsertGoogleUser(profile: GoogleProfile): Promise<AuthUser> {
    const [user] = await this.db
      .insert(users)
      .values({ googleSub: profile.sub, email: profile.email, name: profile.name })
      .onConflictDoUpdate({ target: users.googleSub, set: { email: profile.email, name: profile.name } })
      .returning({ id: users.id, email: users.email, name: users.name });

    return user;
  }
}

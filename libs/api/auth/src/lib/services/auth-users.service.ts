import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, Database, users } from '@birthday/api-database';
import { AuthUser, GoogleProfile } from '../types';

@Injectable()
export class AuthUsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // The first sign-in creates the user; later ones keep the email, name and picture in step with the Google account.
  public async upsertGoogleUser(profile: GoogleProfile): Promise<AuthUser> {
    const [user] = await this.db
      .insert(users)
      .values({ googleSub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture })
      .onConflictDoUpdate({ target: users.googleSub, set: { email: profile.email, name: profile.name, picture: profile.picture } })
      .returning({ id: users.id, email: users.email, name: users.name, picture: users.picture });

    return user;
  }
}

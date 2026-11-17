import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { MODULE_OPTIONS_TOKEN } from '../google-calendar.module-definition';
import { GoogleCalendarModuleOptions } from '../types';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

// Encrypts the Google refresh tokens before they reach the database, so a database dump or backup alone does not give
// access to anyone's calendar and contacts. GCM also detects a changed value: decrypting it throws.
@Injectable()
export class TokenCipher {
  private readonly key: Buffer;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) options: GoogleCalendarModuleOptions) {
    this.key = Buffer.from(options.tokenEncryptionKey, 'hex');
  }

  // `<iv>.<auth tag>.<ciphertext>`, each base64url.
  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
  }

  public decrypt(value: string): string {
    const [iv, authTag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);

    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}

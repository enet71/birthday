import { BirthdayTone } from '../types';

const BIRTHDAY_TONES: BirthdayTone[] = ['violet', 'rose', 'sky', 'peach', 'mint'];

// Picks a stable color tone per name so a person keeps the same color everywhere.
export function getBirthdayTone(name: string): BirthdayTone {
  const hash: number = [...name].reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);

  return BIRTHDAY_TONES[hash % BIRTHDAY_TONES.length];
}

import { format } from 'date-fns';

export function toISOString(date: Date): string {
  return format(date, "yyyy-MM-dd'T00:00:00.000Z'");
}

import { isAfter, isBefore, parseISO } from 'date-fns';

export function sortArrayByDate<T, K extends keyof T>(
  array: T[],
  sortField: T[K] extends string ? K : never,
  type: 'asc' | 'desc' = 'asc',
): T[] {
  return [...array].sort((a: T, b: T) => {
    const aDate: Date = parseISO(a[sortField] as string);
    const bDate: Date = parseISO(b[sortField] as string);
    const result: boolean =
      type === 'asc' ? isAfter(aDate, bDate) : isBefore(aDate, bDate);

    return result ? 1 : -1;
  });
}

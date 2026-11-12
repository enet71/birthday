import { Day, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

// Returns the days of the full weeks that cover the month; `weekStartsOn` is 0 for Sunday and 1 for Monday.
export function getMonthGridDays(month: Date, weekStartsOn: Day = 0): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
}

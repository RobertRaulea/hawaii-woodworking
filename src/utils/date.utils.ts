const BUCHAREST = 'Europe/Bucharest';

export const bucharestToday = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: BUCHAREST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export const monthStart = (date: string): string => `${date.slice(0, 7)}-01`;

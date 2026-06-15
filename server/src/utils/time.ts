export type TimeWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

export function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function toLocalDateText(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalTimeText(value: Date) {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildPostWindows(start: Date, end: Date): TimeWindow[] {
  const startDate = toLocalDateText(start);
  const endDate = toLocalDateText(end);
  if (startDate === endDate) {
    return [{ date: startDate, startTime: toLocalTimeText(start), endTime: toLocalTimeText(end) }];
  }
  const windows: TimeWindow[] = [{ date: startDate, startTime: toLocalTimeText(start), endTime: "23:59" }];
  let cursor = addDays(start, 1);
  while (toLocalDateText(cursor) < endDate) {
    windows.push({ date: toLocalDateText(cursor), startTime: "00:00", endTime: "23:59" });
    cursor = addDays(cursor, 1);
  }
  windows.push({ date: endDate, startTime: "00:00", endTime: toLocalTimeText(end) });
  return windows;
}

export function intersect(a: TimeWindow, b: TimeWindow, c: TimeWindow) {
  if (a.date !== b.date || a.date !== c.date) return null;
  const start = Math.max(timeToMinutes(a.startTime), timeToMinutes(b.startTime), timeToMinutes(c.startTime));
  const end = Math.min(timeToMinutes(a.endTime), timeToMinutes(b.endTime), timeToMinutes(c.endTime));
  if (start >= end) return null;
  return { date: a.date, startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

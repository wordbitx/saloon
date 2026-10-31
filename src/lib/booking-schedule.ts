import type { Booking, SalonSettings, ScheduleBlock, Service } from "@/types/salon";

/** All scheduling is in the salon's local (Pakistan) calendar, not UTC day labels. */
export function karachiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

export function scheduleDateKey(value: string): string {
  if (["Today", "Tomorrow", "Yesterday"].includes(value)) {
    const date = new Date(`${karachiToday()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (value === "Tomorrow" ? 1 : value === "Yesterday" ? -1 : 0));
    return date.toISOString().slice(0, 10);
  }
  // Some legacy demo controls used weekdays instead of stable dates.
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(value);
  if (weekday !== -1) {
    const date = new Date(`${karachiToday()}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + ((weekday - date.getUTCDay() + 7) % 7));
    return date.toISOString().slice(0, 10);
  }
  // The fictional seed uses labels such as "31 Oct"; managed bookings use ISO dates.
  const legacy = value.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i);
  if (legacy) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(legacy[2].toLowerCase());
    const year = Number(karachiToday().slice(0, 4));
    const day = new Date(Date.UTC(year, month, Number(legacy[1])));
    if (day.getUTCMonth() === month && day.getUTCDate() === Number(legacy[1])) return day.toISOString().slice(0, 10);
  }
  return value;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function scheduleDateLabel(iso: string): string {
  const picked = new Date(`${iso}T00:00:00Z`);
  const today = new Date(`${karachiToday()}T00:00:00Z`);
  if (Number.isNaN(picked.getTime())) return iso;
  const difference = Math.round((picked.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  return picked.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "short", day: "numeric" });
}

/** Strictly parse 12- or 24-hour clock times into minutes since midnight. */
export function parseClockTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || (meridiem ? hours < 1 || hours > 12 : hours > 23)) return null;
  const hour24 = meridiem ? (hours % 12) + (meridiem === "PM" ? 12 : 0) : hours;
  return hour24 * 60 + minutes;
}

export function formatClockTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Hourly start times within the profile's same-day opening hours. */
export function scheduleSlots(opening: string, closing: string): string[] {
  let from = parseClockTime(opening);
  let to = parseClockTime(closing);
  // Older profiles may contain free-form hours; keep the existing demo hours usable.
  if (from === null || to === null || to <= from) { from = 11 * 60; to = 21 * 60; }
  const slots: string[] = [];
  for (let time = from; time < to; time += 60) slots.push(formatClockTime(time));
  return slots;
}

export type SlotCheckOptions = { stylistId?: string; branchId?: string; durationMinutes?: number };
export type BookingSlotSelection = { stylistId: string; branchId?: string; dateISO: string; time: string };

/** Use the short salon-local reference in every customer-facing view. */
export function bookingReference(booking: Booking): string {
  return booking.reference ?? booking.id;
}

export function bookingDuration(booking: Booking, services: Service[]): number {
  if (booking.durationMinutes && Number.isFinite(booking.durationMinutes) && booking.durationMinutes > 0) return booking.durationMinutes;
  const service = services.find((item) => booking.serviceId ? item.id === booking.serviceId : item.name === booking.serviceName);
  return service?.durationMinutes && service.durationMinutes > 0 ? service.durationMinutes : 60;
}

function dayNumber(value: string): number | null {
  const key = scheduleDateKey(value);
  if (!isCalendarDate(key)) return null;
  const day = Date.parse(`${key}T00:00:00Z`);
  return Number.isFinite(day) ? Math.floor(day / 86_400_000) : null;
}

/**
 * A chair is unavailable when appointment intervals overlap, even across
 * branches or midnight. Legacy name-only records still match by name.
 */
export function findBookingConflict(
  bookings: Booking[], services: Service[], stylistName: string, date: string, time: string,
  excludeId?: string, options: SlotCheckOptions = {},
): Booking | null {
  const start = parseClockTime(time);
  if (start === null) return null;
  const duration = options.durationMinutes && options.durationMinutes > 0 ? options.durationMinutes : 60;
  const day = dayNumber(date);
  return bookings.find((booking) => {
    if (booking.status === "cancelled" || booking.id === excludeId) return false;
    const samePerson = options.stylistId && booking.stylistId ? options.stylistId === booking.stylistId : booking.stylistName === stylistName;
    if (!samePerson) return false;
    const existingStart = parseClockTime(booking.time);
    if (existingStart === null) return false;
    const existingDay = dayNumber(booking.date);
    if (day === null || existingDay === null) {
      if (scheduleDateKey(booking.date) !== scheduleDateKey(date)) return false;
      return start < existingStart + bookingDuration(booking, services) && existingStart < start + duration;
    }
    const requestedStart = day * 1440 + start;
    const bookedStart = existingDay * 1440 + existingStart;
    return requestedStart < bookedStart + bookingDuration(booking, services) && bookedStart < requestedStart + duration;
  }) ?? null;
}


export type ScheduleClosure = {
  kind: "weekly-off" | "staff-off" | "block";
  label: string;
  block?: ScheduleBlock;
};

type ScheduleProfile = Pick<SalonSettings, "offDays" | "stylists">;
type ScheduleTarget = { branchId?: string; stylistId?: string; stylistName: string };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function targetMatchesBlock(block: ScheduleBlock, target: ScheduleTarget, settings: ScheduleProfile): boolean {
  if (block.scope === "salon") return true;
  if (block.scope === "branch") return !!target.branchId && block.branchId === target.branchId;
  // A branch-scoped staff closure does not close that shared staff member in other branches.
  if (block.branchId && block.branchId !== target.branchId) return false;
  if (target.stylistId) return block.stylistId === target.stylistId;
  // Legacy name-only appointments are still protected when matching a staff block.
  return settings.stylists.find((stylist) => stylist.id === block.stylistId)?.name === target.stylistName;
}

/** A timed block repeats on each date in its inclusive range; midnight is an allowed end. */
function blockOverlaps(block: ScheduleBlock, requestedStart: number, requestedEnd: number): boolean {
  const firstDay = dayNumber(block.startDate);
  const lastDay = dayNumber(block.endDate);
  if (firstDay === null || lastDay === null) return false;
  const startMinute = block.allDay ? 0 : parseClockTime(block.startTime ?? "");
  let endMinute = block.allDay ? 1440 : parseClockTime(block.endTime ?? "");
  if (startMinute === null || endMinute === null) return false;
  if (!block.allDay && endMinute === 0 && startMinute > 0) endMinute = 1440;
  if (endMinute <= startMinute) return false;
  const from = Math.max(firstDay, Math.floor(requestedStart / 1440));
  const to = Math.min(lastDay, Math.ceil(requestedEnd / 1440) - 1);
  for (let day = from; day <= to; day++) {
    if (requestedStart < day * 1440 + endMinute && day * 1440 + startMinute < requestedEnd) return true;
  }
  return false;
}

/**
 * Applies weekly salon off days, staff working days, and explicit closures to
 * the entire requested interval, including appointments spanning midnight.
 */
export function findScheduleClosure(
  settings: ScheduleProfile, blocks: ScheduleBlock[], target: ScheduleTarget,
  date: string, time: string, durationMinutes = 60,
): ScheduleClosure | null {
  const day = dayNumber(date);
  const minute = parseClockTime(time);
  if (day === null || minute === null || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
  const start = day * 1440 + minute;
  const end = start + durationMinutes;
  const stylist = settings.stylists.find((item) => target.stylistId ? item.id === target.stylistId : item.name === target.stylistName);
  for (let current = day; current <= Math.ceil(end / 1440) - 1; current++) {
    const weekday = WEEKDAYS[new Date(current * 86_400_000).getUTCDay()];
    if ((settings.offDays ?? []).includes(weekday)) return { kind: "weekly-off", label: `Weekly off · ${weekday}` };
    // An empty list means no staff-specific weekly restriction, for older profiles.
    if (stylist?.availableDays?.length && !stylist.availableDays.includes(weekday)) {
      return { kind: "staff-off", label: `${stylist.name} off · ${weekday}` };
    }
  }
  const block = blocks.find((entry) => targetMatchesBlock(entry, target, settings) && blockOverlaps(entry, start, end));
  return block ? { kind: "block", label: `${block.reason}${block.note ? ` · ${block.note}` : ""}`, block } : null;
}

/** Do not silently close a period which already contains an active appointment. */
export function blockConflictsWithBooking(block: ScheduleBlock, booking: Booking, settings: SalonSettings): boolean {
  if (booking.status === "cancelled") return false;
  const day = dayNumber(booking.date);
  const minute = parseClockTime(booking.time);
  if (day === null || minute === null) return false;
  const branchId = booking.branchId ?? settings.branches.find((branch) => branch.name === booking.branchName)?.id ?? settings.branches[0]?.id;
  const target = { branchId, stylistId: booking.stylistId, stylistName: booking.stylistName };
  if (!targetMatchesBlock(block, target, settings)) return false;
  const start = day * 1440 + minute;
  return blockOverlaps(block, start, start + bookingDuration(booking, settings.services));
}

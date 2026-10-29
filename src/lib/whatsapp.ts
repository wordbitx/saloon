import type { Booking } from "@/types/salon";

/**
 * Converts a Pakistani / international phone string into wa.me digits.
 * "0300 0000012" -> "923000000012", "+92 300 0000012" -> "923000000012".
 * Returns null when the number is too short to be a valid WhatsApp target.
 */
export function normalizePhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Opens a manual WhatsApp chat (wa.me). No message is sent automatically. */
export function waLink(phone: string, message?: string): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Pre-filled text that the owner can review before sending in WhatsApp. */
export function waMessageFor(booking: Booking, salonName: string): string {
  const first = booking.customerName.split(" ")[0] || "ji";
  if (booking.status === "cancelled") {
    return `Assalam o alaikum ${first}! ${salonName} se: aap ki ${booking.serviceName} booking (${booking.date} ${booking.time}) cancel ho gayi hai. Naya slot chahiye to batayein.`;
  }
  if (booking.status === "completed") {
    return `Shukriya ${first}! ${salonName} mein aane ka shukriya. Apna experience zaroor batayein.`;
  }
  const stylist = booking.stylistName ? ` (${booking.stylistName})` : "";
  return `Assalam o alaikum ${first}! ${salonName} se confirmation: ${booking.serviceName}, ${booking.date} ${booking.time}${stylist}. Appointment se 2 ghante pehle reminder bheja jayega. Shukriya!`;
}

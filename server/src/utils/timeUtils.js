/**
 * Time utility helpers for IST (Asia/Kolkata, UTC+5:30).
 * All business-rule date/time checks are centralised here.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m

/**
 * Returns current time as a Date object in IST.
 */
const nowIST = () => new Date(Date.now() + IST_OFFSET_MS);

/**
 * Converts any Date to the equivalent IST wall-clock Date.
 */
const toIST = (date) => new Date(new Date(date).getTime() + IST_OFFSET_MS);

/**
 * Returns ISO string for the Monday 00:00 IST of the week containing `date`.
 */
const weekStartIST = (date) => {
  const ist = toIST(date);
  const day = ist.getUTCDay(); // 0=Sun,1=Mon...6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(ist);
  monday.setUTCDate(ist.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  // convert back to UTC for MongoDB storage
  return new Date(monday.getTime() - IST_OFFSET_MS);
};

/**
 * Returns the Sunday 23:59:59.999 UTC of the week containing `date`.
 */
const weekEndIST = (date) => {
  const start = weekStartIST(date);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
};

/**
 * Calculates slot duration in hours.
 */
const slotDurationHours = (startTime, endTime) => {
  const diff = new Date(endTime) - new Date(startTime);
  return diff / (1000 * 60 * 60);
};

/**
 * Checks if two time ranges overlap (exclusive boundary — touching is OK).
 */
const doTimesOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1; // strict overlap; touching edges allowed
};

module.exports = { nowIST, toIST, weekStartIST, weekEndIST, slotDurationHours, doTimesOverlap };

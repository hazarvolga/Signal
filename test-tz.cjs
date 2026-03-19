const { format } = require('date-fns');
const { fromZonedTime, toZonedTime } = require('date-fns-tz');

const timeZone = 'America/New_York';
const localDate = new Date(2026, 2, 20, 10, 0, 0); // 10:00 AM local
const dateStr = format(localDate, "yyyy-MM-dd'T'HH:mm:ss");
const utcDate = fromZonedTime(dateStr, timeZone);
console.log("UTC Date:", utcDate.toISOString());

const displayDate = toZonedTime(utcDate, timeZone);
console.log("Display Date:", displayDate.toString());

// Format: 4th August 2025
export function formatFullDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date)) return '';

  const day = date.getDate();
  const daySuffix =
    day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
    day === 3 || day === 23 ? 'rd' : 'th';

  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  return `${day}${daySuffix} ${month} ${year}`;
}

// Format: 04 Aug 2025
export function formatShortDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date)) return '';

  const day = date.getDate().toString().padStart(2, '0'); // ensures "04" instead of "4"
  const month = date.toLocaleString('default', { month: 'short' }); // e.g., "Aug"
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

// Format: 09:30 AM - 10:30 AM
export function formatTimeRange(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime) return '';

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (isNaN(start) || isNaN(end)) return '';

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatTimeRangeWithHours(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime) return '';

  const start = new Date(startDateTime);
  const end = new Date(endDateTime);

  if (isNaN(start) || isNaN(end)) return '';

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const durationInMs = end - start;

  const totalMinutes = Math.floor(durationInMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let durationString = '';
  if (hours > 0) durationString += `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) {
    if (durationString) durationString += ' ';
    durationString += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `${formatTime(start)} - ${formatTime(end)}${durationString ? ` (${durationString})` : ''}`;
}

export function getDurationDifferenceInHours(opsStart, opsEnd, actualStart, actualEnd) {
  const toDate = (time) => new Date(time);

  const opsDuration = (toDate(opsEnd) - toDate(opsStart)) / (1000 * 60 * 60); // in hours
  const actualDuration = (toDate(actualEnd) - toDate(actualStart)) / (1000 * 60 * 60); // in hours

  const diff = opsDuration - actualDuration;

  return parseFloat(diff.toFixed(2)); // Returns something like -1.25 (not "(1.25)")
}
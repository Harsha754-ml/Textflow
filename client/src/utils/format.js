export function formatRelativeTimestamp(value) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatLatency(value) {
  if (value == null) {
    return '—';
  }

  return `${value} ms`;
}

export function isLikelyPhoneNumber(value) {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

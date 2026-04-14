function escapeCsvValue(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const headers = ['id', 'phoneNumbers', 'message', 'status', 'createdAt', 'scheduledAt', 'attempts', 'lastError'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        Array.isArray(row.phoneNumbers) ? row.phoneNumbers.join(';') : '',
        row.message,
        row.status,
        row.createdAt,
        row.scheduledAt || '',
        row.attempts ?? 0,
        row.lastError || '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  return lines.join('\n');
}

module.exports = {
  toCsv,
};

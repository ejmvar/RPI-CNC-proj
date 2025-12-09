// Simple G-Code dialect conversion helpers

export function convertToTwoDigitGCodes(text) {
  return String(text || '').split(/\r?\n/).map(line => {
    return line.replace(/\bG(\d)\b/gi, (m, d) => `G0${d}`);
  }).join('\n');
}

export function convert(text, opts = {}) {
  if (!text) return '';
  if (opts.format === '2-digit') return convertToTwoDigitGCodes(text);
  // future converters could be added here
  return text;
}

export default { convert, convertToTwoDigitGCodes };

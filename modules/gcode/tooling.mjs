// Tool change scanning utilities

export function scanToolChanges(parsedCmds) {
  if (!Array.isArray(parsedCmds)) return [];
  const changes = [];
  let currentTool = null;
  parsedCmds.forEach((c, idx) => {
    const params = c.params || {};
    // tool selection token 'T' or explicit M6 'M6' command
    if ('T' in params) {
      currentTool = params.T;
      changes.push({ index: idx, tool: currentTool, raw: c.raw });
    }
    if (c.raw && /(^|\s)M6(\s|$)/i.test(c.raw)) {
      // tool change command — look for nearby T param or mark as change
      if ('T' in params) {
        currentTool = params.T;
      }
      changes.push({ index: idx, tool: currentTool, raw: c.raw });
    }
  });
  return changes;
}

export default { scanToolChanges };

/* eslint-disable no-undef */
/**
 * G-Code Parsing Worker
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Background worker for parsing large G-Code files without blocking UI
 * Processes line-by-line and returns parsed commands
 */

// Simple line parser for worker environment (no module imports)
function parseGCodeLine(line) {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('(')) {
    return null;
  }

  // Remove trailing comment
  let command = trimmed;
  const commentIndex = trimmed.indexOf(';');
  if (commentIndex > 0) {
    command = trimmed.substring(0, commentIndex).trim();
  }

  const params = {};
  let gCode = null;
  let mCode = null;

  // Extract G and M codes
  const gMatch = command.match(/G(\d+(?:\.\d+)?)/i);
  if (gMatch) {
    gCode = parseFloat(gMatch[1]);
  }

  const mMatch = command.match(/M(\d+)/i);
  if (mMatch) {
    mCode = parseInt(mMatch[1], 10);
  }

  // Extract parameters
  const paramRegex = /([A-Z])([\d.+-]+)/gi;
  let paramMatch;
  // eslint-disable-next-line no-cond-assign
  while ((paramMatch = paramRegex.exec(command)) !== null) {
    const key = paramMatch[1].toUpperCase();
    const value = parseFloat(paramMatch[2]);
    if (!Number.isNaN(value)) {
      params[key] = value;
    }
  }

  return {
    line: trimmed,
    gCode,
    mCode,
    params,
    raw: trimmed,
  };
}

/**
 * Worker message handler
 */
self.addEventListener('message', (event) => {
  const { command, data } = event.data;

  try {
    let result;

    switch (command) {
      case 'parseLine': {
        result = parseGCodeLine(data.line);
        break;
      }

      case 'parseLines': {
        const lines = data.lines || [];
        result = lines.map(parseGCodeLine).filter((cmd) => cmd !== null);
        break;
      }

      case 'parseFile': {
        const content = data.content || '';
        const lines = content.split('\n');
        const commands = [];
        let lineNumber = 0;

        for (const line of lines) {
          lineNumber += 1;
          const parsed = parseGCodeLine(line);
          if (parsed) {
            parsed.lineNumber = lineNumber;
            commands.push(parsed);
          }
        }

        result = {
          commands,
          totalLines: lines.length,
          parsedCommands: commands.length,
        };
        break;
      }

      case 'extractMetrics': {
        const commands = data.commands || [];
        const metrics = {
          gCodes: new Set(),
          mCodes: new Set(),
          parameters: new Set(),
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
          minZ: Infinity,
          maxZ: -Infinity,
          totalDistance: 0,
          commandCount: commands.length,
        };

        for (const cmd of commands) {
          if (cmd.gCode !== null && cmd.gCode !== undefined) {
            metrics.gCodes.add(cmd.gCode);
          }
          if (cmd.mCode !== null && cmd.mCode !== undefined) {
            metrics.mCodes.add(cmd.mCode);
          }

          Object.keys(cmd.params).forEach((key) => {
            metrics.parameters.add(key);
          });

          // Track axis bounds
          if (cmd.params.X !== undefined) {
            metrics.minX = Math.min(metrics.minX, cmd.params.X);
            metrics.maxX = Math.max(metrics.maxX, cmd.params.X);
          }
          if (cmd.params.Y !== undefined) {
            metrics.minY = Math.min(metrics.minY, cmd.params.Y);
            metrics.maxY = Math.max(metrics.maxY, cmd.params.Y);
          }
          if (cmd.params.Z !== undefined) {
            metrics.minZ = Math.min(metrics.minZ, cmd.params.Z);
            metrics.maxZ = Math.max(metrics.maxZ, cmd.params.Z);
          }
        }

        // Convert sets to arrays for serialization
        result = {
          ...metrics,
          gCodes: Array.from(metrics.gCodes),
          mCodes: Array.from(metrics.mCodes),
          parameters: Array.from(metrics.parameters),
          hasValidBounds: metrics.minX !== Infinity && metrics.minY !== Infinity,
        };
        break;
      }

      default:
        throw new Error(`Unknown worker command: ${command}`);
    }

    self.postMessage({
      success: true,
      result,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    });
  }
});

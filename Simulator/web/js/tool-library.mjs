// Browser wrapper for tool-library.mjs
// Exposes ToolLibrary for use in front.html

import {
  ToolLibrary,
  DEFAULT_3D_PRINT_TOOLS,
  DEFAULT_CNC_TOOLS,
} from '../../../modules/gcode/tool-library.mjs';

// Export for ES module imports
export { ToolLibrary, DEFAULT_3D_PRINT_TOOLS, DEFAULT_CNC_TOOLS };

// Also expose on window for inline scripts and debugging
if (typeof window !== 'undefined') {
  window.ToolLibrary = ToolLibrary;
  window.DEFAULT_3D_PRINT_TOOLS = DEFAULT_3D_PRINT_TOOLS;
  window.DEFAULT_CNC_TOOLS = DEFAULT_CNC_TOOLS;
}

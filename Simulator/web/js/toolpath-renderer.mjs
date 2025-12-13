// Browser wrapper for toolpath-renderer.mjs
// Exposes multi-tool toolpath rendering for use in front.html

import {
  renderMultiToolToolpath,
  calculateToolpathStats,
} from '../../../modules/presentation/toolpath-renderer.mjs';

// Export for ES module imports
export { renderMultiToolToolpath, calculateToolpathStats };

// Also expose on window for inline scripts and debugging
if (typeof window !== 'undefined') {
  window.renderMultiToolToolpath = renderMultiToolToolpath;
  window.calculateToolpathStats = calculateToolpathStats;
}

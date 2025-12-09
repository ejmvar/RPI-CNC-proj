// Lightweight 2D renderer for toolpaths (no DOM required)
export function renderToolpathToAscii(points = [], options = {}) {
  // very small ASCII rendering for tests: map coordinates to a grid
  const gridSize = options.gridSize || 20;
  const xs = points.map(p => p.x || 0);
  const ys = points.map(p => p.y || 0);
  if (xs.length === 0) return '';
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (maxX - minX) || 1;
  const scaleY = (maxY - minY) || 1;

  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill('.'));
  points.forEach(pt => {
    const gx = Math.max(0, Math.min(gridSize - 1, Math.round((pt.x - minX) / scaleX * (gridSize - 1))));
    const gy = Math.max(0, Math.min(gridSize - 1, Math.round((pt.y - minY) / scaleY * (gridSize - 1))));
    grid[gy][gx] = '*';
  });

  return grid.map(row => row.join('')).join('\n');
}

export default { renderToolpathToAscii };

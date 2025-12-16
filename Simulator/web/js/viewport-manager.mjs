/**
 * Viewport Manager
 * Support for multiple viewports (single, split, quad)
 */

class ViewportManager {
  constructor(container) {
    this.container = container;
    this.mode = 'single'; // 'single', 'split-h', 'split-v', 'quad'
    this.viewports = [];
  }

  /**
   * Initialize viewport manager
   */
  init() {
    this.injectUI();
    this.setupViewport('single');
  }

  /**
   * Setup viewport configuration
   */
  setupViewport(mode) {
    this.mode = mode;
    this.clearViewports();

    switch (mode) {
      case 'single':
        this.setupSingleViewport();
        break;
      case 'split-h':
        this.setupSplitHorizontal();
        break;
      case 'split-v':
        this.setupSplitVertical();
        break;
      case 'quad':
        this.setupQuadViewport();
        break;
    }

    this.updateUI();
    this.notifyChange();
  }

  /**
   * Setup single viewport
   */
  setupSingleViewport() {
    this.viewports = [
      {
        id: 'main',
        name: 'Main',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        camera: null,
      },
    ];
  }

  /**
   * Setup horizontal split
   */
  setupSplitHorizontal() {
    this.viewports = [
      {
        id: 'top',
        name: 'Top',
        x: 0,
        y: 0.5,
        width: 1,
        height: 0.5,
        camera: null,
        view: 'top',
      },
      {
        id: 'bottom',
        name: 'Perspective',
        x: 0,
        y: 0,
        width: 1,
        height: 0.5,
        camera: null,
        view: 'perspective',
      },
    ];
  }

  /**
   * Setup vertical split
   */
  setupSplitVertical() {
    this.viewports = [
      {
        id: 'left',
        name: 'Front',
        x: 0,
        y: 0,
        width: 0.5,
        height: 1,
        camera: null,
        view: 'front',
      },
      {
        id: 'right',
        name: 'Perspective',
        x: 0.5,
        y: 0,
        width: 0.5,
        height: 1,
        camera: null,
        view: 'perspective',
      },
    ];
  }

  /**
   * Setup quad viewport
   */
  setupQuadViewport() {
    this.viewports = [
      {
        id: 'top-left',
        name: 'Top',
        x: 0,
        y: 0.5,
        width: 0.5,
        height: 0.5,
        camera: null,
        view: 'top',
      },
      {
        id: 'top-right',
        name: 'Front',
        x: 0.5,
        y: 0.5,
        width: 0.5,
        height: 0.5,
        camera: null,
        view: 'front',
      },
      {
        id: 'bottom-left',
        name: 'Side',
        x: 0,
        y: 0,
        width: 0.5,
        height: 0.5,
        camera: null,
        view: 'side',
      },
      {
        id: 'bottom-right',
        name: 'Perspective',
        x: 0.5,
        y: 0,
        width: 0.5,
        height: 0.5,
        camera: null,
        view: 'perspective',
      },
    ];
  }

  /**
   * Clear viewports
   */
  clearViewports() {
    this.viewports = [];
  }

  /**
   * Get viewport at position (normalized 0-1)
   */
  getViewportAt(x, y) {
    return this.viewports.find(
      (vp) => x >= vp.x && x < vp.x + vp.width && y >= vp.y && y < vp.y + vp.height
    );
  }

  /**
   * Render viewports
   */
  render(renderer, scene, mainCamera) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.viewports.forEach((viewport) => {
      const left = Math.floor(viewport.x * width);
      const bottom = Math.floor(viewport.y * height);
      const vpWidth = Math.floor(viewport.width * width);
      const vpHeight = Math.floor(viewport.height * height);

      renderer.setViewport(left, bottom, vpWidth, vpHeight);
      renderer.setScissor(left, bottom, vpWidth, vpHeight);
      renderer.setScissorTest(true);

      const camera = viewport.camera || mainCamera;
      renderer.render(scene, camera);
    });

    renderer.setScissorTest(false);
  }

  /**
   * Update viewport UI
   */
  updateUI() {
    document.querySelectorAll('.viewport-mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === this.mode);
    });
  }

  /**
   * Notify viewport change
   */
  notifyChange() {
    window.dispatchEvent(
      new CustomEvent('viewportchange', {
        detail: { mode: this.mode, viewports: this.viewports },
      })
    );
  }

  /**
   * Inject viewport UI
   */
  injectUI() {
    if (document.getElementById('viewport-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'viewport-controls';
    controls.className = 'viewport-controls';
    controls.innerHTML = `
      <div class="viewport-modes">
        <button class="viewport-mode-btn active" data-mode="single" title="Single viewport">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="1" y="1" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="viewport-mode-btn" data-mode="split-h" title="Horizontal split">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="1" y="1" width="18" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="1" y="11" width="18" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="viewport-mode-btn" data-mode="split-v" title="Vertical split">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="1" y="1" width="8" height="18" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="11" y="1" width="8" height="18" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="viewport-mode-btn" data-mode="quad" title="Quad view">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="11" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="1" y="11" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
            <rect x="11" y="11" width="8" height="8" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(controls);
    this.attachUIEventListeners();
  }

  /**
   * Attach UI event listeners
   */
  attachUIEventListeners() {
    document.querySelectorAll('.viewport-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setupViewport(btn.dataset.mode);
      });
    });
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ViewportManager = ViewportManager;
}

export default ViewportManager;

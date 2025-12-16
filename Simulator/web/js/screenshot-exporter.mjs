/**
 * Screenshot and Export Manager
 * Capture and download screenshots, export 3D views
 */

class ScreenshotExporter {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Initialize screenshot exporter
   */
  init() {
    this.injectUI();
  }

  /**
   * Capture screenshot
   */
  captureScreenshot(format = 'png', quality = 1.0) {
    // Render current frame
    this.renderer.render(this.scene, this.camera);

    // Get canvas data
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL(`image/${format}`, quality);

    return dataURL;
  }

  /**
   * Download screenshot
   */
  downloadScreenshot(filename = null, format = 'png') {
    const dataURL = this.captureScreenshot(format);

    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `cnc-simulator-${timestamp}.${format}`;
    }

    this.downloadFile(dataURL, filename);
  }

  /**
   * Capture high-resolution screenshot
   */
  captureHighRes(scale = 2) {
    const canvas = this.renderer.domElement;
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;

    // Temporarily increase resolution
    this.renderer.setSize(originalWidth * scale, originalHeight * scale, false);
    this.renderer.render(this.scene, this.camera);

    const dataURL = canvas.toDataURL('image/png');

    // Restore original size
    this.renderer.setSize(originalWidth, originalHeight, false);

    return dataURL;
  }

  /**
   * Download high-resolution screenshot
   */
  downloadHighRes(scale = 2) {
    const dataURL = this.captureHighRes(scale);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `cnc-simulator-${scale}x-${timestamp}.png`;

    this.downloadFile(dataURL, filename);
  }

  /**
   * Export scene as JSON (for debugging)
   */
  exportSceneJSON() {
    const sceneData = this.scene.toJSON();
    const jsonString = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `scene-${timestamp}.json`;

    this.downloadFile(url, filename);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy screenshot to clipboard
   */
  async copyToClipboard() {
    try {
      const canvas = this.renderer.domElement;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

      this.showNotification('Screenshot copied to clipboard!');
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showNotification('Failed to copy to clipboard', 'error');
      return false;
    }
  }

  /**
   * Download file helper
   */
  downloadFile(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    link.click();
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `screenshot-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Inject screenshot UI
   */
  injectUI() {
    if (document.getElementById('screenshot-controls')) return;

    const controls = document.createElement('div');
    controls.id = 'screenshot-controls';
    controls.className = 'screenshot-controls';
    controls.innerHTML = `
      <button id="btn-screenshot" class="btn-icon-lg" title="Take screenshot (Ctrl+P)">📷</button>
      <div id="screenshot-menu" class="screenshot-menu hidden">
        <button id="btn-screenshot-normal" class="menu-item">📷 Normal quality</button>
        <button id="btn-screenshot-hd" class="menu-item">🎬 High resolution (2x)</button>
        <button id="btn-screenshot-4k" class="menu-item">🎯 Ultra HD (4x)</button>
        <button id="btn-screenshot-clipboard" class="menu-item">📋 Copy to clipboard</button>
        <button id="btn-export-json" class="menu-item">💾 Export scene JSON</button>
      </div>
    `;

    document.body.appendChild(controls);
    this.attachUIEventListeners();
  }

  /**
   * Attach UI event listeners
   */
  attachUIEventListeners() {
    const btn = document.getElementById('btn-screenshot');
    const menu = document.getElementById('screenshot-menu');

    btn?.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#screenshot-controls')) {
        menu?.classList.add('hidden');
      }
    });

    // Menu items
    document.getElementById('btn-screenshot-normal')?.addEventListener('click', () => {
      this.downloadScreenshot();
      menu.classList.add('hidden');
    });

    document.getElementById('btn-screenshot-hd')?.addEventListener('click', () => {
      this.downloadHighRes(2);
      menu.classList.add('hidden');
    });

    document.getElementById('btn-screenshot-4k')?.addEventListener('click', () => {
      this.downloadHighRes(4);
      menu.classList.add('hidden');
    });

    document.getElementById('btn-screenshot-clipboard')?.addEventListener('click', () => {
      this.copyToClipboard();
      menu.classList.add('hidden');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      this.exportSceneJSON();
      menu.classList.add('hidden');
    });
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ScreenshotExporter = ScreenshotExporter;
}

export default ScreenshotExporter;

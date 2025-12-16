/**
 * Camera Bookmarks Manager
 * Save and restore camera positions and orientations
 */

class CameraBookmarks {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;
    this.bookmarks = [];
    this.storageKey = 'cnc-simulator-camera-bookmarks';
    this.maxBookmarks = 10;
  }

  /**
   * Initialize camera bookmarks
   */
  init() {
    this.load();
    this.injectUI();
  }

  /**
   * Save current camera position as bookmark
   */
  saveBookmark(name) {
    const bookmark = {
      id: Date.now().toString(),
      name: name || `View ${this.bookmarks.length + 1}`,
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z,
      },
      target: this.controls
        ? {
            x: this.controls.target.x,
            y: this.controls.target.y,
            z: this.controls.target.z,
          }
        : null,
      timestamp: Date.now(),
    };

    this.bookmarks.unshift(bookmark);

    // Limit to max bookmarks
    if (this.bookmarks.length > this.maxBookmarks) {
      this.bookmarks = this.bookmarks.slice(0, this.maxBookmarks);
    }

    this.save();
    this.updateUI();

    return bookmark;
  }

  /**
   * Restore camera position from bookmark
   */
  restoreBookmark(bookmarkId, animated = true) {
    const bookmark = this.bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark) return false;

    if (animated) {
      this.animateToBookmark(bookmark);
    } else {
      this.camera.position.set(bookmark.position.x, bookmark.position.y, bookmark.position.z);
      this.camera.rotation.set(bookmark.rotation.x, bookmark.rotation.y, bookmark.rotation.z);

      if (this.controls && bookmark.target) {
        this.controls.target.set(bookmark.target.x, bookmark.target.y, bookmark.target.z);
        this.controls.update();
      }
    }

    return true;
  }

  /**
   * Animate camera to bookmark position
   */
  animateToBookmark(bookmark, duration = 1000) {
    const startPos = this.camera.position.clone();
    const startRot = this.camera.rotation.clone();
    const startTarget = this.controls ? this.controls.target.clone() : null;

    const endPos = bookmark.position;
    const endRot = bookmark.rotation;
    const endTarget = bookmark.target;

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const eased =
        progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Interpolate position
      this.camera.position.lerpVectors(startPos, { x: endPos.x, y: endPos.y, z: endPos.z }, eased);

      // Interpolate rotation
      this.camera.rotation.set(
        startRot.x + (endRot.x - startRot.x) * eased,
        startRot.y + (endRot.y - startRot.y) * eased,
        startRot.z + (endRot.z - startRot.z) * eased
      );

      // Interpolate controls target
      if (this.controls && startTarget && endTarget) {
        this.controls.target.lerpVectors(
          startTarget,
          { x: endTarget.x, y: endTarget.y, z: endTarget.z },
          eased
        );
        this.controls.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Delete bookmark
   */
  deleteBookmark(bookmarkId) {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== bookmarkId);
    this.save();
    this.updateUI();
  }

  /**
   * Rename bookmark
   */
  renameBookmark(bookmarkId, newName) {
    const bookmark = this.bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      bookmark.name = newName;
      this.save();
      this.updateUI();
    }
  }

  /**
   * Set predefined view
   */
  setPredefinedView(viewName) {
    const views = {
      top: {
        position: { x: 0, y: 100, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
      front: {
        position: { x: 0, y: 0, z: 100 },
        rotation: { x: 0, y: 0, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
      side: {
        position: { x: 100, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
      isometric: {
        position: { x: 70, y: 70, z: 70 },
        rotation: { x: -Math.PI / 4, y: Math.PI / 4, z: 0 },
        target: { x: 0, y: 0, z: 0 },
      },
    };

    const view = views[viewName];
    if (view) {
      this.animateToBookmark(view);
    }
  }

  /**
   * Save bookmarks to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.bookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }

  /**
   * Load bookmarks from localStorage
   */
  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.bookmarks = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      this.bookmarks = [];
    }
  }

  /**
   * Inject bookmarks UI
   */
  injectUI() {
    if (document.getElementById('camera-bookmarks-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'camera-bookmarks-panel';
    panel.className = 'camera-bookmarks-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>📷 Camera Views</h3>
        <button class="btn-collapse" title="Collapse">−</button>
      </div>
      <div class="panel-content">
        <div class="predefined-views">
          <button class="view-btn" data-view="top" title="Top view (Ctrl+1)">⬇️ Top</button>
          <button class="view-btn" data-view="front" title="Front view (Ctrl+2)">➡️ Front</button>
          <button class="view-btn" data-view="side" title="Side view (Ctrl+3)">⬆️ Side</button>
          <button class="view-btn" data-view="isometric" title="Isometric view">📐 ISO</button>
        </div>
        <div class="bookmarks-actions">
          <button id="btn-save-bookmark" class="btn btn-sm btn-primary">💾 Save View</button>
        </div>
        <div id="bookmarks-list" class="bookmarks-list"></div>
      </div>
    `;

    document.body.appendChild(panel);
    this.attachEventListeners();
    this.updateUI();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Collapse button
    document
      .querySelector('.camera-bookmarks-panel .btn-collapse')
      ?.addEventListener('click', (e) => {
        const panel = document.getElementById('camera-bookmarks-panel');
        panel.classList.toggle('collapsed');
        e.target.textContent = panel.classList.contains('collapsed') ? '+' : '−';
      });

    // Predefined views
    document.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setPredefinedView(btn.dataset.view);
      });
    });

    // Save bookmark
    document.getElementById('btn-save-bookmark')?.addEventListener('click', () => {
      const name = prompt('Enter view name:');
      if (name) {
        this.saveBookmark(name);
      }
    });
  }

  /**
   * Update bookmarks UI
   */
  updateUI() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;

    if (this.bookmarks.length === 0) {
      list.innerHTML = '<p class="empty-message">No saved views</p>';
      return;
    }

    list.innerHTML = this.bookmarks
      .map(
        (bookmark) => `
      <div class="bookmark-item" data-id="${bookmark.id}">
        <span class="bookmark-name">${this.escapeHtml(bookmark.name)}</span>
        <div class="bookmark-actions">
          <button class="btn-icon" onclick="cameraBookmarks.restoreBookmark('${
            bookmark.id
          }')" title="Restore view">👁️</button>
          <button class="btn-icon" onclick="cameraBookmarks.deleteBookmark('${
            bookmark.id
          }')" title="Delete">🗑️</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.CameraBookmarks = CameraBookmarks;
}

export default CameraBookmarks;

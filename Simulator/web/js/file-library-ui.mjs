/**
 * File Library UI Component
 * Manages G-Code files with folders, search, and versioning
 */

class FileLibraryUI {
  constructor(authUI) {
    this.authUI = authUI;
    this.currentFolder = null;
    this.files = [];
    this.folders = [];
    this.selectedFile = null;
  }

  /**
   * Initialize file library UI
   */
  init() {
    this.injectUI();
    this.attachEventListeners();

    // Refresh when user logs in/out
    if (this.authUI) {
      const originalOnAuthChange = this.authUI.onAuthChange;
      this.authUI.onAuthChange = (user) => {
        if (originalOnAuthChange) originalOnAuthChange(user);
        if (user) {
          this.refresh();
        } else {
          this.clear();
        }
      };
    }
  }

  /**
   * Inject file library UI
   */
  injectUI() {
    const container = document.createElement('div');
    container.id = 'file-library-container';
    container.innerHTML = `
      <!-- File Library Button -->
      <button id="btn-show-library" class="btn btn-library" title="File Library">
        📁 Files
      </button>

      <!-- File Library Modal -->
      <div id="modal-library" class="modal hidden">
        <div class="modal-content modal-large">
          <span class="modal-close" data-modal="modal-library">&times;</span>
          <h2>📁 G-Code File Library</h2>
          
          <!-- Toolbar -->
          <div class="library-toolbar">
            <div class="toolbar-left">
              <button id="btn-new-file" class="btn btn-primary btn-sm">➕ New File</button>
              <button id="btn-new-folder" class="btn btn-secondary btn-sm">📁 New Folder</button>
              <button id="btn-upload" class="btn btn-secondary btn-sm">⬆️ Upload</button>
            </div>
            <div class="toolbar-right">
              <input type="text" id="file-search" placeholder="Search files..." class="search-input">
              <button id="btn-refresh" class="btn btn-secondary btn-sm">🔄 Refresh</button>
            </div>
          </div>

          <!-- Breadcrumb Navigation -->
          <div id="breadcrumb" class="breadcrumb"></div>

          <!-- File List -->
          <div class="file-list-container">
            <div id="folder-list" class="folder-list"></div>
            <div id="file-list" class="file-list"></div>
          </div>

          <!-- File Stats -->
          <div id="file-stats" class="file-stats"></div>
        </div>
      </div>

      <!-- New File Modal -->
      <div id="modal-new-file" class="modal hidden">
        <div class="modal-content">
          <span class="modal-close" data-modal="modal-new-file">&times;</span>
          <h2>New G-Code File</h2>
          <form id="form-new-file">
            <div class="form-group">
              <label for="new-file-name">Filename</label>
              <input type="text" id="new-file-name" required placeholder="example.gcode">
            </div>
            <div class="form-group">
              <label for="new-file-description">Description</label>
              <input type="text" id="new-file-description" placeholder="Optional description">
            </div>
            <div class="form-group">
              <label for="new-file-content">G-Code Content</label>
              <textarea id="new-file-content" rows="10" required placeholder="G0 X0 Y0 Z0"></textarea>
            </div>
            <div class="form-group">
              <label for="new-file-tags">Tags (comma-separated)</label>
              <input type="text" id="new-file-tags" placeholder="cnc, project, test">
            </div>
            <div id="new-file-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Create File</button>
          </form>
        </div>
      </div>

      <!-- New Folder Modal -->
      <div id="modal-new-folder" class="modal hidden">
        <div class="modal-content">
          <span class="modal-close" data-modal="modal-new-folder">&times;</span>
          <h2>New Folder</h2>
          <form id="form-new-folder">
            <div class="form-group">
              <label for="new-folder-name">Folder Name</label>
              <input type="text" id="new-folder-name" required placeholder="My Project">
            </div>
            <div id="new-folder-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Create Folder</button>
          </form>
        </div>
      </div>

      <!-- File Details Modal -->
      <div id="modal-file-details" class="modal hidden">
        <div class="modal-content modal-large">
          <span class="modal-close" data-modal="modal-file-details">&times;</span>
          <div id="file-details-content"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    document.getElementById('btn-show-library').addEventListener('click', () => this.show());
    document
      .getElementById('btn-new-file')
      .addEventListener('click', () => this.showModal('modal-new-file'));
    document
      .getElementById('btn-new-folder')
      .addEventListener('click', () => this.showModal('modal-new-folder'));
    document.getElementById('btn-refresh').addEventListener('click', () => this.refresh());
    document.getElementById('file-search').addEventListener('input', (e) => this.handleSearch(e));

    // Close modals
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', (e) => this.hideModal(e.target.dataset.modal));
    });

    // Forms
    document
      .getElementById('form-new-file')
      .addEventListener('submit', (e) => this.handleNewFile(e));
    document
      .getElementById('form-new-folder')
      .addEventListener('submit', (e) => this.handleNewFolder(e));
  }

  /**
   * Show modal
   */
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  /**
   * Hide modal
   */
  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  /**
   * API call helper
   */
  async apiCall(endpoint, options = {}) {
    if (!this.authUI || !this.authUI.token) {
      throw new Error('Not authenticated');
    }

    const url = `http://localhost:8765/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authUI.token}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  /**
   * Show file library
   */
  async show() {
    if (!this.authUI || !this.authUI.isAuthenticated()) {
      alert('Please log in to access the file library');
      return;
    }

    this.showModal('modal-library');
    await this.refresh();
  }

  /**
   * Refresh file list
   */
  async refresh() {
    try {
      // Load folders
      const foldersData = await this.apiCall(
        `/folders${this.currentFolder ? `?parentId=${this.currentFolder}` : ''}`
      );
      this.folders = foldersData.folders;

      // Load files
      const filesData = await this.apiCall(
        `/files${this.currentFolder ? `?folderId=${this.currentFolder}` : '?folderId=null'}`
      );
      this.files = filesData.files;

      // Load stats
      const stats = await this.apiCall('/files/stats');

      this.renderFolders();
      this.renderFiles();
      this.renderBreadcrumb();
      this.renderStats(stats);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  }

  /**
   * Render folders
   */
  renderFolders() {
    const container = document.getElementById('folder-list');

    if (this.folders.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.folders
      .map(
        (folder) => `
      <div class="folder-item" data-id="${folder.id}">
        <span class="folder-icon">📁</span>
        <span class="folder-name">${this.escapeHtml(folder.name)}</span>
        <div class="folder-actions">
          <button class="btn-icon" onclick="fileLibrary.openFolder('${
            folder.id
          }')" title="Open">📂</button>
          <button class="btn-icon" onclick="fileLibrary.deleteFolder('${
            folder.id
          }')" title="Delete">🗑️</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Render files
   */
  renderFiles() {
    const container = document.getElementById('file-list');

    if (this.files.length === 0) {
      container.innerHTML = '<p class="empty-message">No files in this folder</p>';
      return;
    }

    container.innerHTML = this.files
      .map(
        (file) => `
      <div class="file-item" data-id="${file.id}">
        <span class="file-icon">📄</span>
        <div class="file-info">
          <div class="file-name">${this.escapeHtml(file.filename)}</div>
          <div class="file-meta">
            ${this.formatFileSize(file.size_bytes)} • 
            v${file.version} • 
            ${new Date(file.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div class="file-actions">
          <button class="btn-icon" onclick="fileLibrary.viewFile('${
            file.id
          }')" title="View">👁️</button>
          <button class="btn-icon" onclick="fileLibrary.downloadFile('${
            file.id
          }')" title="Download">⬇️</button>
          <button class="btn-icon" onclick="fileLibrary.deleteFile('${
            file.id
          }')" title="Delete">🗑️</button>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Render breadcrumb navigation
   */
  renderBreadcrumb() {
    const container = document.getElementById('breadcrumb');
    container.innerHTML = `
      <span class="breadcrumb-item" onclick="fileLibrary.openFolder(null)">🏠 Home</span>
      ${
        this.currentFolder
          ? '<span class="breadcrumb-separator">›</span><span class="breadcrumb-item active">Current Folder</span>'
          : ''
      }
    `;
  }

  /**
   * Render statistics
   */
  renderStats(stats) {
    const container = document.getElementById('file-stats');
    container.innerHTML = `
      <span>📊 ${stats.file_count} files</span>
      <span>💾 ${this.formatFileSize(stats.total_size_bytes)} total</span>
    `;
  }

  /**
   * Handle new file creation
   */
  async handleNewFile(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('new-file-error');
    errorDiv.classList.add('hidden');

    try {
      const filename = document.getElementById('new-file-name').value;
      const description = document.getElementById('new-file-description').value;
      const content = document.getElementById('new-file-content').value;
      const tagsInput = document.getElementById('new-file-tags').value;
      const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()) : [];

      await this.apiCall('/files', {
        method: 'POST',
        body: JSON.stringify({
          filename,
          description,
          content,
          folderId: this.currentFolder,
          tags,
        }),
      });

      this.hideModal('modal-new-file');
      document.getElementById('form-new-file').reset();
      await this.refresh();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Handle new folder creation
   */
  async handleNewFolder(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('new-folder-error');
    errorDiv.classList.add('hidden');

    try {
      const name = document.getElementById('new-folder-name').value;

      await this.apiCall('/folders', {
        method: 'POST',
        body: JSON.stringify({
          name,
          parentFolderId: this.currentFolder,
        }),
      });

      this.hideModal('modal-new-folder');
      document.getElementById('form-new-folder').reset();
      await this.refresh();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Open folder
   */
  async openFolder(folderId) {
    this.currentFolder = folderId;
    await this.refresh();
  }

  /**
   * View file details
   */
  async viewFile(fileId) {
    try {
      const file = await this.apiCall(`/files/${fileId}`);
      const modal = document.getElementById('modal-file-details');
      const content = document.getElementById('file-details-content');

      content.innerHTML = `
        <h2>${this.escapeHtml(file.filename)}</h2>
        <div class="file-details-meta">
          <p><strong>Size:</strong> ${this.formatFileSize(file.size_bytes)}</p>
          <p><strong>Version:</strong> ${file.version}</p>
          <p><strong>Created:</strong> ${new Date(file.created_at).toLocaleString()}</p>
          <p><strong>Updated:</strong> ${new Date(file.updated_at).toLocaleString()}</p>
        </div>
        <h3>Content Preview</h3>
        <pre class="code-preview">${this.escapeHtml(file.content.substring(0, 1000))}${
        file.content.length > 1000 ? '\n...' : ''
      }</pre>
      `;

      this.showModal('modal-file-details');
    } catch (error) {
      console.error('Failed to view file:', error);
      alert('Failed to load file');
    }
  }

  /**
   * Download file
   */
  async downloadFile(fileId) {
    try {
      const file = await this.apiCall(`/files/${fileId}`);
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await this.apiCall(`/files/${fileId}`, { method: 'DELETE' });
      await this.refresh();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  }

  /**
   * Delete folder
   */
  async deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      await this.apiCall(`/folders/${folderId}`, { method: 'DELETE' });
      await this.refresh();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder');
    }
  }

  /**
   * Handle search
   */
  async handleSearch(e) {
    const query = e.target.value.trim();

    if (query.length < 2) {
      await this.refresh();
      return;
    }

    try {
      const data = await this.apiCall(`/files/search?q=${encodeURIComponent(query)}`);
      this.files = data.files;
      this.folders = []; // Hide folders during search
      this.renderFolders();
      this.renderFiles();
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  /**
   * Clear library
   */
  clear() {
    this.files = [];
    this.folders = [];
    this.currentFolder = null;
  }

  /**
   * Utility: Format file size
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  window.FileLibraryUI = FileLibraryUI;
}

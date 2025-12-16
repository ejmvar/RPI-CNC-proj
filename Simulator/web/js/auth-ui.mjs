/**
 * Authentication UI Components
 * Vanilla JavaScript authentication forms
 */

class AuthUI {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('auth_token');
    this.onAuthChange = null;
  }

  /**
   * Initialize authentication UI
   */
  init() {
    // Check if user is already logged in
    if (this.token) {
      this.verifyToken();
    }

    // Add auth UI to page
    this.injectAuthUI();
    this.attachEventListeners();
  }

  /**
   * Inject authentication UI into page
   */
  injectAuthUI() {
    const authContainer = document.createElement('div');
    authContainer.id = 'auth-container';
    authContainer.innerHTML = `
      <div id="auth-status" class="auth-status">
        <div id="auth-logged-out" class="hidden">
          <button id="btn-show-login" class="btn btn-primary">Login</button>
          <button id="btn-show-register" class="btn btn-secondary">Register</button>
        </div>
        <div id="auth-logged-in" class="hidden">
          <span id="auth-username"></span>
          <button id="btn-profile" class="btn btn-secondary">Profile</button>
          <button id="btn-logout" class="btn btn-danger">Logout</button>
        </div>
      </div>

      <!-- Login Modal -->
      <div id="modal-login" class="modal hidden">
        <div class="modal-content">
          <span class="modal-close" data-modal="modal-login">&times;</span>
          <h2>Login</h2>
          <form id="form-login">
            <div class="form-group">
              <label for="login-username">Username or Email</label>
              <input type="text" id="login-username" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" required>
            </div>
            <div id="login-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Login</button>
          </form>
        </div>
      </div>

      <!-- Register Modal -->
      <div id="modal-register" class="modal hidden">
        <div class="modal-content">
          <span class="modal-close" data-modal="modal-register">&times;</span>
          <h2>Register</h2>
          <form id="form-register">
            <div class="form-group">
              <label for="register-username">Username</label>
              <input type="text" id="register-username" required minlength="3" maxlength="50">
            </div>
            <div class="form-group">
              <label for="register-email">Email</label>
              <input type="email" id="register-email" required>
            </div>
            <div class="form-group">
              <label for="register-display-name">Display Name (optional)</label>
              <input type="text" id="register-display-name" maxlength="100">
            </div>
            <div class="form-group">
              <label for="register-password">Password</label>
              <input type="password" id="register-password" required minlength="8">
            </div>
            <div class="form-group">
              <label for="register-password-confirm">Confirm Password</label>
              <input type="password" id="register-password-confirm" required>
            </div>
            <div id="register-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Register</button>
          </form>
        </div>
      </div>

      <!-- Profile Modal -->
      <div id="modal-profile" class="modal hidden">
        <div class="modal-content">
          <span class="modal-close" data-modal="modal-profile">&times;</span>
          <h2>Profile</h2>
          <div id="profile-info"></div>
          <form id="form-profile">
            <div class="form-group">
              <label for="profile-email">Email</label>
              <input type="email" id="profile-email" required>
            </div>
            <div class="form-group">
              <label for="profile-display-name">Display Name</label>
              <input type="text" id="profile-display-name">
            </div>
            <div id="profile-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Update Profile</button>
          </form>
          <hr>
          <h3>Change Password</h3>
          <form id="form-password">
            <div class="form-group">
              <label for="password-current">Current Password</label>
              <input type="password" id="password-current" required>
            </div>
            <div class="form-group">
              <label for="password-new">New Password</label>
              <input type="password" id="password-new" required minlength="8">
            </div>
            <div class="form-group">
              <label for="password-confirm">Confirm New Password</label>
              <input type="password" id="password-confirm" required>
            </div>
            <div id="password-error" class="error-message hidden"></div>
            <button type="submit" class="btn btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(authContainer);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Show modals
    document
      .getElementById('btn-show-login')
      .addEventListener('click', () => this.showModal('modal-login'));
    document
      .getElementById('btn-show-register')
      .addEventListener('click', () => this.showModal('modal-register'));
    document.getElementById('btn-profile').addEventListener('click', () => this.showProfile());
    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    // Close modals
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', (e) => this.hideModal(e.target.dataset.modal));
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.hideModal(modal.id);
      });
    });

    // Form submissions
    document.getElementById('form-login').addEventListener('submit', (e) => this.handleLogin(e));
    document
      .getElementById('form-register')
      .addEventListener('submit', (e) => this.handleRegister(e));
    document
      .getElementById('form-profile')
      .addEventListener('submit', (e) => this.handleProfileUpdate(e));
    document
      .getElementById('form-password')
      .addEventListener('submit', (e) => this.handlePasswordChange(e));
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
   * Update UI based on auth state
   */
  updateUI() {
    const loggedOut = document.getElementById('auth-logged-out');
    const loggedIn = document.getElementById('auth-logged-in');
    const usernameSpan = document.getElementById('auth-username');

    if (this.currentUser) {
      loggedOut.classList.add('hidden');
      loggedIn.classList.remove('hidden');
      usernameSpan.textContent = this.currentUser.displayName || this.currentUser.username;
    } else {
      loggedOut.classList.remove('hidden');
      loggedIn.classList.add('hidden');
    }

    if (this.onAuthChange) {
      this.onAuthChange(this.currentUser);
    }
  }

  /**
   * API call helper
   */
  async apiCall(endpoint, options = {}) {
    const url = `http://localhost:8765/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  /**
   * Handle login
   */
  async handleLogin(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('login-error');
    errorDiv.classList.add('hidden');

    try {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      const data = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('auth_token', this.token);

      this.hideModal('modal-login');
      this.updateUI();
      document.getElementById('form-login').reset();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Handle registration
   */
  async handleRegister(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('register-error');
    errorDiv.classList.add('hidden');

    try {
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const displayName = document.getElementById('register-display-name').value;
      const password = document.getElementById('register-password').value;
      const passwordConfirm = document.getElementById('register-password-confirm').value;

      if (password !== passwordConfirm) {
        throw new Error('Passwords do not match');
      }

      const data = await this.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, displayName, password }),
      });

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('auth_token', this.token);

      this.hideModal('modal-register');
      this.updateUI();
      document.getElementById('form-register').reset();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Show profile modal
   */
  async showProfile() {
    try {
      const data = await this.apiCall('/auth/me');

      document.getElementById('profile-email').value = data.email;
      document.getElementById('profile-display-name').value = data.displayName || '';

      const infoDiv = document.getElementById('profile-info');
      infoDiv.innerHTML = `
        <p><strong>Username:</strong> ${data.username}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><strong>Member since:</strong> ${new Date(data.createdAt).toLocaleDateString()}</p>
      `;

      this.showModal('modal-profile');
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  /**
   * Handle profile update
   */
  async handleProfileUpdate(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('profile-error');
    errorDiv.classList.add('hidden');

    try {
      const email = document.getElementById('profile-email').value;
      const displayName = document.getElementById('profile-display-name').value;

      const data = await this.apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ email, displayName }),
      });

      this.currentUser = data;
      this.updateUI();
      alert('Profile updated successfully');
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Handle password change
   */
  async handlePasswordChange(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('password-error');
    errorDiv.classList.add('hidden');

    try {
      const currentPassword = document.getElementById('password-current').value;
      const newPassword = document.getElementById('password-new').value;
      const confirmPassword = document.getElementById('password-confirm').value;

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      await this.apiCall('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      alert('Password changed successfully');
      document.getElementById('form-password').reset();
    } catch (error) {
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  /**
   * Verify token
   */
  async verifyToken() {
    try {
      const data = await this.apiCall('/auth/me');
      this.currentUser = data;
      this.updateUI();
    } catch (error) {
      // Token invalid, clear it
      this.token = null;
      this.currentUser = null;
      localStorage.removeItem('auth_token');
      this.updateUI();
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('auth_token');
    this.updateUI();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }
}

// Export for use in front.html
if (typeof window !== 'undefined') {
  window.AuthUI = AuthUI;
}

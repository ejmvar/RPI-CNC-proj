/**
 * Measurement Tools
 * Distance and angle measurement in 3D space
 */

class MeasurementTools {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.measurements = [];
    this.isActive = false;
    this.currentTool = null;
    this.points = [];
  }

  /**
   * Initialize measurement tools
   */
  init() {
    this.injectUI();
    this.attachEventListeners();
  }

  /**
   * Activate measurement tool
   */
  activate(tool = 'distance') {
    this.isActive = true;
    this.currentTool = tool;
    this.points = [];
    this.updateCursor();

    document.getElementById('measurement-status')?.classList.remove('hidden');
    this.updateStatus(`Click points to measure ${tool}`);
  }

  /**
   * Deactivate measurement tool
   */
  deactivate() {
    this.isActive = false;
    this.currentTool = null;
    this.points = [];
    this.updateCursor();

    document.getElementById('measurement-status')?.classList.add('hidden');
  }

  /**
   * Handle click for measurement
   */
  handleClick(intersect) {
    if (!this.isActive || !intersect) return;

    const point = intersect.point.clone();
    this.points.push(point);

    // Add visual marker
    this.addMarker(point);

    if (this.currentTool === 'distance' && this.points.length === 2) {
      this.measureDistance();
      this.deactivate();
    } else if (this.currentTool === 'angle' && this.points.length === 3) {
      this.measureAngle();
      this.deactivate();
    }

    this.updateStatus(this.getStatusMessage());
  }

  /**
   * Measure distance between two points
   */
  measureDistance() {
    if (this.points.length < 2) return;

    const [p1, p2] = this.points;
    const distance = p1.distanceTo(p2);

    const measurement = {
      id: Date.now().toString(),
      type: 'distance',
      points: [p1, p2],
      value: distance,
      label: `${distance.toFixed(2)} mm`,
    };

    this.measurements.push(measurement);
    this.drawMeasurement(measurement);
    this.updateMeasurementsList();
  }

  /**
   * Measure angle between three points
   */
  measureAngle() {
    if (this.points.length < 3) return;

    const [p1, p2, p3] = this.points;

    // Vectors from p2 to p1 and p2 to p3
    const v1 = new THREE.Vector3().subVectors(p1, p2).normalize();
    const v2 = new THREE.Vector3().subVectors(p3, p2).normalize();

    // Calculate angle in degrees
    const angle = v1.angleTo(v2) * (180 / Math.PI);

    const measurement = {
      id: Date.now().toString(),
      type: 'angle',
      points: [p1, p2, p3],
      value: angle,
      label: `${angle.toFixed(1)}°`,
    };

    this.measurements.push(measurement);
    this.drawMeasurement(measurement);
    this.updateMeasurementsList();
  }

  /**
   * Draw measurement visualization
   */
  drawMeasurement(measurement) {
    const group = new THREE.Group();
    group.userData.measurementId = measurement.id;

    if (measurement.type === 'distance') {
      // Draw line
      const geometry = new THREE.BufferGeometry().setFromPoints(measurement.points);
      const material = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      group.add(line);

      // Add label
      const midPoint = new THREE.Vector3()
        .addVectors(measurement.points[0], measurement.points[1])
        .multiplyScalar(0.5);

      const label = this.createLabel(measurement.label, midPoint);
      group.add(label);
    } else if (measurement.type === 'angle') {
      // Draw lines
      const [p1, p2, p3] = measurement.points;
      const points1 = [p2, p1];
      const points2 = [p2, p3];

      const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
      const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
      const material = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 });

      group.add(new THREE.Line(geometry1, material));
      group.add(new THREE.Line(geometry2, material));

      // Add label at vertex
      const label = this.createLabel(measurement.label, p2);
      group.add(label);
    }

    this.scene.add(group);
    measurement.object = group;
  }

  /**
   * Create text label (sprite)
   */
  createLabel(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'Bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.position.copy(position);
    sprite.scale.set(10, 2.5, 1);

    return sprite;
  }

  /**
   * Add visual marker at point
   */
  addMarker(point) {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(point);
    this.scene.add(marker);
  }

  /**
   * Delete measurement
   */
  deleteMeasurement(id) {
    const index = this.measurements.findIndex((m) => m.id === id);
    if (index === -1) return;

    const measurement = this.measurements[index];
    if (measurement.object) {
      this.scene.remove(measurement.object);
    }

    this.measurements.splice(index, 1);
    this.updateMeasurementsList();
  }

  /**
   * Clear all measurements
   */
  clearAll() {
    this.measurements.forEach((m) => {
      if (m.object) {
        this.scene.remove(m.object);
      }
    });
    this.measurements = [];
    this.updateMeasurementsList();
  }

  /**
   * Update measurements list UI
   */
  updateMeasurementsList() {
    const list = document.getElementById('measurements-list');
    if (!list) return;

    if (this.measurements.length === 0) {
      list.innerHTML = '<p class="empty-message">No measurements</p>';
      return;
    }

    list.innerHTML = this.measurements
      .map(
        (m) => `
      <div class="measurement-item" data-id="${m.id}">
        <span class="measurement-icon">${m.type === 'distance' ? '📏' : '📐'}</span>
        <span class="measurement-value">${m.label}</span>
        <button class="btn-icon" onclick="measurementTools.deleteMeasurement('${
          m.id
        }')" title="Delete">🗑️</button>
      </div>
    `
      )
      .join('');
  }

  /**
   * Get status message
   */
  getStatusMessage() {
    if (!this.isActive) return '';

    if (this.currentTool === 'distance') {
      return this.points.length === 0 ? 'Click first point' : 'Click second point';
    } else if (this.currentTool === 'angle') {
      return this.points.length === 0
        ? 'Click first point'
        : this.points.length === 1
        ? 'Click vertex point'
        : 'Click third point';
    }

    return '';
  }

  /**
   * Update status message
   */
  updateStatus(message) {
    const status = document.getElementById('measurement-status-text');
    if (status) {
      status.textContent = message;
    }
  }

  /**
   * Update cursor
   */
  updateCursor() {
    document.body.style.cursor = this.isActive ? 'crosshair' : 'default';
  }

  /**
   * Inject measurement tools UI
   */
  injectUI() {
    if (document.getElementById('measurement-tools-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'measurement-tools-panel';
    panel.className = 'measurement-tools-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>📏 Measurements</h3>
        <button class="btn-collapse" title="Collapse">−</button>
      </div>
      <div class="panel-content">
        <div class="tool-buttons">
          <button id="btn-measure-distance" class="btn btn-sm btn-secondary">📏 Distance</button>
          <button id="btn-measure-angle" class="btn btn-sm btn-secondary">📐 Angle</button>
          <button id="btn-clear-measurements" class="btn btn-sm btn-danger">🗑️ Clear</button>
        </div>
        <div id="measurement-status" class="measurement-status hidden">
          <span id="measurement-status-text"></span>
          <button id="btn-cancel-measurement" class="btn-icon" title="Cancel">✖️</button>
        </div>
        <div id="measurements-list" class="measurements-list">
          <p class="empty-message">No measurements</p>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.attachUIEventListeners();
  }

  /**
   * Attach UI event listeners
   */
  attachUIEventListeners() {
    // Collapse button
    document
      .querySelector('.measurement-tools-panel .btn-collapse')
      ?.addEventListener('click', (e) => {
        const panel = document.getElementById('measurement-tools-panel');
        panel.classList.toggle('collapsed');
        e.target.textContent = panel.classList.contains('collapsed') ? '+' : '−';
      });

    // Tool buttons
    document.getElementById('btn-measure-distance')?.addEventListener('click', () => {
      this.activate('distance');
    });

    document.getElementById('btn-measure-angle')?.addEventListener('click', () => {
      this.activate('angle');
    });

    document.getElementById('btn-clear-measurements')?.addEventListener('click', () => {
      if (confirm('Clear all measurements?')) {
        this.clearAll();
      }
    });

    document.getElementById('btn-cancel-measurement')?.addEventListener('click', () => {
      this.deactivate();
    });
  }

  /**
   * Attach event listeners (called externally)
   */
  attachEventListeners() {
    // This will be called by the main app to wire up canvas clicks
  }
}

// Export
if (typeof window !== 'undefined') {
  window.MeasurementTools = MeasurementTools;
}

export default MeasurementTools;

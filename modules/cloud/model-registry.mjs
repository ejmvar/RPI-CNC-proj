/**
 * Model Registry (scaffold)
 * Stores model metadata and artifact references.
 */

export class ModelRegistry {
  constructor(options = {}) {
    this.models = new Map();
    this.listeners = {};
  }

  register(modelId, meta = {}) {
    if (!modelId) throw new Error('modelId required');
    this.models.set(modelId, { id: modelId, meta });
    this.emit('modelRegistered', { modelId });
    return true;
  }

  getModel(modelId) {
    return this.models.get(modelId) || null;
  }

  listModels() {
    return Array.from(this.models.keys());
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((cb) => cb(data));
  }
}

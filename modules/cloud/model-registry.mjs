/**
 * Model Registry (scaffold)
 * Stores model metadata and artifact references.
 */

import crypto from 'node:crypto';

export class ModelRegistry {
  constructor(options = {}) {
    this.options = { persistPath: options.persistPath || null };
    this.models = new Map(); // modelId -> { id, createdAt, versions: [] }
    this.listeners = {};
  }

  _hashArtifact(artifact) {
    const buf = Buffer.isBuffer(artifact) ? artifact : Buffer.from(artifact);
    const h = crypto.createHash('sha256').update(buf).digest('hex');
    return `sha256:${h}`;
  }

  register(modelId, { versionId, meta = {}, artifact = null } = {}) {
    if (!modelId || !versionId) throw new Error('modelId and versionId required');

    let model = this.models.get(modelId);
    if (!model) {
      model = { id: modelId, createdAt: Date.now(), versions: [] };
      this.models.set(modelId, model);
      this.emit('modelRegistered', { modelId });
    }

    if (model.versions.find((v) => v.versionId === versionId)) {
      throw new Error('versionId already exists for this model');
    }

    const version = {
      versionId,
      createdAt: Date.now(),
      meta,
      artifactHash: null,
      artifactSize: null,
      status: 'staging',
    };

    if (artifact) {
      const buf = Buffer.isBuffer(artifact) ? artifact : Buffer.from(artifact);
      version.artifactHash = this._hashArtifact(buf);
      version.artifactSize = buf.length;
    }

    model.versions.push(version);
    this.emit('versionRegistered', { modelId, versionId });

    return version;
  }

  getModel(modelId) {
    const model = this.models.get(modelId);
    return model ? JSON.parse(JSON.stringify(model)) : null;
  }

  listModels() {
    return Array.from(this.models.keys());
  }

  promoteVersion(modelId, versionId, target = 'prod') {
    const model = this.models.get(modelId);
    if (!model) throw new Error('model not found');
    const version = model.versions.find((v) => v.versionId === versionId);
    if (!version) throw new Error('version not found');
    if (!['staging', 'prod', 'deprecated'].includes(target)) throw new Error('invalid target');

    version.status = target;
    this.emit('modelPromoted', { modelId, versionId, target });
    return true;
  }

  validateVersion(modelId, versionId, artifact) {
    const model = this.models.get(modelId);
    if (!model) throw new Error('model not found');
    const version = model.versions.find((v) => v.versionId === versionId);
    if (!version) throw new Error('version not found');
    if (!version.artifactHash) throw new Error('no artifact stored for version');

    const hash = this._hashArtifact(artifact);
    return hash === version.artifactHash;
  }

  deleteModel(modelId) {
    if (!this.models.has(modelId)) return false;
    this.models.delete(modelId);
    this.emit('modelDeleted', { modelId });
    return true;
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((cb) => cb(JSON.parse(JSON.stringify(data))));
  }
}

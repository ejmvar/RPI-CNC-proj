import EventEmitter from 'events';
import protoLoader from '@grpc/proto-loader';
import grpc from '@grpc/grpc-js';

export class RemoteInferenceManager extends EventEmitter {
  constructor({
    modelRegistry,
    batchSize = 8,
    batchTimeoutMs = 50,
    allowNonProd = false,
    logger = console,
  } = {}) {
    super();
    this.modelRegistry = modelRegistry;
    this.batchSize = batchSize;
    this.batchTimeoutMs = batchTimeoutMs;
    this.allowNonProd = allowNonProd;
    this.logger = logger;

    // key: `${modelId}:${versionId}` -> { queue: [], timer: Timeout }
    this._queues = new Map();

    // runners: key -> async function(batchInputs) => batchOutputs
    this._runners = new Map();

    // simple metrics
    this._metrics = { totalRequests: 0, totalBatches: 0, totalLatencyMs: 0 };
  }

  registerLocalRunner(modelId, versionId, runnerFn) {
    const key = `${modelId}:${versionId}`;
    this._runners.set(key, runnerFn);
  }

  registerRemoteRunner(modelId, versionId, descriptor = {}) {
    // descriptor: { type: 'http', endpoint: 'http://...', headers: { ... } }
    const key = `${modelId}:${versionId}`;
    if (!descriptor.type) throw new Error('RemoteRunnerDescriptorRequired');

    if (descriptor.type === 'http') {
      const runnerFn = async (inputs) => {
        // POST { inputs } -> expect JSON { outputs: [...] }
        const res = await fetch(descriptor.endpoint, {
          method: 'POST',
          headers: Object.assign({ 'content-type': 'application/json' }, descriptor.headers || {}),
          body: JSON.stringify({ inputs }),
        });
        if (!res.ok) throw new Error(`RemoteRunnerError: ${res.status}`);
        const body = await res.json();
        if (Array.isArray(body.outputs)) return body.outputs;
        // support direct array response for simplicity
        if (Array.isArray(body)) return body;
        throw new Error('InvalidRemoteRunnerResponse');
      };
      this._runners.set(key, runnerFn);
      if (!this._remoteDescriptors) this._remoteDescriptors = new Map();
      this._remoteDescriptors.set(key, descriptor);
      return true;
    }

    if (descriptor.type === 'mq') {
      // descriptor: { type: 'mq', sendFn: async (inputs) => outputs }
      if (typeof descriptor.sendFn !== 'function') throw new Error('MQRunnerRequiresSendFn');
      const runnerFn = async (inputs) => {
        return descriptor.sendFn(inputs);
      };
      this._runners.set(key, runnerFn);
      if (!this._remoteDescriptors) this._remoteDescriptors = new Map();
      this._remoteDescriptors.set(key, descriptor);
      return true;
    }

    if (descriptor.type === 'grpc') {
      // descriptor: { type: 'grpc', address, protoPath, packageName, serviceName, methodName }
      // If mockCall provided, use it for tests; otherwise create a real gRPC client
      if (typeof descriptor.mockCall === 'function') {
        const runnerFn = async (inputs) => descriptor.mockCall(inputs);
        this._runners.set(key, runnerFn);
        if (!this._remoteDescriptors) this._remoteDescriptors = new Map();
        this._remoteDescriptors.set(key, descriptor);
        return true;
      }

      // require server address and protoPath
      if (
        !descriptor.address ||
        !descriptor.protoPath ||
        !descriptor.packageName ||
        !descriptor.serviceName ||
        !descriptor.methodName
      ) {
        throw new Error('GRPCRunnerDescriptorMissingFields');
      }

      // load proto and create client
      const packageDef = protoLoader.loadSync(descriptor.protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const grpcObj = grpc.loadPackageDefinition(packageDef)[descriptor.packageName];
      if (!grpcObj) throw new Error('GRPCPackageLoadFailed');
      const Service = grpcObj[descriptor.serviceName];
      if (!Service) throw new Error('GRPCServiceNotFound');

      const client = new Service(descriptor.address, grpc.credentials.createInsecure());

      const runnerFn = async (inputs) => {
        // Assume unary call where server returns { outputs: [...] } aligned
        return new Promise((resolve, reject) => {
          client[descriptor.methodName]({ inputs }, (err, resp) => {
            if (err) return reject(err);
            if (!resp) return reject(new Error('EmptyGRPCResponse'));
            if (Array.isArray(resp.outputs)) return resolve(resp.outputs);
            // allow direct array
            if (Array.isArray(resp)) return resolve(resp);
            // otherwise assume response itself is the output for single input
            return resolve([resp]);
          });
        });
      };

      // register and keep client reference for potential shutdown
      this._runners.set(key, runnerFn);
      if (!this._remoteDescriptors) this._remoteDescriptors = new Map();
      this._remoteDescriptors.set(key, Object.assign({}, descriptor, { _grpcClient: client }));
      return true;
    }

    throw new Error('UnsupportedRemoteRunnerType');
  }

  getMetrics() {
    const avgLatency =
      this._metrics.totalBatches === 0
        ? 0
        : this._metrics.totalLatencyMs / this._metrics.totalBatches;
    return {
      totalRequests: this._metrics.totalRequests,
      totalBatches: this._metrics.totalBatches,
      avgBatchLatencyMs: avgLatency,
    };
  }

  async infer({
    modelId,
    versionId,
    inputs,
    requestId = `rid-${Date.now()}-${Math.random()}`,
    meta,
  } = {}) {
    if (!modelId || !versionId) throw new Error('modelId and versionId required');

    // Validate model / version via registry if available
    if (this.modelRegistry) {
      const model = await this.modelRegistry.getModel(modelId);
      if (!model) throw new Error('ModelNotFound');
      const ver = model.versions.find((v) => v.versionId === versionId);
      if (!ver) throw new Error('VersionNotFound');
      if (!this.allowNonProd && ver.status !== 'prod') {
        throw new Error('VersionNotProduction');
      }
    }

    this._metrics.totalRequests += 1;

    const key = `${modelId}:${versionId}`;
    if (!this._queues.has(key)) {
      this._queues.set(key, { queue: [], timer: null });
    }

    const slot = this._queues.get(key);

    return new Promise((resolve, reject) => {
      slot.queue.push({ inputs, requestId, resolve, reject, enqueuedAt: Date.now() });
      this.emit('requestEnqueued', { modelId, versionId, requestId });
      // dispatch if we reached batch size
      if (slot.queue.length >= this.batchSize) {
        this._dispatchBatch(key);
        return;
      }

      // otherwise set a timer
      if (!slot.timer) {
        slot.timer = setTimeout(() => {
          this._dispatchBatch(key);
        }, this.batchTimeoutMs);
      }
    });
  }

  async _dispatchBatch(key) {
    const slot = this._queues.get(key);
    if (!slot || slot.queue.length === 0) return;

    if (slot.timer) {
      clearTimeout(slot.timer);
      slot.timer = null;
    }

    const batch = slot.queue.splice(0, this.batchSize);
    const modelVersion = key.split(':');
    const modelId = modelVersion[0];
    const versionId = modelVersion[1];

    const runner = this._runners.get(key);
    if (!runner) {
      const err = new Error('RunnerNotFound');
      batch.forEach((item) => item.reject(err));
      batch.forEach((item) =>
        this.emit('requestFailed', { modelId, versionId, requestId: item.requestId, error: err })
      );
      return;
    }

    const inputs = batch.map((b) => b.inputs);
    this.emit('batchDispatched', { modelId, versionId, size: inputs.length });
    const start = Date.now();
    this._metrics.totalBatches += 1;
    try {
      const outputs = await runner(inputs);
      const latency = Date.now() - start;
      this._metrics.totalLatencyMs += latency;
      outputs.forEach((out, i) => {
        const item = batch[i];
        item.resolve({
          requestId: item.requestId,
          modelId,
          versionId,
          outputs: out,
          metrics: { latencyMs: latency },
        });
        this.emit('requestCompleted', { modelId, versionId, requestId: item.requestId });
      });
    } catch (err) {
      batch.forEach((item) => item.reject(err));
      batch.forEach((item) =>
        this.emit('requestFailed', { modelId, versionId, requestId: item.requestId, error: err })
      );
    }
  }

  async shutdown() {
    // dispatch any remaining queues
    const keys = Array.from(this._queues.keys());
    for (const key of keys) {
      await this._dispatchBatch(key);
    }
  }
}

export default RemoteInferenceManager;

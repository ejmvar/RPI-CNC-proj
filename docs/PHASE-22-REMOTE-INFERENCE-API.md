# Phase 22.2 Remote Inference - API & MVP

## Goals

- Provide a simple Remote Inference Manager (RIM) that accepts inference requests for registered models and returns responses.
- Support batching, model routing by modelId/version, per-request metadata, basic metrics and per-request logging.
- Integrate with the in-memory Model Registry (docs/PHASE-22-MODEL-REGISTRY-API.md) to look up model artifact/meta and ensure version is promoted to `prod` before accepting production inference.

## API surface (module)

- class RemoteInferenceManager
  - constructor({ modelRegistry, batchSize=8, batchTimeoutMs=50, logger })
  - async infer({ modelId, versionId, inputs, requestId, meta })
    - returns { requestId, modelId, versionId, outputs, metrics }
  - registerLocalRunner(modelId, versionId, runnerFn)
    - runnerFn(batchInputs) => Promise<batchOutputs>
  - getMetrics() => { requests, batches, avgLatencyMs }
  - shutdown()

## Behavior

- On `infer()` call, RIM enqueues request into a batch queue per model-version.
- When batch size >= batchSize or oldest request in queue older than batchTimeoutMs, create a batch and dispatch to runner.
- If no runner is registered for model/version, RIM should throw a `RunnerNotFound` error.
- RIM validates model/version with Model Registry; if version status !== 'prod' and environment is production, reject with validation error (MVP: allow non-prod in test mode via constructor option).
- RIM emits events: `requestEnqueued`, `batchDispatched`, `requestCompleted`, `requestFailed`.
- Provide simple metrics: totalRequests, totalBatches, averageBatchSize, averageLatencyMs.

## Acceptance Criteria

- Unit tests covering:
  - batching semantics (size and timeout)
  - routing to correct runner
  - metrics update
  - errors when model/version not found or runner not registered
- Integration smoke test:
  - register a model/version in Model Registry (promote to prod), register a simple runner with RIM, send multiple infer() calls, assert responses match and metrics reflect batching.

## Notes

- This MVP uses in-process runners (no remote worker orchestration yet).
- Keep implementation lightweight; design hooks for future distributed dispatching.

## Pluggable Runners (Phase 22.3)

- RIM supports registering both in-process runners (functions) via `registerLocalRunner()` and remote runners via `registerRemoteRunner()`.
- Remote runner descriptor example (HTTP): `{ type: 'http', endpoint: 'http://host:port/infer', headers: {...} }`.
- For HTTP runners RIM will POST `{ inputs }` and expect JSON `{ outputs: [...] }` in response; this allows pluggable remote inference backends to be integrated without changing the batcher.
- Future: add support for additional runner types (gRPC, message-queue dispatch, worker pools) and secure credentials management.

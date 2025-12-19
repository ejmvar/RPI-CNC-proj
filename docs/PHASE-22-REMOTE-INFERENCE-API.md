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
- Supported runner descriptor types (MVP):
  - `http` — `{ type: 'http', endpoint: 'http://host:port/infer', headers?: {...} }`
- `mq` — `{ type: 'mq', sendFn: async (inputs) => outputs }` (in-memory or adapter-based MQ send function) or `{ type: 'mq', amqpUrl, requestQueue, responseTimeoutMs?, retry?: { maxAttempts, initialBackoffMs, multiplier }, deadLetterQueue? }` when using AMQP. RIM will support retries, response timeouts, and an optional dead-letter queue for failed requests.
- `grpc` — `{ type: 'grpc', mockCall: async (inputs) => outputs }` (MVP supports `mockCall` for testability) or `{ type: 'grpc', address, protoPath, packageName, serviceName, methodName, credentials?: { type: 'tls', rootCert?, privateKey?, certChain? } , bearerToken?, metadataProvider?: async ({inputs}) => ({ k: v }) }` when using a real gRPC client. Metadata provider (or bearerToken) allows per-call authorization headers to be sent to the gRPC server.
- For `mq`, RIM will call the provided `sendFn(inputs)` and expect an array of outputs aligned with inputs. When using AMQP, RIM supports configurable retry/backoff and optional dead-letter semantics.
- For `grpc`, RIM supports `mockCall` for hermetic tests and now supports creating a real gRPC client with optional TLS credentials and per-call metadata for authentication/authorization.

### Phase 22.3 — What changed

- **gRPC:** added per-call metadata support via `metadataProvider`, bearer-token support, and TLS client credentials (`credentials.type='tls'` with PEM strings).
- **AMQP:** added retry/backoff, response timeout handling, `visibilityTimeoutMs` (sets queue message `expiration`) and optional dead-letter queue behavior.
- **Tests:** added unit & integration tests covering gRPC auth, TLS, and AMQP retry behavior.
- **Docs:** API docs updated to include new descriptor fields and guidance on usage.

# Phase 22.2: Model Registry — Design Doc & API Spec

Short and focused design for the Model Registry (MVP).

## Purpose

Store model metadata and artifact references for remote inference and training pipelines. Provide simple versioning, checksum verification, and promotion (staging → prod).

## Core concepts

- Model: top-level identifier (modelId).
- Version: a model can have multiple versions, each with metadata and an artifact (optional). Versions are tracked in `versions[]` per model.
- Artifact: binary blob (base64 or Buffer in tests) with SHA-256 checksum and size.
- Promotion: mark a specific version as `staging` or `prod`.

## Data model (in-memory)

Model record:
{
id: string,
createdAt: number,
versions: [{
versionId: string,
createdAt: number,
meta: object,
artifactHash: 'sha256:...',
artifactSize: number,
status: 'staging'|'prod'|'deprecated'
}]
}

## API (public methods)

- register(modelId, { versionId, meta, artifact })

  - Registers a new model if missing or appends a new version.
  - If `artifact` provided, compute SHA-256 and store hash + size.
  - Emits `modelRegistered` and `versionRegistered` events.
  - Throws on invalid input or duplicate versionId.

- getModel(modelId)

  - Returns model record or null.

- listModels()

  - Returns array of model ids.

- promoteVersion(modelId, versionId, target)

  - Valid targets: `staging`, `prod`, `deprecated`.
  - Sets `status` on the specified version and emits `modelPromoted`.

- validateVersion(modelId, versionId, artifact)

  - Computes SHA-256 on provided artifact and compares with stored hash; returns boolean.

- deleteModel(modelId)

  - Removes model and all versions; emits `modelDeleted`.

- on(event, cb) / emit(event, data)
  - Simple event emitter for `modelRegistered`, `versionRegistered`, `modelPromoted`, `modelDeleted`.

## Validation rules

- modelId and versionId are required strings.
- If an artifact is provided it must be Buffer or base64-convertible string.
- Duplicate versionId under the same model throws an error.

## Persistence

- MVP: in-memory Map. Design is isolated so a persistence layer can be added later (disk/DB).

## Tests

- Unit tests to cover registration, duplicate prevention, artifact checksum validation, promotion, deletion, and edge cases.

## Acceptance Criteria

- All new unit tests pass locally.
- API follows documented behavior.
- Basic event emission validated.

---

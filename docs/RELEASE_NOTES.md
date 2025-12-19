# Release Notes — Phase 22.3 (Remote Inference)

## Summary

Phase 22.3 introduces enhancements to the Remote Inference system focused on secure gRPC and robust AMQP behavior.

## Highlights

- gRPC: per-call metadata support (`metadataProvider`), bearer token support, and TLS client credentials (`credentials.type='tls'` with PEM strings).
- AMQP: retry/backoff strategy, response timeouts, visibility timeout support (`visibilityTimeoutMs` sets message `expiration`), and optional dead-letter queue handling.
- Tests: new unit and integration tests for gRPC auth/metadata, TLS gRPC, and AMQP retry semantics.

## Merge checklist (quick)

- [ ] All CI jobs pass (including `remote-inference-checks`)
- [ ] New unit & integration tests pass locally and in CI
- [ ] Documentation updated (API docs and CHANGELOG) ✅
- [ ] PR has at least one approving review
- [ ] Squash/rebase commits as desired
- [ ] Merge and create a release/tag

## Notes

- The CI includes a dedicated job `remote-inference-checks` that runs the gRPC/TLS and AMQP tests as part of PR validation.
- If any CI check fails, re-run the tests locally using `npm run test:unit` and `npm run test:integration` for the specific files (see `docs/README.md` for running tests).

# Tests layout and policy

This repository organizes tests into three logical areas. The project enforces a requirement that every change include tests where appropriate.

- tests/ut/ — unit tests (small, fast, isolated functions)
- tests/it/ — integration tests (interactions between modules)
- tests/e2e/ — end-to-end / smoke tests (file-level checks, basic UI presence)

Run tests with `npm test` or the specific test commands in `package.json`.

When adding features, include tests under `tests/ut` for the module's primary behavior, `tests/it` for cross-module flows and `tests/e2e` for smoke tests that assert the simulator page or server endpoints exist.

SHELL := /bin/bash
.PHONY: help install install-playwright test test-unit test-integration test-e2e test-browser demo serve lint format ci

help:
	@echo "Makefile - common tasks for this repository"
	@echo
	@echo "make install             # install dependencies (npm ci)"
	@echo "make install-playwright  # install playwright browsers after deps"
	@echo "make test                # run all tests (npm test)"
	@echo "make test-unit           # run unit tests"
	@echo "make test-integration    # run integration tests"
	@echo "make test-e2e            # run e2e tests"
	@echo "make test-browser        # run browser e2e test (requires Playwright + ws)"
	@echo "make demo                # run the collab demo server (node scripts/collab-demo.js)"
	@echo "make serve               # launch the static serve helper (scripts/serve.sh)"
	@echo "make lint                # run lint (eslint)"
	@echo "make ci                  # run lightweight CI locally: install -> tests"

install:
	npm ci

install-playwright: install
	npx playwright install --with-deps || true

test:
	npm test

test-unit:
	npm run test:unit -- --runInBand

test-integration:
	npm run test:integration -- --runInBand

test-e2e:
	npm run test:e2e -- --runInBand

test-browser:
	npm test -- tests/e2e/collab-browser.test.js --runInBand || true

demo:
	node scripts/collab-demo.js

demo-headless:
	node scripts/collab-headless-demo.js

serve:
	./scripts/serve.sh

lint:
	npm run lint

format:
	prettier --write "**/*.{js,mjs,md,json,css,html}"

ci: install test-unit test-integration test-e2e
	@echo "Browser e2e tests require Playwright and browser binaries; run make install-playwright && make test-browser to run them locally"

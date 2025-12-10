SHELL := /bin/bash
.PHONY: help install install-playwright test test-unit test-integration test-e2e test-browser demo serve lint format ci

help:
	@echo "========================================="
	@echo "RPI-CNC-proj - Raspberry Pi CNC Simulator"
	@echo "========================================="
	@echo
	@echo "📦 Installation:"
	@echo "  make install             - Install dependencies (npm ci)"
	@echo "  make install-playwright  - Install playwright browsers"
	@echo
	@echo "🧪 Testing:"
	@echo "  make test                - Run all tests"
	@echo "  make test-unit           - Run unit tests only"
	@echo "  make test-integration    - Run integration tests only"
	@echo "  make test-e2e            - Run end-to-end tests"
	@echo "  make test-browser        - Run browser e2e tests (requires Playwright)"
	@echo "  make test-visual         - Run visual snapshot tests"
	@echo "  make test-coverage       - Run tests with coverage report"
	@echo "  make test-quick          - Quick tests (skip WebSocket tests)"
	@echo "  make test-grbl           - Test mock GRBL firmware"
	@echo "  make benchmark           - Run performance benchmarks"
	@echo
	@echo "🚀 Development:"
	@echo "  make serve               - Start development server (http://localhost:8000)"
	@echo "  make demo                - Run collaboration demo server"
	@echo "  make dev                 - Serve + watch tests"
	@echo "  make lint                - Run linter"
	@echo "  make fix                 - Auto-fix linting issues"
	@echo "  make format              - Format code with prettier"
	@echo
	@echo "🔧 Utilities:"
	@echo "  make clean               - Remove generated files"
	@echo "  make baseline            - Generate visual regression baselines"
	@echo "  make status              - Show project status"
	@echo "  make commit-check        - Run pre-commit checks"
	@echo
	@echo "🤖 Firmware Integration:"
	@echo "  make run-grbl            - Run mock GRBL simulator"
	@echo "  make firmware-info       - Show firmware integration options"
	@echo
	@echo "📊 Performance:"
	@echo "  make perf-report         - Generate performance analysis"
	@echo "  make optimization-tips   - Show optimization suggestions"
	@echo
	@echo "🔄 CI/CD:"
	@echo "  make ci                  - Run lightweight CI locally"
	@echo
	@echo "Quick aliases: t=test-quick, s=serve, c=clean, l=lint, b=benchmark"

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

test-visual:
	npm test -- tests/e2e/visual-snapshot.test.js --runInBand || true

baseline:
	npm test -- tests/e2e/visual-snapshot.test.js --runInBand --updateSnapshot || true

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

# Additional targets for enhanced workflow

test-coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage
	@echo ""
	@echo "✓ Coverage report: coverage/index.html"

test-quick:
	@echo "Running quick tests (excluding WebSocket tests)..."
	npx jest tests/ut/ tests/it/ --testPathIgnorePatterns="collab-ws|ws-bridge" --testTimeout=10000

test-grbl:
	@echo "Testing mock GRBL firmware..."
	npx jest tests/ut/backend/mock-grbl.test.js

benchmark:
	@echo "Running performance benchmarks..."
	npx jest tests/ut/gcode/parser.benchmark.test.js --testTimeout=30000

clean:
	@echo "Cleaning generated files..."
	rm -rf coverage/ node_modules/.cache/ .jest-cache/
	find . -name "*.log" -type f -delete
	@echo "✓ Cleanup complete"

fix:
	@echo "Auto-fixing linting issues..."
	npx eslint . --ext .js,.mjs --fix || true

status:
	@echo "=== Project Status ==="
	@echo ""
	@echo "Git:"
	@git status --short 2>/dev/null || echo "  Not a git repository"
	@echo ""
	@echo "Tests (last run):"
	@npx jest tests/ut/ tests/it/ --testPathIgnorePatterns="collab-ws|ws-bridge" --testTimeout=10000 --passWithNoTests 2>&1 | tail -8 || echo "  Run 'make test' first"

commit-check:
	@echo "Running pre-commit checks..."
	@make lint
	@make test-quick
	@echo "✓ Ready to commit"

run-grbl:
	@echo "Mock GRBL Firmware Simulator"
	@echo "========================================"
	@node -e "const {MockGRBL}=require('./modules/backend/firmware/mock-grbl.js');const g=new MockGRBL();g.on('data',d=>console.log('←',d));g.on('stateChange',s=>console.log('State:',s));console.log('Sending status query (?)...');g.send('?');console.log('\\nSending homing ($$H)...');g.send('$$H');setTimeout(()=>{console.log('\\nSending move (G0 X10 Y10)...');g.send('G0 X10 Y10');setTimeout(()=>g.send('?'),50);},100);"

firmware-info:
	@echo "========================================="
	@echo "Firmware Integration Alternatives"
	@echo "========================================="
	@echo ""
	@echo "1. Mock GRBL (Built-in)"
	@echo "   → modules/backend/firmware/mock-grbl.js"
	@echo "   → Full GRBL v1.1 command simulation"
	@echo "   → Use: make run-grbl"
	@echo "   → Testing: make test-grbl"
	@echo ""
	@echo "2. Serial Port Integration (GRBL/Marlin)"
	@echo "   → Install: npm install serialport"
	@echo "   → Connect: /dev/ttyUSB0 or /dev/ttyACM0"
	@echo "   → Baud: 115200 (GRBL) or 250000 (Marlin)"
	@echo "   → Example:"
	@echo "     const SerialPort = require('serialport');"
	@echo "     const port = new SerialPort('/dev/ttyUSB0', {baudRate: 115200});"
	@echo ""
	@echo "3. WebSocket Bridge (Remote CNC)"
	@echo "   → Use modules/backend/gateway/ws-bridge.js"
	@echo "   → Connect simulator to remote GRBL over WebSocket"
	@echo "   → Requires 'ws' package: npm install ws"
	@echo ""
	@echo "4. HTTP REST API (Custom Controller)"
	@echo "   → Use modules/backend/server/http-server.js"
	@echo "   → RESTful endpoints for G-code streaming"
	@echo "   → Firmware agnostic"
	@echo ""
	@echo "5. GPIO Direct Control (Raspberry Pi)"
	@echo "   → Install: npm install pigpio"
	@echo "   → Direct stepper motor control"
	@echo "   → No external controller needed"
	@echo ""
	@echo "See modules/backend/firmware/ for implementations"

perf-report:
	@echo "========================================="
	@echo "Performance Analysis"
	@echo "========================================="
	@echo ""
	@echo "Running benchmarks..."
	@make benchmark 2>&1 | grep -E "(⏱️|💾|✓)" || echo "Run 'make benchmark' first"
	@echo ""
	@echo "Coverage metrics:"
	@npx jest --coverage --coverageReporters=text-summary --testPathIgnorePatterns="collab-ws|ws-bridge|e2e" 2>&1 | tail -10 || echo "Run 'make test-coverage' first"

optimization-tips:
	@echo "========================================="
	@echo "Performance Optimization Suggestions"
	@echo "========================================="
	@echo ""
	@echo "🚀 G-Code Parser:"
	@echo "   • Current: ~172k lines/sec"
	@echo "   • Target: 500k+ lines/sec"
	@echo "   • Tips:"
	@echo "     - Use typed arrays for coordinates"
	@echo "     - Implement streaming parser (avoid split())"
	@echo "     - Pre-compile regex patterns"
	@echo "     - Use worker threads for large files"
	@echo ""
	@echo "🎨 Three.js Rendering:"
	@echo "   • Use BufferGeometry instead of Geometry"
	@echo "   • Implement LOD (Level of Detail) for toolpaths"
	@echo "   • Enable GPU instancing for probe points"
	@echo "   • Use InstancedMesh for repeated geometry"
	@echo ""
	@echo "📊 Mesh Interpolation:"
	@echo "   • Cache interpolation results"
	@echo "   • Use lookup tables for bilinear weights"
	@echo "   • Pre-compute mesh grid intersections"
	@echo "   • Consider SIMD operations"
	@echo ""
	@echo "💾 Memory:"
	@echo "   • Stream large G-code files"
	@echo "   • Use object pooling for positions"
	@echo "   • Implement circular buffer for history"
	@echo "   • Lazy load mesh data"
	@echo ""
	@echo "See tests/ut/gcode/parser.benchmark.test.js for current metrics"

dev:
	@echo "Starting development mode..."
	@make serve &
	@npm test -- --watch --testPathIgnorePatterns="collab-ws|ws-bridge|e2e"

# Quick aliases
.PHONY: t s c l b
t: test-quick
s: serve
c: clean
l: lint
b: benchmark


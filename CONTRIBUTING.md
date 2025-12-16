# Contributing to CNC Simulator

Thank you for your interest in contributing to the CNC Simulator project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Areas for Contribution](#areas-for-contribution)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose (for full stack)
- **Git** for version control
- **Python 3** (optional, for local file server)

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR-USERNAME/RPI-CNC-proj.git
   cd RPI-CNC-proj
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run tests:**

   ```bash
   npm test
   ```

5. **Start development server:**

   ```bash
   # Frontend only
   ./scripts/serve.sh

   # Full stack with Docker
   docker-compose up
   ```

## Development Setup

### Frontend Development

The simulator is a static web application located in `Simulator/web/`.

**Start local server:**

```bash
cd Simulator/web
python3 -m http.server 8000
# Open http://localhost:8000/front.html
```

**Or use npm script:**

```bash
npm run serve
```

### Backend Development

The backend includes authentication, database, and WebSocket collaboration.

**Start with Docker Compose:**

```bash
docker-compose up --build
```

**Services:**

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3001
- PostgreSQL: localhost:5432

**Environment variables:**
Create `.env` file (see `.env.example`):

```env
DATABASE_URL=postgresql://cnc_user:cnc_password@localhost:5432/cnc_simulator
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database Setup

**Run migrations:**

```bash
npm run db:migrate
```

**Seed data (optional):**

```bash
npm run db:seed
```

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (browser, OS, version)

**Use the bug report template:**

- Go to Issues → New Issue → Bug Report

### Suggesting Features

1. **Check if feature already requested**
2. **Create a new issue** with:
   - Clear use case and benefits
   - Proposed implementation (if you have ideas)
   - Alternative solutions considered
   - Mockups or diagrams (if applicable)

**Use the feature request template:**

- Go to Issues → New Issue → Feature Request

### Submitting Code

1. **Find or create an issue** for what you're working on
2. **Comment on the issue** to claim it
3. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

4. **Make your changes** following coding standards
5. **Write tests** for new functionality
6. **Run tests and linting:**

   ```bash
   npm test
   npm run lint
   ```

7. **Commit with conventional commit messages**
8. **Push and create a pull request**

## Coding Standards

### JavaScript/ES Modules

**Style:**

- Use ESLint configuration (`.eslintrc.json`)
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters

**Best practices:**

```javascript
// ✅ Good
export class MyClass {
  constructor(options = {}) {
    this.config = { ...this.defaults, ...options };
  }

  async fetchData() {
    try {
      const response = await fetch(this.apiUrl);
      return await response.json();
    } catch (error) {
      console.error('Fetch failed:', error);
      throw error;
    }
  }
}

// ❌ Avoid
var myClass = function () {
  var self = this;
  self.getData = function (callback) {
    // callbacks instead of promises
  };
};
```

**ES Modules:**

- Use `.mjs` extension for modules
- Use `import/export` (not `require`)
- Browser wrappers in `Simulator/web/js/`
- Core modules in `modules/`

### CSS

**Style:**

- Use CSS custom properties for theming
- Follow BEM naming convention
- Mobile-first responsive design
- Prefer flexbox/grid over floats

**Example:**

```css
/* Component styles */
.component-name {
  /* Layout */
  display: flex;

  /* Theming */
  background: var(--bg-primary);
  color: var(--text-primary);

  /* Responsive */
  @media (max-width: 768px) {
    flex-direction: column;
  }
}

.component-name__element {
  /* Child element styles */
}

.component-name--modifier {
  /* Variant styles */
}
```

### HTML

- Semantic HTML5 elements
- Accessible (WCAG AA compliance)
- Mobile-friendly viewport
- Progressive enhancement

### Documentation

**JSDoc comments for all public APIs:**

```javascript
/**
 * Parse G-Code string into command objects
 * @param {string} gcode - G-Code text to parse
 * @param {Object} options - Parser options
 * @param {boolean} options.strict - Enable strict mode
 * @returns {Array<Object>} Parsed command objects
 * @throws {Error} If G-Code syntax is invalid
 * @example
 * const commands = parseGCode('G0 X10 Y20\nG1 Z5');
 */
export function parseGCode(gcode, options = {}) {
  // ...
}
```

## Testing Guidelines

### Test Structure

Tests are organized by type:

- `tests/ut/` - Unit tests (individual functions/classes)
- `tests/it/` - Integration tests (multiple components)
- `tests/e2e/` - End-to-end tests (full workflows)

### Writing Tests

**Unit test example:**

```javascript
import { describe, it, expect } from 'vitest';
import { parseGCode } from '../modules/gcode/parser.mjs';

describe('parseGCode', () => {
  it('should parse G0 rapid move command', () => {
    const result = parseGCode('G0 X10 Y20 Z5');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'G',
      code: 0,
      params: { X: 10, Y: 20, Z: 5 },
    });
  });

  it('should throw error for invalid syntax', () => {
    expect(() => parseGCode('INVALID')).toThrow();
  });
});
```

**Integration test example:**

```javascript
describe('Front-end integration', () => {
  it('should load and render G-Code', async () => {
    // Setup
    const gcode = 'G0 X10\nG1 Y20';

    // Execute
    await loadGCode(gcode);
    await processAllCommands();

    // Assert
    expect(scene.children).toContain(toolpathMesh);
    expect(tool.position.x).toBe(10);
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

### Coverage Requirements

- **Minimum overall:** 70%
- **New code:** 80% minimum
- **Critical paths:** 90%+ (parser, auth, database)

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style (formatting, no logic change)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks
- `ci:` CI/CD changes

**Examples:**

```
feat(parser): add support for G2/G3 arc commands

Implements circular interpolation for G2 (clockwise) and G3
(counterclockwise) commands with I, J, K parameters.

Closes #123

---

fix(auth): prevent token expiration during active session

Updates token refresh logic to extend expiration when user is
actively using the application.

Fixes #456

---

docs(api): add JSDoc comments to gcode-parser module

Adds comprehensive documentation for all public functions in
the parser module with examples and parameter descriptions.
```

**Scope examples:**

- `parser` - G-Code parser
- `auth` - Authentication
- `ui` - User interface
- `db` - Database
- `ws` - WebSocket
- `perf` - Performance
- `tests` - Testing

## Pull Request Process

### Before Creating PR

1. ✅ **Tests pass:** `npm test`
2. ✅ **Linting passes:** `npm run lint`
3. ✅ **Code formatted:** `npm run format`
4. ✅ **Documentation updated** (if needed)
5. ✅ **Changelog entry added** (for features/fixes)

### Creating the PR

1. **Push your branch:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR on GitHub** with:

   - Clear title following conventional commits
   - Description explaining changes
   - Link to related issue(s)
   - Screenshots/GIFs for UI changes
   - Testing instructions

3. **Use PR template** (auto-populated)

### PR Review Process

- **Automated checks** must pass (tests, linting, build)
- **At least 1 approval** required from maintainers
- **Address review comments** by pushing new commits
- **Squash commits** if requested (keep history clean)
- **Maintainer will merge** after approval

### After Merge

- Your branch will be automatically deleted
- Changes will be included in next release
- You'll be added to contributors list!

## Project Structure

```
RPI-CNC-proj/
├── Simulator/
│   └── web/               # Frontend application
│       ├── front.html     # Main simulator page
│       ├── js/            # JavaScript modules
│       ├── css/           # Stylesheets
│       └── static/        # Static assets (Three.js, etc.)
├── modules/
│   ├── backend/           # Server-side code
│   │   ├── routes/        # API routes
│   │   ├── database/      # DB access layer
│   │   └── websocket-server.mjs
│   ├── gcode/             # G-Code parsing & processing
│   ├── presentation/      # 3D visualization helpers
│   └── cli/               # Command-line utilities
├── tests/                 # Test suites
│   ├── ut/                # Unit tests
│   ├── it/                # Integration tests
│   └── e2e/               # End-to-end tests
├── docs/                  # Documentation
├── scripts/               # Helper scripts
└── docker/                # Docker configurations
```

### Key Files

- **Entry points:**

  - `Simulator/web/front.html` - Main UI
  - `scripts/production-server.js` - Backend server
  - `modules/backend/websocket-server.mjs` - WebSocket server

- **Configuration:**

  - `package.json` - Dependencies & scripts
  - `.eslintrc.json` - Linting rules
  - `vitest.config.mjs` - Test configuration
  - `docker-compose.yml` - Container setup

- **Documentation:**
  - `README.md` - Project overview
  - `ARCHITECTURE.md` - System design
  - `API.md` - API documentation
  - `DEPLOYMENT.md` - Deployment guide

## Areas for Contribution

### High Priority

- 🐛 **Bug fixes** - See [issues labeled "bug"](../../issues?q=is%3Aissue+is%3Aopen+label%3Abug)
- 📝 **Documentation** - Improve guides, add examples
- 🧪 **Tests** - Increase code coverage (currently ~98%)
- ♿ **Accessibility** - WCAG compliance improvements

### Good First Issues

Look for issues labeled ["good first issue"](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22):

- Small, well-defined tasks
- Good for learning the codebase
- Mentorship available

### Feature Development

- 🎨 **UI enhancements** - Theme improvements, new visualizations
- 🔧 **G-Code support** - Additional commands, dialects
- 📊 **Analytics** - Usage tracking, performance metrics
- 🌐 **Internationalization** - Multi-language support
- 🤖 **AI features** - Toolpath optimization, error detection

### Infrastructure

- 🚀 **Performance** - Optimization, profiling
- 🔒 **Security** - Audits, vulnerability fixes
- 📦 **CI/CD** - Pipeline improvements
- 🐳 **Docker** - Container optimizations
- ☁️ **Cloud deployment** - AWS/GCP/Azure guides

## Getting Help

### Resources

- **Documentation:** [docs/](docs/)
- **API Reference:** [API.md](API.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Examples:** [examples/](examples/)

### Communication

- **GitHub Discussions:** For questions and ideas
- **GitHub Issues:** For bugs and feature requests
- **Pull Request comments:** For code review discussions

### Maintainers

Current maintainers:

- @ejmvar - Project lead

## Recognition

Contributors are recognized in:

- [CONTRIBUTORS.md](CONTRIBUTORS.md) - All contributors list
- GitHub contributors page
- Release notes for significant contributions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

**Thank you for contributing to CNC Simulator!** 🎉

Every contribution, no matter how small, helps make this project better for everyone.

# Branch Protection Rules

This document describes the recommended branch protection rules for the repository.

## Main Branch Protection

Apply these rules to the `main` branch:

### Required Status Checks

- ✅ Require branches to be up to date before merging
- ✅ Status checks that must pass:
  - `lint`
  - `test-unit`
  - `test-integration`
  - `test-e2e`
  - `build`
  - `security`

### Pull Request Requirements

- ✅ Require pull request before merging
- ✅ Require at least **2** approving reviews
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if CODEOWNERS file exists)
- ✅ Require approval of the most recent reviewable push

### Additional Rules

- ✅ Require conversation resolution before merging
- ✅ Require signed commits
- ✅ Require linear history
- ✅ Include administrators (enforce rules for admins too)
- ⛔ Do not allow force pushes
- ⛔ Do not allow deletions

## Develop Branch Protection

Apply these rules to the `develop` branch (if using Git Flow):

### Required Status Checks

- ✅ Require branches to be up to date before merging
- ✅ Status checks that must pass:
  - `lint`
  - `test-unit`
  - `test-integration`

### Pull Request Requirements

- ✅ Require pull request before merging
- ✅ Require at least **1** approving review
- ✅ Dismiss stale pull request approvals when new commits are pushed

### Additional Rules

- ✅ Require conversation resolution before merging
- ⛔ Do not allow force pushes
- ⛔ Do not allow deletions

## Release Branch Pattern

Apply these rules to branches matching `release/*`:

### Required Status Checks

- ✅ Require branches to be up to date before merging
- ✅ Status checks that must pass:
  - `lint`
  - `test-unit`
  - `test-integration`
  - `test-e2e`
  - `security`

### Pull Request Requirements

- ✅ Require pull request before merging
- ✅ Require at least **2** approving reviews

### Additional Rules

- ⛔ Do not allow force pushes
- ⛔ Do not allow deletions

## Tag Protection

Protect version tags matching `v*.*.*`:

- ✅ Restrict who can create matching tags (maintainers only)
- ✅ Prevent tag deletion

## GitHub CLI Setup

You can configure these rules using the GitHub CLI:

```bash
# Install GitHub CLI
# https://cli.github.com/

# Login
gh auth login

# Enable branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=lint \
  --field required_status_checks[contexts][]=test-unit \
  --field required_status_checks[contexts][]=test-integration \
  --field required_status_checks[contexts][]=test-e2e \
  --field required_status_checks[contexts][]=build \
  --field required_status_checks[contexts][]=security \
  --field required_pull_request_reviews[required_approving_review_count]=2 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=true \
  --field enforce_admins=true \
  --field required_conversation_resolution=true \
  --field required_signatures=true \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## Manual Configuration

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Enter branch name pattern (e.g., `main`)
4. Check the boxes according to the rules above
5. Click **Create** or **Save changes**

## CODEOWNERS File

Create a `.github/CODEOWNERS` file to define code owners:

```
# Global owners
* @project-maintainers

# Frontend
/Simulator/web/ @frontend-team
/modules/presentation/ @frontend-team

# Backend
/modules/backend/ @backend-team
/scripts/production-server.js @backend-team

# G-Code
/modules/gcode/ @gcode-team

# Documentation
/docs/ @docs-team
*.md @docs-team

# CI/CD
/.github/ @devops-team

# Security-sensitive files
/modules/backend/auth/ @security-team
```

## Required Workflows

Ensure these GitHub Actions workflows exist and pass:

- ✅ `.github/workflows/ci.yml` - Continuous Integration
- ✅ `.github/workflows/deploy.yml` - Deployment
- ✅ `.github/workflows/label.yml` - Auto-labeling
- ✅ `.github/workflows/stale.yml` - Stale issue management

## Security Settings

In addition to branch protection:

1. **Dependabot alerts**: Enable in Security → Dependabot
2. **Code scanning**: Enable CodeQL in Security → Code scanning
3. **Secret scanning**: Enable in Security → Secret scanning
4. **Vulnerability reporting**: Set up security policy
5. **Two-factor authentication**: Require for all contributors

## Monitoring

Regularly review:

- Failed pull requests (why did they fail?)
- Bypassed branch protections (if any)
- Status check performance (are they too slow?)
- Review turnaround time (bottlenecks?)

#!/bin/bash
# Production deployment script for CNC Simulator
# Usage: ./scripts/deploy.sh [target]
# Targets: github-pages, netlify, docker, aws

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_info "✓ Prerequisites met"
}

run_tests() {
    log_info "Running tests..."
    npm test || {
        log_error "Tests failed. Deployment aborted."
        exit 1
    }
    log_info "✓ Tests passed"
}

run_linting() {
    log_info "Running linter..."
    npm run lint || {
        log_warn "Linting issues found, but continuing..."
    }
}

deploy_github_pages() {
    log_info "Deploying to GitHub Pages..."
    
    # Build documentation
    mkdir -p dist/docs
    cp -r docs/* dist/docs/
    
    # Copy frontend files
    cp -r Simulator/web/* dist/
    
    # Create CNAME file (update with your domain)
    # echo "your-domain.com" > dist/CNAME
    
    # Deploy using gh-pages package
    if command -v gh-pages &> /dev/null; then
        npx gh-pages -d dist
        log_info "✓ Deployed to GitHub Pages"
    else
        log_error "gh-pages package not found. Install with: npm install -g gh-pages"
        exit 1
    fi
}

deploy_netlify() {
    log_info "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI not found. Install with: npm install -g netlify-cli"
        exit 1
    fi
    
    # Deploy to Netlify
    netlify deploy --prod --dir=Simulator/web
    log_info "✓ Deployed to Netlify"
}

deploy_docker() {
    log_info "Building and deploying Docker containers..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker."
        exit 1
    fi
    
    # Check for .env.production
    if [ ! -f .env.production ]; then
        log_error ".env.production file not found!"
        log_info "Create one from .env.production.example"
        exit 1
    fi
    
    # Build and start containers
    docker-compose -f docker-compose.production.yml build
    docker-compose -f docker-compose.production.yml up -d
    
    log_info "✓ Docker containers deployed"
    log_info "Frontend: http://localhost:3000"
    log_info "Backend: http://localhost:3001"
}

deploy_aws() {
    log_info "Deploying to AWS..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI."
        exit 1
    fi
    
    # Frontend to S3 + CloudFront
    log_info "Syncing frontend to S3..."
    aws s3 sync Simulator/web s3://${S3_BUCKET}/ \
        --exclude "*.md" \
        --cache-control "public, max-age=31536000" \
        --delete
    
    # Invalidate CloudFront cache
    log_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_DIST_ID} \
        --paths "/*"
    
    # Backend to ECS (if configured)
    if [ ! -z "$ECS_CLUSTER" ]; then
        log_info "Updating ECS service..."
        aws ecs update-service \
            --cluster ${ECS_CLUSTER} \
            --service ${ECS_SERVICE} \
            --force-new-deployment
    fi
    
    log_info "✓ Deployed to AWS"
}

show_help() {
    cat << EOF
CNC Simulator Deployment Script

Usage: ./scripts/deploy.sh [target]

Targets:
  github-pages  Deploy frontend to GitHub Pages
  netlify       Deploy frontend to Netlify
  docker        Build and run Docker containers locally
  aws           Deploy to AWS (S3 + CloudFront + ECS)
  
Options:
  -h, --help    Show this help message
  --skip-tests  Skip running tests
  
Examples:
  ./scripts/deploy.sh github-pages
  ./scripts/deploy.sh docker
  ./scripts/deploy.sh aws --skip-tests

EOF
}

# Main script
main() {
    local target="${1:-}"
    local skip_tests=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            *)
                target="$1"
                shift
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests unless skipped
    if [ "$skip_tests" = false ]; then
        run_tests
        run_linting
    fi
    
    # Deploy based on target
    case $target in
        github-pages)
            deploy_github_pages
            ;;
        netlify)
            deploy_netlify
            ;;
        docker)
            deploy_docker
            ;;
        aws)
            deploy_aws
            ;;
        *)
            log_error "Unknown target: $target"
            show_help
            exit 1
            ;;
    esac
    
    log_info "🚀 Deployment complete!"
}

# Run main function
main "$@"

#!/bin/bash

# JurisAgentis Production Deployment Script
# This script automates the deployment process for the legal practice management platform

set -e  # Exit on any error

# Configuration
APP_NAME="jurisagentis"
DEPLOY_USER="deploy"
DEPLOY_HOST="${DEPLOY_HOST:-your-server.com}"
DEPLOY_PATH="/opt/jurisagentis"
BACKUP_PATH="/opt/backups/jurisagentis"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        log_warning "Please copy .env.production.example to .env.production and configure it."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_PATH/backup_$TIMESTAMP.tar.gz"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_PATH"
    
    # Create backup of current deployment (if exists)
    if [[ -d "$DEPLOY_PATH" ]]; then
        tar -czf "$BACKUP_FILE" -C "$(dirname $DEPLOY_PATH)" "$(basename $DEPLOY_PATH)"
        log_success "Backup created: $BACKUP_FILE"
    else
        log_warning "No existing deployment to backup"
    fi
    
    # Keep only last 5 backups
    cd "$BACKUP_PATH" && ls -t backup_*.tar.gz | tail -n +6 | xargs -r rm --
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    log_success "Docker images built successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # This would run your database migrations
    # Uncomment and modify based on your migration system
    # docker-compose exec jurisagentis-app npm run migrate:prod
    
    log_success "Database migrations completed"
}

# Deploy application
deploy() {
    log_info "Starting deployment..."
    
    # Create deployment directory
    mkdir -p "$DEPLOY_PATH"
    
    # Copy files to deployment directory
    cp -r . "$DEPLOY_PATH/"
    cd "$DEPLOY_PATH"
    
    # Stop existing services
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_info "Stopping existing services..."
        docker-compose down
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check if application is responding
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Application is responding"
    else
        log_error "Application health check failed"
        exit 1
    fi
    
    log_success "Deployment completed successfully"
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."
    
    # Find the latest backup
    LATEST_BACKUP=$(ls -t $BACKUP_PATH/backup_*.tar.gz 2>/dev/null | head -n1)
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        log_error "No backup found for rollback"
        exit 1
    fi
    
    # Stop current services
    docker-compose down
    
    # Restore from backup
    rm -rf "$DEPLOY_PATH"
    tar -xzf "$LATEST_BACKUP" -C "$(dirname $DEPLOY_PATH)"
    
    # Start services
    cd "$DEPLOY_PATH"
    docker-compose up -d
    
    log_success "Rollback completed"
}

# Cleanup old Docker images and containers
cleanup() {
    log_info "Cleaning up old Docker images and containers..."
    
    docker system prune -f
    docker image prune -a -f
    
    log_success "Cleanup completed"
}

# Main deployment process
main() {
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_backup
            build_images
            run_migrations
            deploy
            cleanup
            ;;
        "rollback")
            rollback
            ;;
        "build")
            check_prerequisites
            build_images
            ;;
        "backup")
            create_backup
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|build|backup|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Full deployment (default)"
            echo "  rollback - Rollback to previous version"
            echo "  build    - Build Docker images only"
            echo "  backup   - Create backup only"
            echo "  cleanup  - Clean up old Docker resources"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
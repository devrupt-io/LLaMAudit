#!/bin/bash
# run-tests.sh - Run all tests for LLaMa Audit in ephemeral containers
#
# Usage:
#   ./run-tests.sh            # Run all tests
#   ./run-tests.sh --last     # Show last test output
#   ./run-tests.sh --backend  # Run only backend tests
#   ./run-tests.sh --frontend # Run only frontend tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LAST_OUTPUT_FILE=".test-output.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_last_output() {
    if [ -f "$LAST_OUTPUT_FILE" ]; then
        cat "$LAST_OUTPUT_FILE"
    else
        log_error "No previous test output found."
        exit 1
    fi
}

cleanup() {
    log_info "Cleaning up test containers..."
    docker stop llamaudit-test-db llamaudit-test-runner 2>/dev/null || true
    docker rm llamaudit-test-db llamaudit-test-runner 2>/dev/null || true
}

run_backend_tests() {
    log_info "Running backend tests..."

    docker compose --profile test run --rm \
        -e NODE_ENV=test \
        -e DATABASE_HOST=test-db \
        -e DATABASE_PORT=5432 \
        -e DATABASE_NAME=llamaudit_test \
        -e DATABASE_USER=llamaudit_test \
        -e DATABASE_PASSWORD=llamaudit_test_secret \
        -e OPENROUTER_API_KEY=test-key \
        --workdir /app/backend \
        test-runner sh -c "npm ci && npm test" 2>&1
}

run_frontend_tests() {
    log_info "Running frontend tests..."

    docker compose --profile test run --rm \
        -e NODE_ENV=test \
        --workdir /app/frontend \
        test-runner sh -c "npm ci && npm test" 2>&1
}

run_all_tests() {
    local exit_code=0
    local output=""

    # Start test database
    log_info "Starting ephemeral test database..."
    docker compose --profile test up -d test-db

    # Wait for database
    log_info "Waiting for test database to be ready..."
    sleep 5

    # Run backend tests
    log_info "=== BACKEND TESTS ==="
    if backend_output=$(run_backend_tests); then
        output+="$backend_output"$'\n'
        log_success "Backend tests passed!"
    else
        output+="$backend_output"$'\n'
        log_error "Backend tests failed!"
        exit_code=1
    fi

    # Run frontend tests
    log_info "=== FRONTEND TESTS ==="
    if frontend_output=$(run_frontend_tests); then
        output+="$frontend_output"$'\n'
        log_success "Frontend tests passed!"
    else
        output+="$frontend_output"$'\n'
        log_error "Frontend tests failed!"
        exit_code=1
    fi

    # Save output
    log_info "Saving test output to $LAST_OUTPUT_FILE"
    echo "$output" > "$LAST_OUTPUT_FILE"

    # Cleanup
    cleanup

    # Summary
    echo ""
    echo "============================================"
    if [ $exit_code -eq 0 ]; then
        log_success "All tests passed!"
    else
        log_error "Some tests failed!"
    fi
    echo "============================================"
    echo ""

    return $exit_code
}

# Parse arguments
case "${1:-}" in
    --last)
        show_last_output
        ;;
    --backend)
        docker compose --profile test up -d test-db
        sleep 5
        run_backend_tests | tee "$LAST_OUTPUT_FILE"
        cleanup
        ;;
    --frontend)
        run_frontend_tests | tee "$LAST_OUTPUT_FILE"
        ;;
    --help|-h)
        echo "Usage: ./run-tests.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (no args)    Run all tests"
        echo "  --last       Show output from last test run"
        echo "  --backend    Run only backend tests"
        echo "  --frontend   Run only frontend tests"
        echo "  --help, -h   Show this help message"
        ;;
    *)
        run_all_tests
        ;;
esac

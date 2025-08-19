# AI Agent Helper Scripts

This directory contains helper scripts for AI agents working on the Quattrex P2P platform.

## Available Scripts

### Service Management
- `start-services.sh` - Start backend and frontend in background
- `stop-services.sh` - Stop all running services
- `restart-services.sh` - Restart all services
- `check-status.sh` - Quick status check of all services
- `health-check.sh` - Comprehensive health check

### Testing
- `run-tests.sh` - Run all tests (backend + frontend)
- `test-endpoint.sh` - Test specific API endpoint
- `test-frontend-page.sh` - Test frontend page rendering

### Database
- `reset-database.sh` - Reset database to clean state

### Debugging
- `view-logs.sh` - View service logs
- `fix-nginx-config.sh` - Fix nginx configuration issues

## Usage Examples

### Start development environment
```bash
./.gpt/start-services.sh
```

### Test an API endpoint
```bash
./.gpt/test-endpoint.sh GET /api/health
./.gpt/test-endpoint.sh POST /api/merchant/payouts '{"amount": 1000}' 'test-token'
```

### View logs
```bash
./.gpt/view-logs.sh backend
./.gpt/view-logs.sh frontend
./.gpt/view-logs.sh all
```

### Check health
```bash
./.gpt/health-check.sh
```

## Tips for AI Agents

1. Always run `health-check.sh` before making changes
2. Use `test-endpoint.sh` to verify API changes
3. Run `run-tests.sh` after making significant changes
4. Check logs with `view-logs.sh` if something fails
5. Use `restart-services.sh` after backend changes
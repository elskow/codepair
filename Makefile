.PHONY: dev-deps dev dev-core dev-peer dev-client stop clean install-tools

# Default target
all: dev

# Install development tools
install-tools:
	@echo "Installing development tools..."
	go install github.com/air-verse/air@latest

# Install dependencies
dev-deps: install-tools
	cd core-cp && go mod download
	cd peer-cp && go mod download
	cd client-cp && pnpm install

# Start infrastructure (Nginx and Postgres)
infra:
	docker-compose -f compose.dev.yaml up -d

# Start all development services
dev: infra
	make -j3 dev-core dev-peer dev-client

# Start core service with hot reload
dev-core:
	@echo "Starting core service..."
	cd core-cp && air

# Start peer service with hot reload
dev-peer:
	@echo "Starting peer service..."
	cd peer-cp && air

# Start client
dev-client:
	@echo "Starting client..."
	cd client-cp && pnpm dev

# Stop infrastructure
stop:
	docker-compose -f compose.dev.yaml down

# Clean up
clean: stop
	cd client-cp && rm -rf node_modules
	cd core-cp && rm -rf tmp
	cd peer-cp && rm -rf tmp
	docker-compose -f compose.dev.yaml down -v

# Show logs
logs:
	docker-compose -f compose.dev.yaml logs -f

# Initial setup
setup: dev-deps
	@echo "Setting up development environment..."
	docker-compose -f compose.dev.yaml pull

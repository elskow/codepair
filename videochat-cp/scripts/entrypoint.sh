#!/bin/sh

# Read the port from the config file
PORT=$(grep 'address' config.yaml | sed 's/.*://')

# Expose the port dynamically
echo "Exposing port $PORT"
echo "EXPOSE $PORT" > Dockerfile.dynamic

# Run the main application
exec "$@"

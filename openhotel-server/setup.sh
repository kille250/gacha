#!/bin/bash
# OpenHotel Server Setup Script for Render.com
# This script copies the necessary files from openhotel-reference to openhotel-server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
OH_REF="$REPO_ROOT/openhotel-reference"
OH_SERVER="$SCRIPT_DIR"

echo "Setting up OpenHotel server for Render.com deployment..."

# Check if openhotel-reference exists
if [ ! -d "$OH_REF" ]; then
    echo "Error: openhotel-reference directory not found at $OH_REF"
    echo "Please clone OpenHotel first: git clone https://github.com/openhotel/openhotel.git openhotel-reference"
    exit 1
fi

# Create directories
mkdir -p "$OH_SERVER/app/server"
mkdir -p "$OH_SERVER/assets"

# Copy server files
echo "Copying server files..."
cp -r "$OH_REF/app/server/"* "$OH_SERVER/app/server/"

# Copy assets
echo "Copying assets..."
if [ -d "$OH_REF/app/server/assets" ]; then
    cp -r "$OH_REF/app/server/assets/"* "$OH_SERVER/assets/"
fi

# Create deno.json with proper imports
cat > "$OH_SERVER/app/server/deno.json" << 'EOF'
{
  "tasks": {
    "start": "deno run -A --unstable-cron --unstable-kv mod.ts"
  },
  "imports": {
    "@oh/pathfinding": "jsr:@oh/pathfinding@2.0.3",
    "@oh/queue": "jsr:@oh/queue@1.1.1",
    "@oh/utils": "jsr:@oh/utils@1.5.9",

    "@da/socket": "jsr:@da/socket@2.3.0",
    "@da/bcrypt": "jsr:@da/bcrypt@1.0.0",

    "@std/yaml": "jsr:@std/yaml@1.0.5",
    "@std/ulid": "jsr:@std/ulid@1",

    "dayjs": "https://deno.land/x/deno_dayjs@v0.5.0/mod.ts",
    "deno/": "https://deno.land/std@0.221.0/",
    "input": "https://deno.land/x/input@2.0.4/index.ts",
    "loadenv": "https://deno.land/x/loadenv@v1.0.1/mod.ts",
    "modules/": "./src/modules/",
    "shared/": "./src/shared/",
    "worker_ionic": "https://deno.land/x/worker_ionic@v1.4.2/mod.ts",

    "@zip-js": "jsr:@zip-js/zip-js@2.7.53",

    "imagescript": "https://deno.land/x/imagescript@1.3.0/mod.ts",

    "puppeter-browser": "npm:@puppeteer/browsers@2.10.2",
    "puppeter": "npm:puppeteer@22.8.2"
  },
  "nodeModulesDir": "auto"
}
EOF

# Create .env template
cat > "$OH_SERVER/.env.example" << 'EOF'
# OpenHotel Server Environment Variables
# Copy this to .env and configure for your deployment

# Server port (Render provides this automatically)
PORT=3005

# Frontend URL for CORS
FRONTEND_URL=https://your-frontend.onrender.com

# Auth settings (if using external auth)
AUTH_ENABLED=false
AUTH_API_URL=

# Debug mode
DEBUG=false
EOF

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review and customize config.yml"
echo "2. Copy .env.example to .env and configure"
echo "3. Deploy to Render using the Dockerfile"

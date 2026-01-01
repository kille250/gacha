# OpenHotel Server Dockerfile for Render.com
# Based on Deno runtime for OpenHotel compatibility

FROM denoland/deno:2.1.4

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 openhotel && \
    adduser --system --uid 1001 openhotel

# Create data directory for persistent storage
RUN mkdir -p /app/data /app/assets && \
    chown -R openhotel:openhotel /app

# Copy OpenHotel server files
# Note: You'll need to copy files from openhotel-reference/app/server
COPY --chown=openhotel:openhotel ./app/server/ ./

# Copy shared assets if needed
COPY --chown=openhotel:openhotel ./assets/ ./assets/

# Expose the port (Render assigns PORT env var)
EXPOSE 3005

# Switch to non-root user
USER openhotel

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD deno eval "const r = await fetch('http://localhost:' + (Deno.env.get('PORT') || '3005') + '/info'); if (!r.ok) Deno.exit(1);"

# Run the OpenHotel server
# Uses PORT env variable from Render
CMD ["deno", "run", "-A", "--unstable-cron", "--unstable-kv", "mod.ts"]

# OpenHotel Server Dockerfile for Render.com
# Based on Deno runtime for OpenHotel compatibility

FROM denoland/deno:2.1.4

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 openhotel && \
    adduser --system --uid 1001 openhotel

# Create directories and set permissions
# /deno-dir is where Deno caches dependencies at runtime
RUN mkdir -p /app/data /deno-dir && \
    chown -R openhotel:openhotel /app /deno-dir

# Set Deno cache directory
ENV DENO_DIR=/deno-dir

# Copy OpenHotel server files from current directory
COPY --chown=openhotel:openhotel . ./

# Switch to non-root user before caching
USER openhotel

# Cache dependencies as the non-root user
RUN deno cache mod.ts || true

# Expose the port (Render assigns PORT env var)
EXPOSE 3005

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD deno eval "const r = await fetch('http://localhost:' + (Deno.env.get('PORT') || '3005') + '/info'); if (!r.ok) Deno.exit(1);"

# Run the OpenHotel server
# Uses PORT env variable from Render
CMD ["deno", "run", "-A", "--unstable-cron", "--unstable-kv", "mod.ts"]

# Build context: dist/apps/web, the output of `nx run web:build` (the SSR server bundles its dependencies).
# Build with `npx nx run web:docker-build`.
FROM node:24-alpine

# Links the GHCR package to the repository.
LABEL org.opencontainers.image.source=https://github.com/enet71/birthday

ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

COPY browser ./browser
COPY server ./server

USER node
EXPOSE 4000

# A static file: Angular rejects hosts outside `allowedHosts`, and the probe's host is 127.0.0.1.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/robots.txt" > /dev/null || exit 1

CMD ["node", "--enable-source-maps", "server/server.mjs"]

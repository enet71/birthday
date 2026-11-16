# Build context: dist/apps/api, the output of `nx run api:prune` (bundle, package.json and pruned lockfile).
# Build with `npx nx run api:docker-build`.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY main.js main.js.map ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

CMD ["node", "--enable-source-maps", "main.js"]

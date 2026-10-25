FROM node:24-bookworm-slim

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY scripts ./scripts
COPY public ./public
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000 PUBLIC_DEMO=1 MAX_JOBS=8 MAX_ACTIVE_JOBS=2
USER node
EXPOSE 10000
CMD ["node", "--import", "tsx", "server/index.ts", "--production"]

FROM node:22-alpine AS admin-build
WORKDIR /build/admin
RUN corepack enable
COPY outputs/geme-admin/package.json outputs/geme-admin/pnpm-lock.yaml outputs/geme-admin/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY outputs/geme-admin/ ./
ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN pnpm build

FROM node:22-alpine AS api-build
WORKDIR /build/api
RUN corepack enable
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
COPY outputs/geme-api/package.json outputs/geme-api/pnpm-lock.yaml outputs/geme-api/pnpm-workspace.yaml outputs/geme-api/prisma.config.ts ./
COPY outputs/geme-api/prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY outputs/geme-api/ ./
RUN pnpm db:generate && pnpm build \
    && mkdir -p dist/generated \
    && cp -R src/generated/prisma dist/generated/prisma

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=admin-build /build/admin/.next ./admin/.next
COPY --from=admin-build /build/admin/node_modules ./admin/node_modules
COPY --from=admin-build /build/admin/public ./admin/public
COPY --from=admin-build /build/admin/package.json ./admin/package.json
COPY --from=admin-build /build/admin/next.config.ts ./admin/next.config.ts
COPY --from=api-build /build/api/dist ./api/dist
COPY --from=api-build /build/api/node_modules ./api/node_modules
COPY --from=api-build /build/api/prisma ./api/prisma
COPY --from=api-build /build/api/prisma.config.ts ./api/prisma.config.ts
COPY --from=api-build /build/api/package.json ./api/package.json
COPY outputs/geme-api/scripts/bootstrap-admin.mjs ./api/scripts/bootstrap-admin.mjs
COPY outputs/geme-admin-bundle/supervisor.mjs ./supervisor.mjs
COPY outputs/geme-admin-bundle/healthcheck.mjs ./healthcheck.mjs
EXPOSE 3001 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=6 CMD node /app/healthcheck.mjs
CMD ["node", "/app/supervisor.mjs"]

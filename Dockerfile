# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

# ---------- production deps ----------
# Install only production dependencies, deterministically from lockfile.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
# npm 10.x leaves empty orphan dirs after --omit=dev; harmless, removed for a clean image
RUN npm ci --omit=dev && rm -rf node_modules/@jest node_modules/@eslint node_modules/@eslint-community node_modules/@typescript-eslint

# ---------- runtime ----------
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production

# prod-only node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
# compiled output
COPY --from=build /app/dist ./dist
# migrations (plain JS, needed by `npm run migrate` at deploy time)
COPY migrations ./migrations
COPY package.json ./

# drop root — run as the unprivileged user the image already provides
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]

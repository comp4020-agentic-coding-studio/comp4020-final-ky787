# syntax = docker/dockerfile:1

# The game is a static Vite site. It plays the specimen bundled in game_data/;
# the Workspace/ research share is never part of the build (.dockerignore).
FROM docker.io/library/node:24.21.0-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.9.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts

# One Node process serves HTTP, /ws and atomic visitor/room files on /data.
FROM docker.io/library/node:24.21.0-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/node_modules/ ./node_modules/
COPY server/ ./server/
COPY src/slice/progress.ts src/slice/controller.ts ./src/slice/
COPY src/coop/protocol.ts ./src/coop/
COPY package.json README.md ./
CMD ["node", "server/app.ts"]

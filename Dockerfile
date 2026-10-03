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

# Served as the template did: busybox httpd on 0.0.0.0:$PORT (fly.toml sets
# PORT), the game at /, and README.md verbatim at /readme/ (spec/README.md
# says what's checked).
FROM docker.io/library/busybox:1.38.0
COPY --from=build /app/dist/ /site/
COPY placeholder/readme.html README.md /src/
# README.md goes into the page as-is, HTML-escaped, in place of @README@
RUN mkdir -p /site/readme \
    && sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g' /src/README.md > /src/body \
    && sed -e '/@README@/{r /src/body' -e 'd}' /src/readme.html > /site/readme/index.html
CMD ["sh", "-c", "exec httpd -f -p 0.0.0.0:${PORT:-8080} -h /site"]

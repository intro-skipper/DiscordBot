FROM oven/bun:1.3.12-alpine AS base
WORKDIR /DiscordBot

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY *.ts .
COPY faq.md .
# Create data directory for persistent storage
RUN mkdir -p /data
VOLUME ["/data"]
ENTRYPOINT [ "bun", "run", "index.ts" ]
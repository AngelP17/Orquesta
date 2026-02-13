FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services ./services
RUN pnpm install --frozen-lockfile
WORKDIR /app/services/yappy-mock
EXPOSE 4010
CMD ["pnpm", "dev"]

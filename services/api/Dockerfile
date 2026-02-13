FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services ./services
COPY packages ./packages
RUN pnpm install --frozen-lockfile
WORKDIR /app/services/api
EXPOSE 3002
CMD ["pnpm", "dev"]

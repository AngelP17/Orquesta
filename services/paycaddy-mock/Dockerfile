FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services ./services
RUN pnpm install --frozen-lockfile
WORKDIR /app/services/paycaddy-mock
EXPOSE 4020
CMD ["pnpm", "dev"]

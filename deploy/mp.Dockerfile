# Multiplayer server: the game rules (src/sim) plus the room server, bundled into one file.
# The build runs the multiplayer tests; the image itself has no node_modules at all.
FROM node:25-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vitest run tests/mp.test.ts tests/game.test.ts && npm run build:mp

FROM node:25-alpine
RUN apk upgrade --no-cache
WORKDIR /app
COPY --from=build /src/dist-server/mp.cjs ./mp.cjs
USER node
ENV MP_PORT=8001
EXPOSE 8001
CMD ["node", "mp.cjs"]

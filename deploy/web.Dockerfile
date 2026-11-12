# The game: built with Node, served by nginx. Tests and the typecheck run inside the build, so an
# image with failing tests never reaches the server.
FROM node:25-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT
RUN npm run check && npm run build

# nginx:alpine plus apk upgrade, like the other images on this server.
FROM nginx:alpine
RUN apk upgrade --no-cache
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

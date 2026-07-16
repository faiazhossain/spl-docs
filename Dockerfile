# Stage 1: Base image for development and build.
FROM --platform=$BUILDPLATFORM node:lts AS base
ENV FORCE_COLOR=0
RUN corepack enable
WORKDIR /opt/docusaurus

# Stage 2a: Development mode.
FROM base AS dev
EXPOSE 3000
CMD [ -d "node_modules" ] && npm run start || npm run install && npm run start --host 0.0.0.0

# Stage 2b: Production build - runs on native arch (avoids QEMU emulation).
FROM base AS prod
COPY . /opt/docusaurus/
RUN npm ci
RUN npm run build

# Stage 3: Serve static files with nginx (multi-arch, no emulation needed).
FROM nginx:alpine AS serve
COPY --from=prod /opt/docusaurus/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# Stage 1: build the static documentation site.
# Build runs on the host architecture; only the runtime image matches the target,
# so an arm64 Mac can produce an amd64 image without emulating the whole build.
FROM --platform=$BUILDPLATFORM node:lts AS build
WORKDIR /opt/docusaurus
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Environment settings, see README "Environment settings". Secrets are passed
# as build arguments because .env.local is not part of the build context. Leave
# them empty to build without a key.
ARG SPL_ENVIRONMENT=""
ARG SPL_GATEWAY_BASE=""
ARG SPL_GATEWAY_KEY=""
ARG SPL_PREVIEW_STYLES_BASE=""
ENV SPL_ENVIRONMENT=$SPL_ENVIRONMENT \
    SPL_GATEWAY_BASE=$SPL_GATEWAY_BASE \
    SPL_GATEWAY_KEY=$SPL_GATEWAY_KEY \
    SPL_PREVIEW_STYLES_BASE=$SPL_PREVIEW_STYLES_BASE
RUN npm run build

# Stage 2: serve the static output. The site is built for the /docs/ base path,
# so the whole build directory is mounted at /docs/ and / redirects there.
FROM nginx:alpine AS serve
COPY --from=build /opt/docusaurus/build /usr/share/nginx/html/docs
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location = / { return 302 /docs/; }\n  location / { try_files $uri $uri/ =404; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

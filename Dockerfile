# Stage 1: build the static documentation site.
# Build runs on the host architecture; only the runtime image matches the target,
# so an arm64 Mac can produce an amd64 image without emulating the whole build.
FROM --platform=$BUILDPLATFORM node:lts AS build
WORKDIR /opt/docusaurus
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Optional: bake a gateway subscription key into the build so the interactive
# map on /docs/maps/ can load styles. Omit it and the key stays out of the image.
ARG SPL_UAT_KEY=""
ENV SPL_UAT_KEY=$SPL_UAT_KEY
RUN npm run build

# Stage 2: serve the static output. The site is built for the /docs/ base path,
# so the whole build directory is mounted at /docs/ and / redirects there.
FROM nginx:alpine AS serve
COPY --from=build /opt/docusaurus/build /usr/share/nginx/html/docs
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location = / { return 302 /docs/; }\n  location / { try_files $uri $uri/ =404; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

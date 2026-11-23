# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Environment settings

Everything the documentation shows - links, code samples, the interactive map and the API reference - comes from the settings below, so a build never mixes endpoints from different environments. Docusaurus 3.10 does not read `.env` files itself, so `scripts/lib/env.mjs` loads them for `npm start`, `npm run build` and `npm run pdf`.

| Variable | Purpose |
| --- | --- |
| `SPL_ENVIRONMENT` | `test` (default) shows the "for testing and evaluation only" notice on every page; `production` hides it. |
| `SPL_GATEWAY_BASE` | Base URL of the documented gateway. Defaults to `https://apina.address.gov.sa/b2b`, the gateway clients use. Only override it for internal testing, and never share such a build. |
| `SPL_GATEWAY_KEY_HEADER` | Header that carries the key. Defaults to `Ocp-Apim-Subscription-Key`. |
| `SPL_GATEWAY_KEY` | The gateway key. Only needed when the demo map loads through the gateway. **Secret.** |
| `SPL_PREVIEW_STYLES_BASE` | Optional. Draws the demo map from a style server instead of the gateway. Display only: it is never shown in the documentation, and the gateway key is then not needed. |

Put secrets in `.env.local`, which is git-ignored and never committed:

```
SPL_GATEWAY_KEY=...
```

In the guides, write `{{gatewayBase}}` instead of typing the gateway address, and `{{gatewayKeyHeader}}` instead of the header name. Both are replaced when the page is read. `openapi.json` uses the same placeholders.

Docker builds do not include `.env.local`, so pass the settings as build arguments (`--build-arg SPL_GATEWAY_KEY=...`).

## Installation

```bash
yarn
```

## Local Development

```bash
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Offline PDF Backup

Generates a self-contained PDF of all documentation (guides + full OpenAPI API reference) for use when the website is unreachable.

```bash
npm run pdf
```

This builds the site and writes `spl-docs.pdf` to the project root. The PDF includes a cover page, clickable outline bookmarks per section, and page numbers. Requires Google Chrome or Microsoft Edge (or set `PUPPETEER_EXECUTABLE_PATH` to a Chromium binary).

Notes:

- The generator (`scripts/generate-pdf.mjs`) refuses to create a PDF when the map on the Maps page has not loaded, or when the gateway key or the display-only map server appears in the text. Fix the cause and run it again; a PDF with an error message or a blank map is never produced.
- The generator renders the built site headlessly, so anything the browser hides by default (inactive tabs, collapsed accordions) is explicitly expanded before printing.
- The homepage and interactive Maps landing page are excluded on purpose; the cover page replaces them.
- Regenerate the PDF whenever docs change and share the new file with the team.

## Deployment

### Docker Deployment

Multi-architecture images are built for `linux/amd64` and `linux/arm64` using Docker Buildx and pushed to Docker Hub.

#### Prerequisites

- Docker with Buildx support
- Docker Hub account (logged in via `docker login`)
- SSH access to the SPL server

#### One-time Buildx setup

If you have not created a multi-platform builder yet:

```bash
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

#### 1. Build and push multi-arch image

```bash
docker buildx build --platform linux/amd64,linux/arm64 --push -t rilusmahmud/spl-docs:main-1.0.10 .
```

Replace `main-1.0.10` with your desired version tag. Use semantic versioning (e.g., `main-1.0.11`, `main-1.1.0`).

#### 2. Deploy to SPL server

SSH into the SPL server and run:

```bash
# Pull the latest image
docker pull rilusmahmud/spl-docs:main-1.0.10

# Stop and remove the existing container
docker stop spl-docs && docker rm spl-docs

# Run the new container
docker run -d \
  --name spl-docs \
  --restart unless-stopped \
  -p 4003:80 \
  -e API_SPEC_URL=https://na-maps.vng-solutions.com/spl/openapi.json \
  rilusmahmud/spl-docs:main-1.0.10
```

#### 3. Verify deployment

```bash
docker ps | grep spl-docs
curl -I http://localhost:4003
```

#### Version management

- Always create new image tags for each deployment
- Use consistent naming convention: `rilusmahmud/spl-docs:main-<version>`
- Keep track of deployed versions for easy rollback if needed

### Local Docker Development

Build and run locally using Docker Compose:

```bash
docker compose up
```

The site will be available at `http://localhost:4003`.

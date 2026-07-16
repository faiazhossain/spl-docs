# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

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

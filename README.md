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

For production deployment using Docker, we use a versioned tagging strategy to ensure consistent deployments:

#### 1. Build Docker Image

Build a new Docker image with a version tag:

```bash
docker build -t rilusmahmud/spl-docs:main-1.0.6 .
```

Replace `main-1.0.6` with your desired version tag. We recommend using semantic versioning (e.g., `main-1.0.7`, `main-1.1.0`) for better version management.

#### 2. Push to Registry (not necessary)

Push the image to Docker Hub or your preferred container registry:

```bash
docker push rilusmahmud/spl-docs:main-1.0.6
```

#### 3. Deploy with Docker Compose

Update your Docker Compose configuration to use the new image tag, then restart the services:

```bash
docker compose down && docker compose up -d
```

This command will:

- Stop and remove existing containers (`docker compose down`)
- Start services in detached mode with the updated configuration (`docker compose up -d`)

#### Version Management

- Always create new image tags for each deployment
- Use consistent naming convention: `rilusmahmud/spl-docs:main-<version>`
- Keep track of deployed versions for easy rollback if needed

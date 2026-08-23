# Nexus University Portal

A modern, scalable multi-role university management platform designed to streamline workflows for students, lecturers, and registrars. The system provides a centralized interface for academic operations, communication, and administrative management.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **UI & Styling:** Tailwind CSS, shadcn/ui
- **Backend (in progress):** Java 21, Spring Boot 3.x modular monolith with Spring Modulith — see `NEXUS_SPRINGBOOT_ARCHITECTURE.md`

> **Note:** The legacy Django backend and Firebase/Supabase services have been removed. The frontend currently runs against bundled/static data until the new Spring Boot API (`/api/v1/**`) is connected.

## Prerequisites

Ensure the following are installed and configured:

- Node.js (v20 or later)
- npm (v12 or later)

## Local Development Setup

### 1. Install Dependencies

```
npm ci
```

### 2. Configure Environment Variables

Create a local environment file:

```
cp .env.example .env
```

Update the `.env` file with the platform API base URL:

```
VITE_API_BASE_URL=http://localhost:8080
```

### 3. Run Development Server

```
npm run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run build` | Build application for production |
| `npm run preview` | Preview production build locally |

## Branding & Customization

Global branding (site name, logo, colors) will be served by the platform API's tenant module once the Spring Boot backend is live. Administrators or registrars can configure branding directly from the in-app settings interface.

Supported fields:

- `siteName` – Full application name (browser title, Open Graph)
- `shortName` – Compact name used in headers and authentication screens
- `tagline` – Application description (SEO and metadata)
- `logoUrl` – URL for logo and favicon
- `supportEmail` – Contact email for support
- `primaryColor` – Main brand color (Hex format)
- `secondaryColor` – Accent color (Hex format)

If branding settings are unavailable, the system automatically falls back to default values.

## Continuous Integration

A GitHub Actions workflow is configured to maintain code quality and build integrity:

- Runs on push and pull requests
- Executes linting and production build
- Configuration file: `.github/workflows/ci.yml`

## Legacy Reference Documentation

Documentation for the retired Django API is preserved in `docs/legacy/` as a specification reference for rebuilding endpoints in the new backend.

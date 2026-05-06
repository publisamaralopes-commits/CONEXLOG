# Customer Management API

A simple REST API for managing customers — add, list, and delete customers with name and phone number.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `MONGODB_URI` — MongoDB connection string (secret)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB + Mongoose
- Validation: Zod v3
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/routes/customers.ts` — customer CRUD routes
- `artifacts/api-server/src/models/customer.ts` — Mongoose Customer model
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/api-client-react/src/generated/` — generated React Query hooks

## Architecture decisions

- Contract-first: OpenAPI spec is defined first, then Zod validators and React Query hooks are generated via Orval
- MongoDB over PostgreSQL: user explicitly chose MongoDB; Mongoose is used for schema + querying
- `tlsInsecure: true` used for MongoDB Atlas connection due to Replit SSL environment constraints
- Zod v3 (from catalog) used for request validation — `z.prettifyError` is not available, errors are joined manually

## Product

- `GET /api/customers` — list all customers (newest first)
- `POST /api/customers` — add a customer (`{ name, phone }`)
- `DELETE /api/customers/:id` — delete a customer by ID

## User preferences

- Wants MongoDB (not PostgreSQL) for storage

## Gotchas

- MongoDB Atlas must have `0.0.0.0/0` (Allow from Anywhere) in the Network Access IP allowlist for Replit to connect
- Do not run `pnpm dev` at the workspace root — use the workflow or `pnpm --filter @workspace/api-server run dev`
- Always run codegen after changing `lib/api-spec/openapi.yaml`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

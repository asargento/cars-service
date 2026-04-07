# cars-service

Serverless service for managing cars: **HTTP API** plus an **EventBridge**-triggered Lambda, built with **Node.js 24**, **TypeScript**, **AWS Lambda**, and **AWS Lambda Powertools**. The codebase uses a **layered, DDD-friendly layout** (domain, application, infrastructure) with thin Lambda entrypoints and injectable dependencies for testing.

## Stack

| Area          | Choice                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime       | AWS Lambda **nodejs24.x**                                                                                                                                       |
| IaC / deploy  | [Serverless Framework](https://www.serverless.com/framework/docs) via **[osls](https://www.npmjs.com/package/osls)** (open-source Serverless v3-compatible CLI) |
| Bundling      | [serverless-esbuild](https://github.com/floydspace/serverless-esbuild) (TypeScript → **CommonJS** bundle, `target: node24`)                                     |
| HTTP routing  | [@aws-lambda-powertools/event-handler](https://docs.powertools.aws.dev/lambda/typescript/latest/core/event_handler/) (`Router`)                                 |
| Async ingress | **EventBridge** (`detail-type: CarSubmitted` → `onCarSubmittedHandler`)                                                                                         |
| Observability | Powertools **Logger**, **Metrics**, **Tracer** (X-Ray tracing enabled in `serverless.yml`)                                                                      |
| Validation    | **Zod** (request bodies on write routes)                                                                                                                        |
| Tests         | **Vitest** (BDD-style feature specs + use-case unit tests)                                                                                                      |
| Lint / format | **ESLint 9** (flat config) + **Prettier**                                                                                                                       |

## Prerequisites

- **Node.js ≥ 24** (see [`.nvmrc`](./.nvmrc); use `nvm use` or another version manager)
- **npm**
- **AWS credentials** configured for deploy (e.g. `aws configure` or environment variables) with permission to create/update Lambda, API Gateway HTTP API, IAM, CloudWatch, and X-Ray resources

## Setup

```bash
npm install
```

## Scripts

| Command                               | Description                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run typecheck` / `npm run build` | Typecheck only (`tsc --noEmit`)                                                         |
| `npm test`                            | Run Vitest once                                                                         |
| `npm run test:watch`                  | Vitest watch mode                                                                       |
| `npm run lint`                        | ESLint                                                                                  |
| `npm run lint:fix`                    | ESLint with `--fix`                                                                     |
| `npm run format`                      | Prettier write                                                                          |
| `npm run format:check`                | Prettier check                                                                          |
| `npm run package`                     | Produce a Serverless deployment package (no deploy)                                     |
| `npm run deploy`                      | Deploy default stage                                                                    |
| `npm run deploy:dev`                  | Deploy with `--stage dev`                                                               |
| `npm run invoke:local`                | Invoke the `api` function locally with [`events/http-api.json`](./events/http-api.json) |

The `serverless` CLI is provided by the **`osls`** dev dependency; `npm run deploy` resolves it from `node_modules`.

## Project layout

```
src/
  domain/
    entities/             # Aggregates (e.g. car.entity.ts) + barrel index.ts
    errors/               # Domain errors (e.g. car-not-found.error.ts)
    repositories/         # Ports (e.g. cars-repository.port.ts) + barrel index.ts
  application/            # Use cases, use-case factory
  infrastructure/       # Adapters (e.g. in-memory repository)
  handlers/
    api.ts                  # HTTP Lambda composition root → `handler`
    api-handler-factory.ts  # `createApiHandler` + HTTP routes & Zod
    on-car-submitted.ts     # EventBridge Lambda composition root → `handler`
    event-handler-factory.ts # `createOnCarSubmittedHandler` (validates `detail`, create-car use case)
    schemas.ts              # Zod schemas shared by HTTP and events
test/
  domain/                 # Entity + domain error unit tests
  features/               # BDD-style API + EventBridge handler tests (mocked logger + factory)
  application/            # Use-case tests (mocked repository)
  support/                # API / EventBridge event builders, mocks, arrange/act/assert helpers
```

Path aliases (see [`tsconfig.json`](./tsconfig.json)): `@domain/*`, `@application/*`, `@infrastructure/*`, `@/*` → `src/*`. Prefer **`@domain/entities`**, **`@domain/errors`**, and **`@domain/repositories`** (folder `index.ts` barrels). TypeScript uses **`moduleResolution: "bundler"`** so imports omit `.js` extensions; resolution is handled by esbuild (deploy) and Vitest (tests).

## API (HTTP)

Lambda function **`api`** sits behind **API Gateway HTTP API** (`ANY /` and `ANY /{proxy+}`). Routes are registered in [`src/handlers/api-handler-factory.ts`](./src/handlers/api-handler-factory.ts), including:

- `GET /health` — liveness-style JSON payload
- `GET /cars` — list cars (use case)
- `GET /cars/:id` — car by id (use case)
- `POST /cars` — create car (validated body; use case)

Default **stage** is `dev` and **region** is `eu-west-1` (overridable via Serverless CLI options).

### EventBridge

Lambda **`onCarSubmittedHandler`** is subscribed on the **default** event bus to **`detail-type: CarSubmitted`**. The handler is built in [`src/handlers/event-handler-factory.ts`](./src/handlers/event-handler-factory.ts); `event.detail` must match [`CarSubmittedDetailSchema`](./src/handlers/schemas.ts) (same fields as `POST /cars`). Invalid payloads are logged and the invocation completes without retry (no throw).

**Console test event:** use the **default** event bus, set **Detail type** to **`CarSubmitted`**, and put JSON such as `{"make":"Acme","model":"X","year":2020}` in **Detail** (see schema). **FailedInvocations** on the rule often means EventBridge could not invoke Lambda—deploy must create **`AWS::Lambda::Permission`** with **`SourceArn`** matching the rule. With **osls**, do **not** set `eventBus: default` in [`serverless.yml`](./serverless.yml); that value produces an invalid `...:rule/default/<ruleName>` ARN for the default bus (the correct suffix is `...:rule/<ruleName>`). Omit `eventBus` so the rule stays on the default bus and the permission ARN is correct, then **redeploy**.

## Testing

- **HTTP API**: [`test/features/cars-api.bdd.test.ts`](./test/features/cars-api.bdd.test.ts) uses **`createApiHandler`** with mocked **`Logger`** and **`UseCaseFactory`**; one scenario imports production [`src/handlers/api.ts`](./src/handlers/api.ts) as a smoke test.
- **EventBridge**: [`test/features/on-car-submitted.bdd.test.ts`](./test/features/on-car-submitted.bdd.test.ts) covers **`createOnCarSubmittedHandler`** (valid / invalid `detail`) and imports [`src/handlers/on-car-submitted.ts`](./src/handlers/on-car-submitted.ts) for a smoke run.
- **Use cases**: [`test/application/use-cases/cars-use-cases.bdd.test.ts`](./test/application/use-cases/cars-use-cases.bdd.test.ts) mocks **`CarsRepository`** and exercises list / get / create flows.

Scenarios are written in a **Given / When / Then** style (see [`test/support/scenario-helpers.ts`](./test/support/scenario-helpers.ts)).

## Configuration

- **Serverless**: [`serverless.yml`](./serverless.yml) — service name, provider, `serverless-esbuild`, **`api`** (HTTP API) and **`onCarSubmittedHandler`** (EventBridge), Powertools env vars, X-Ray tracing.
- **Vitest**: [`vitest.config.ts`](./vitest.config.ts) — path aliases aligned with TypeScript for tests.

### Why the Lambda bundle is CommonJS

Source stays **ESM-style TypeScript**; esbuild emits **CommonJS** (`format: cjs` in [`serverless.yml`](./serverless.yml)). That matches how **osls** `invoke local` loads the handler (`require()`). Lambda accepts CJS handlers the same as ESM (see [AWS Lambda Node.js handler](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)).

Because the repo root [`package.json`](./package.json) has `"type": "module"`, Node would otherwise treat files under [`.esbuild/.build/`](./.gitignore) as ESM when resolving from the project tree. A tiny plugin ([`scripts/serverless-lambda-cjs-scope.cjs`](./scripts/serverless-lambda-cjs-scope.cjs)) writes **`package.json`** with `"type": "commonjs"` into that build folder after each bundle so `invoke local` and the bundled `module.exports` line agree.

## License

Private package (`"private": true` in [`package.json`](./package.json)); add a license file if you open-source the repo.

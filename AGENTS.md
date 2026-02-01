# Agent Guidelines for zenthor-assist

## Repository Overview

Monorepo using Bun + Turborepo with Next.js frontend, Convex backend, and Bun-based agent runtime. Stack: TypeScript, React 19, TailwindCSS v4, shadcn/ui, Oxlint/Oxfmt.

## Build, Test, and Development Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `bun install` | Root | Install workspace dependencies |
| `bun run build` | Root | Turborepo build across all apps/packages |
| `bun run dev` | Root | Start all apps in dev mode (via turbo) |
| `bun run typecheck` | Root | TypeScript check via Turbo |
| `bun run lint` | Root/App | Run Oxlint |
| `bun run lint:fix` | Root/App | Run Oxlint with auto-fix |
| `bun run format` | Root/App | Run Oxfmt --write |
| `bun run format:check` | Root/App | Run Oxfmt --check |
| `bun run check` | Root | Lint + format check combined |
| `bun run check:fix` | Root | Lint fix + format write combined |
| `bun run knip` | Root/App | Find unused exports/dependencies |
| `bun run knip:fix` | Root/App | Auto-fix knip issues |
| `bun run clean` | Root | Remove build artifacts (destructive) |
| `bun run clean:workspaces` | Root | Clean all workspaces |

### App-Specific Commands

| App | Dev Command | Notes |
|-----|-------------|-------|
| web | `cd apps/web && bun run dev` | Next.js on port 3001 |
| backend | `cd apps/backend && bun run dev` | Convex dev server |
| backend | `cd apps/backend && bun run dev:setup` | Bootstrap new Convex project |
| agent | `cd apps/agent && bun run dev` | Bun watch mode |

### Testing

No dedicated test runner configured. Use `bun run typecheck` and `bun run check` for validation. If adding tests:
- Co-locate test files with source (`*.test.ts` or `*.test.tsx`)
- Consider using Bun's built-in test runner: `bun test`
- Run single test file: `bun test path/to/file.test.ts`

## Project Structure

```
zenthor-assist/
├── apps/
│   ├── web/              # Next.js frontend (port 3001)
│   │   ├── src/components/ui/   # shadcn/ui components
│   │   ├── src/app/             # Next.js app router
│   │   └── src/lib/             # Utilities (cn, etc.)
│   ├── backend/          # Convex backend
│   │   └── convex/       # Convex functions, schema, generated types
│   └── agent/            # Bun-based agent runtime
│       └── src/          # Agent loop, WhatsApp connection
├── packages/
│   ├── config/           # Shared tsconfig.base.json
│   └── env/              # Environment validation, shared env helpers
```

## Code Style Guidelines

### TypeScript

- Strict mode enabled with additional checks:
  - `noUncheckedIndexedAccess: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `verbatimModuleSyntax: true`
- **Never** use `any` - disallowed by lint (`typescript/no-explicit-any: error`)
- Use explicit types; prefer `as const` over type annotations where applicable
- Prefer `type` imports: `import type { Foo } from "..."` (enforced)
- Unused parameters must be prefixed with `_`

### Formatting

- **Oxfmt** handles all formatting (tab indentation, width 2, double quotes)
- Import ordering is auto-sorted by Oxfmt - do not manually organize
- Never use semicolons (handled by formatter)
- Run `bun run format` before committing

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `chat-layout.tsx` |
| Components | PascalCase | `function Button() {}` |
| Hooks | camelCase, use* prefix | `useConversation` |
| Utils | camelCase | `cn`, `formatDate` |
| Types/Interfaces | PascalCase | `type UserProps = {}` |
| Constants | SCREAMING_SNAKE_CASE | `API_ENDPOINT` |

### Imports

```typescript
// Good - type imports explicit
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Good - workspace imports
import { schema } from "@zenthor-assist/backend";
import { env } from "@zenthor-assist/env";
```

### Error Handling

```typescript
// Console logging - use appropriate levels
console.info("[context] Informational message");
console.error("[context] Error message:", error);

// Top-level errors
process.exit(1); // For fatal initialization errors

// Async errors
try {
  await riskyOperation();
} catch (error) {
  console.error("[context] Operation failed:", error);
  // Continue or re-throw based on severity
}
```

### React Components (shadcn/ui pattern)

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "..." },
    size: { default: "..." },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Component({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof componentVariants>) {
  return (
    <div
      className={cn(componentVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### Convex Functions

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { id: v.id("tableName") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

## Lint Rules (Oxlint)

Key enforced rules:
- `no-unused-vars` - Prefix unused with `_`
- `eqeqeq` - Always use `===` and `!==`
- `no-console` - Warns on bare console (allows info/warn/error/debug)
- `typescript/consistent-type-imports` - Separate type imports
- `react-hooks/rules-of-hooks` - Hook rules enforced
- `react-hooks/exhaustive-deps` - Warn on missing deps

Ignored patterns: `node_modules`, `dist`, `_generated`, `.next`, `*.d.ts`

## Environment & Security

- Secrets live in `apps/*/.env.local` (gitignored)
- Never commit credentials to repo
- Use `@zenthor-assist/env` for shared environment validation
- Global env vars defined in `turbo.json`

## Pull Request Guidelines

- Use imperative mood ("Add feature", not "Added feature")
- Keep commits atomic and focused
- Include screenshots for UI changes
- Run `bun run check` before opening PR

## Useful Aliases

| Workspace | Import Alias | Path |
|-----------|--------------|------|
| web | `@/*` | `./src/*` |
| web | `@/components/*` | `./src/components/*` |
| web | `@/lib/*` | `./src/lib/*` |
| agent | `@/*` | `./*` |

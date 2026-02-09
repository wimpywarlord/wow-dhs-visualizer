---
alwaysApply: true
name: "Copilot Instructions"
description: "Instructions for Copilot to follow when generating code for both frontend and backend development."
---

## Frontend Development (React/Next.js)

You are a Senior Front-End Developer and an Expert in React 18, Next 14, JavaScript, TypeScript 5, HTML, CSS and modern UI/UX frameworks (primarily Shadcn, as well as TailwindCSS 3 and Radix).

### Frontend Tech Stack

- React 18
- Next 14
- TypeScript 5
- TailwindCSS 3
- Tanstack Query
- Shadcn UI
- Radix UI
- JavaScript
- HTML
- CSS

### Frontend Code Implementation Guidelines

- **Package Manager**: STRICTLY use Bun for all client-side package management, installations, and script execution. Never use npm or yarn.
- **Type Safety**: Enforce strict TypeScript type safety. Always define proper types/interfaces, avoid using `any`, and ensure all props, state, and function parameters are properly typed.
- **API Calls**: STRICTLY use Tanstack Query (React Query) for ALL API-related operations. Never use fetch or axios directly - always wrap API calls in Tanstack Query hooks (useQuery, useMutation, etc.).
- **Responsive Design**: ALL UI components MUST be responsive. Use Tailwind's responsive utility classes (sm:, md:, lg:, xl:, 2xl:) to ensure proper rendering across all screen sizes.
- **Navigation**: Always use Next.js Navigation API (useRouter, usePathname, useSearchParams, etc.) for all navigation-related tasks.
- **Imports**: Always use @ import alias in Next.js client-side code (e.g., @/components, @/lib, @/utils).
- **Icons**: Always use Lucide icons or React Icons for all icon needs.
- **Logging**: Use console.log liberally for frontend debugging and development.
- Always use Tailwind classes for styling HTML elements; avoid using CSS or style tags.
- All frontend variables are CamelCase
- Use "class:" instead of the tertiary operator in class tags whenever possible.
- Use descriptive variable and function/const names. Event functions should be named with a "handle" prefix, like "handleClick" for onClick and "handleKeyDown" for onKeyDown.
- Implement accessibility features on elements. For example, a tag should have a tabindex="0", aria-label, onClick, and onKeyDown, and similar attributes.
- Use consts instead of functions, for example, "const toggle = () =>". Also, define a type if possible.
- Use Shadcn UI React components as the PRIMARY building blocks for any UI. Prefer using Shadcn variants over raw HTML or other component libraries whenever possible, and customize them using their props and Tailwind utility classes.
- Make sure we use unified loader in all places

---

## Backend Development (Python/FastAPI)

You are an expert in Python, FastAPI, and scalable API development.

### Backend Tech Stack

- Python
- FastAPI
- Pydantic v2

### Backend Code Implementation Guidelines

- **Package Manager**: STRICTLY use uv for all backend Python package management.
- **Logging**: Use @server/brain/utils/logger.py for all backend logging (log liberally for debugging and monitoring).
- Use early returns whenever possible to make the code more readable.
- Use functional components (plain functions) and Pydantic models for input validation and response schemas.
- All backend variables are snake_case
- Use declarative route definitions with clear return type annotations.
- Use def for synchronous operations and async def for asynchronous ones.
- Minimize @app.on_event("startup") and @app.on_event("shutdown"); prefer lifespan context managers for managing startup and shutdown events.
- Use middleware for logging, error monitoring, and performance optimization.
- Optimize for performance using async functions for I/O-bound tasks, caching strategies, and lazy loading.
- Use HTTPException for expected errors and model them as specific HTTP responses.
- Use middleware for handling unexpected errors, logging, and error monitoring.
- Use Pydantic's BaseModel for consistent input/output validation and response schemas.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., is_active, has_permission).
- Use lowercase with underscores for directories and files (e.g., routers/user_routes.py).
- Favor named exports for routes and utility functions.
- Use type hints for all function signatures. Prefer Pydantic models over raw dictionaries for input validation.

---

## Type-Safe Contract Between Frontend & Backend

### Philosophy

We enforce a **type-safe contract** between our FastAPI backend and Next.js frontend using **Design by Contract** principles. Backend Pydantic models serve as the single source of truth, auto-generating TypeScript types to ensure compile-time type safety across the entire stack.

### How It Works

```
Backend (Pydantic Models)
    ↓
FastAPI generates OpenAPI spec
    ↓
openapi-typescript generates TypeScript types
    ↓
Frontend imports types for API calls
    ↓
Tanstack Query uses types for type-safe queries
```

### Implementation Rules (for new code)

**Backend (Pydantic):**
- Define all request/response models using Pydantic v2
- Use proper type hints on all endpoint return types
- Add descriptions to models and fields for better generated docs
- Keep models in `/server/models/` (not inline in routes when possible)

**Frontend (TypeScript):**
- Generate types from OpenAPI: `bun run types` (requires backend running)
- Import types from `@/types/generated`
- Use Tanstack Query for ALL API calls (never direct fetch)
- Let TypeScript infer types from generated schemas

**Workflow for New Endpoints:**
1. Define Pydantic models in `/server/models/`
2. Create FastAPI route with type annotations
3. Start backend: `cd server && uv run python main.py`
4. Generate types: `cd client && bun run types`
5. Create Tanstack Query hook in `/client/src/hooks/api/`
6. Use hook in component with full type safety

---

## Safety Rules

- For expensive operations (APIs) write results incrementally, NEVER store only in memory
- Always confirm twice before performing a destructive action.
- ALWAYS backup first for destructive actions

---

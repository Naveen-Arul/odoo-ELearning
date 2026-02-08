# Copilot instructions for SkillForge AI

## Big-picture architecture
- MERN monorepo: Express/Mongo backend in backend/ and React frontend in frontend/; a separate Next.js DSA visualizer lives in dsa/dsa-visualizer/ (run in dev via root scripts).
- Backend entrypoint is [backend/server.js](../backend/server.js): initializes Datadog/Sentry (optional), connects Mongo, seeds on every startup, mounts API under /api/v1, and starts cron jobs via `schedulerService`.
- Backend routing is “routes → middleware → models/services”. Route handlers use `asyncHandler` + `ApiError` from [backend/middleware/errorHandler.js](../backend/middleware/errorHandler.js).
- AI flows: REST endpoints in [backend/routes/ai.js](../backend/routes/ai.js) use `AIChatSession` + `AIService` with provider fallback (Perplexity → Groq → Gemini) and mock responses when no keys in [backend/services/aiService.js](../backend/services/aiService.js).

## Critical workflows
- Full dev stack: root `npm run dev` runs backend + frontend + dsa visualizer (see [package.json](../package.json)). Backend runs on 5000 by default; frontend expects /api/v1 baseURL in [frontend/src/services/api.js](../frontend/src/services/api.js).
- Backend only: `npm run dev` in backend/ (seeds on startup). Use backend/seed/seedData.js for reseeding.
- Frontend only: `npm start` in frontend/.

## Backend conventions
- Use `protect`, `authorize`, `isAdmin` from [backend/middleware/auth.js](../backend/middleware/auth.js) for access control; JWT is required for protected routes.
- Use validation middleware from [backend/middleware/validation.js](../backend/middleware/validation.js) (e.g., `roadmapValidation`, `objectIdValidation`) before handlers.
- Error responses are centralized in `errorHandler`; throw `new ApiError(message, status)` for consistent JSON errors.
- Scheduled jobs live in [backend/services/schedulerService.js](../backend/services/schedulerService.js); jobs are started from `server.js` (disabled in test env).
- File uploads for AI helper are stored in backend/uploads/ai-helper (see multer config in [backend/routes/ai.js](../backend/routes/ai.js)).

## Frontend conventions
- API access is centralized in [frontend/src/services/api.js](../frontend/src/services/api.js) with axios interceptors for `token`/`refreshToken` handling.
- Auth state is in Zustand `useAuthStore` with `initialize()` at app start; see [frontend/src/store/authStore.js](../frontend/src/store/authStore.js).
- App UI state (theme, roadmaps, study plan) is in `useAppStore`; see [frontend/src/store/appStore.js](../frontend/src/store/appStore.js).
- Route guards use `ProtectedRoute` and `AdminRoute` in [frontend/src/components/common/ProtectedRoute.js](../frontend/src/components/common/ProtectedRoute.js) and [frontend/src/components/common/AdminRoute.js](../frontend/src/components/common/AdminRoute.js); routing is declared in [frontend/src/App.js](../frontend/src/App.js).

## Integration points & environment
- OAuth is wired in [backend/config/passport.js](../backend/config/passport.js) and expects Google/GitHub keys.
- AI providers and optional tracing/monitoring are configured via env vars consumed in [backend/services/aiService.js](../backend/services/aiService.js) and [backend/server.js](../backend/server.js).

## When adding features
- Add new API endpoints in the appropriate backend route file under backend/routes/, keep response shape `{ success, data, message }` consistent with existing handlers, and wire into [backend/server.js](../backend/server.js).
- Add matching frontend API wrappers in [frontend/src/services/api.js](../frontend/src/services/api.js) and call them from pages or stores.

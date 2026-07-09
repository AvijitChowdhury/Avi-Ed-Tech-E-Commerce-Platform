// Force TS to load @tanstack/start-client-core's `serverRoute` module
// augmentation so `createFileRoute({ server: { handlers: ... } })` typechecks.
import type { RouteServerOptions } from "@tanstack/start-client-core/dist/esm/serverRoute";
export type _KeepAlive = RouteServerOptions<any, any, any, any, any, any, any, any, any, any, any>;

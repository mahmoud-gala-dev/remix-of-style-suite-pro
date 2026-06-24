import { createFileRoute } from "@tanstack/react-router";

const SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Vanguard Public API",
    version: "1.0.0",
    description:
      "Tenant-scoped read API for branches, services, and bookings. Authenticate with `Authorization: Bearer vk_<prefix>_<secret>`. Each key is rate-limited independently.",
  },
  servers: [{ url: "/api/public/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "vk_*" },
    },
    schemas: {
      Branch: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          timezone: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Service: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          branch_id: { type: "string", format: "uuid" },
          name: { type: "string" },
          duration_min: { type: "integer" },
          price: { type: "number" },
          active: { type: "boolean" },
        },
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          branch_id: { type: "string", format: "uuid" },
          customer_id: { type: "string", format: "uuid", nullable: true },
          service_id: { type: "string", format: "uuid", nullable: true },
          employee_id: { type: "string", format: "uuid", nullable: true },
          start_at: { type: "string", format: "date-time" },
          end_at: { type: "string", format: "date-time" },
          status: { type: "string" },
          total: { type: "number" },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" }, detail: { type: "string" } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/branches": {
      get: {
        summary: "List branches in the authenticated tenant",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "array", items: { $ref: "#/components/schemas/Branch" } } },
                },
              },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/services": {
      get: {
        summary: "List services (optionally filtered by branch_id)",
        parameters: [
          { name: "branch_id", in: "query", required: false, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "array", items: { $ref: "#/components/schemas/Service" } } },
                },
              },
            },
          },
        },
      },
    },
    "/bookings": {
      get: {
        summary: "List bookings (filterable by from/to ISO timestamps)",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 100 } },
        ],
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "array", items: { $ref: "#/components/schemas/Booking" } } },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const Route = createFileRoute("/api/public/v1/openapi/json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(SPEC, null, 2), {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
        }),
    },
  },
});
*** End Patch
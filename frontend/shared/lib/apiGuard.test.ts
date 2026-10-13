/** @jest-environment node */
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { guardApiCall } from "./apiGuard";
import { createRouteClient } from "@/shared/lib/supabase/server";

jest.mock("@/shared/lib/supabase/server", () => ({
  createRouteClient: jest.fn(),
}));

const request = new NextRequest("http://localhost/api/detect", {
  method: "POST",
});

function mockSupabase({
  user = { id: "user-1" } as object | null,
  rpc = { data: true, error: null } as { data: unknown; error: unknown },
} = {}) {
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    rpc: jest.fn().mockResolvedValue(rpc),
  };
  jest.mocked(createRouteClient).mockReturnValue(client as never);
  return client;
}

describe("guardApiCall", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it("rejects requests without a signed-in user", async () => {
    const supabase = mockSupabase({ user: null });

    const response = await guardApiCall(request);

    expect(response?.status).toBe(401);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("lets a user with quota left through, spending one call", async () => {
    const supabase = mockSupabase();

    expect(await guardApiCall(request)).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith("consume_api_call");
  });

  it("answers 429 once the daily quota is used up", async () => {
    mockSupabase({ rpc: { data: false, error: null } });

    const response = await guardApiCall(request);

    expect(response?.status).toBe(429);
  });

  it("fails closed when the quota can't be checked", async () => {
    mockSupabase({ rpc: { data: null, error: { message: "boom" } } });

    const response = await guardApiCall(request);

    expect(response?.status).toBe(503);
  });

  it("doesn't spend quota on unmetered routes", async () => {
    const supabase = mockSupabase();

    expect(await guardApiCall(request, { metered: false })).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("API routes", () => {
  // Public on purpose: only reports whether the backend is awake
  const PUBLIC_ROUTES = ["warmup/route.ts"];

  const apiDir = path.join(__dirname, "../../app/api");
  const routes = readdirSync(apiDir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith("route.ts"))
    .map((file) => file.split(path.sep).join("/"))
    .filter((file) => !PUBLIC_ROUTES.includes(file));

  it.each(routes)("%s guards every handler", (file) => {
    const source = readFileSync(path.join(apiDir, file), "utf8");
    const handlers =
      source.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) ??
      [];
    const guards = source.match(/await guardApiCall\(request/g) ?? [];

    expect(handlers.length).toBeGreaterThan(0);
    expect(guards).toHaveLength(handlers.length);
  });
});

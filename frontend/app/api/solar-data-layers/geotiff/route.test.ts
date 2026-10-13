/** @jest-environment node */
import { NextRequest } from "next/server";

jest.mock("@/shared/lib/apiGuard", () => ({
  guardApiCall: jest.fn().mockResolvedValue(null),
}));

const GEOTIFF_URL = "https://solar.googleapis.com/v1/geoTiff:get?id=abc";

async function proxy(url: string) {
  process.env.GOOGLE_MAPS_API_KEY = "test-google-key";
  // The route reads the key at import time
  const { GET } = await import("./route");
  const request = new NextRequest(
    `http://localhost/api/solar-data-layers/geotiff?url=${encodeURIComponent(
      url,
    )}`,
  );
  return GET(request);
}

describe("GeoTIFF proxy", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it.each([
    ["cloud metadata", "http://169.254.169.254/latest/meta-data/"],
    ["another host", "https://attacker.example/v1/geoTiff:get?id=abc"],
    ["plain http", "http://solar.googleapis.com/v1/geoTiff:get?id=abc"],
    ["another Google path", "https://solar.googleapis.com/v1/dataLayers:get"],
    [
      "lookalike host",
      "https://solar.googleapis.com.attacker.example/v1/geoTiff:get",
    ],
  ])("refuses %s without sending the key anywhere", async (_, url) => {
    const response = await proxy(url);

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds the server key only to Google Solar GeoTIFF requests", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    const response = await proxy(GEOTIFF_URL);

    expect(response.status).toBe(200);
    const forwarded = new URL(fetchMock.mock.calls[0][0]);
    expect(forwarded.host).toBe("solar.googleapis.com");
    expect(forwarded.searchParams.get("key")).toBe("test-google-key");
    expect(response.headers.get("cache-control")).toMatch(/^private/);
  });
});

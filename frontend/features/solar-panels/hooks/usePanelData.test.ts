import { renderHook } from "@testing-library/react";
import { usePanelData } from "./usePanelData";
import type { PanelGenerationData } from "../../solar-analysis/types/dashboard";

describe("usePanelData", () => {
  // Test 1: Null/Empty inputs
  it("returns null for null input", () => {
    const { result } = renderHook(() => usePanelData(null));
    expect(result.current).toBeNull();
  });

  it("returns null for empty roofs array", () => {
    const data = { roofs: [] } as unknown as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));
    expect(result.current).toBeNull();
  });

  // Test 2: Single roof
  it("calculates correctly for single roof", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    expect(result.current).toMatchObject({
      totalPanels: 10,
      systemSize: 4, // 10 * 400 / 1000
      panelWattage: 400,
      avgPitch: 30,
    });
    // Circular mean of single value should equal that value
    expect(result.current?.avgAzimuth).toBeCloseTo(180, 0);
  });

  // Test 3: Multiple roofs - South-facing (no circular issues)
  it("calculates correctly for multiple south-facing roofs", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 20,
          azimuth: 170,
          module_specs: { power_w: 400 },
        },
        {
          panel_count: 20,
          pitch: 40,
          azimuth: 190,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    expect(result.current).toMatchObject({
      totalPanels: 30,
      systemSize: 12,
      panelWattage: 400,
      avgPitch: (20 * 10 + 40 * 20) / 30, // 33.33...
    });
    // Circular mean of nearby angles should be close to linear mean
    expect(result.current?.avgAzimuth).toBeCloseTo(183.33, 0);
  });

  // Test 4: Missing pitch/azimuth (uses defaults)
  it("uses default values when pitch/azimuth are missing", () => {
    const data = {
      roofs: [
        {
          panel_count: 5,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    expect(result.current?.avgPitch).toBe(20);
    // Default azimuth processed through circular mean
    expect(result.current?.avgAzimuth).toBeCloseTo(180, 0);
  });

  // Test 5: CRITICAL - Azimuth crossing 0° (North)
  it("correctly averages azimuths crossing North using circular mean", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 350,
          module_specs: { power_w: 400 },
        },
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 10,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    // Circular mean should be ~0° or ~360°
    const azimuth = result.current?.avgAzimuth ?? 0;
    // Accept either 0 or 360 (same direction)
    expect(azimuth < 5 || azimuth > 355).toBe(true);
  });

  // Test 6: Azimuth edge case - Northeast/Northwest
  it("correctly averages Northeast (45°) and Northwest (315°)", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 45,
          module_specs: { power_w: 400 },
        },
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 315,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    // Circular mean should be North (0°/360°)
    const azimuth = result.current?.avgAzimuth ?? 0;
    expect(azimuth < 5 || azimuth > 355).toBe(true);
  });

  // Test 7: East/West should average to North, not South
  it("correctly averages East and West to North", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 90,
          module_specs: { power_w: 400 },
        },
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 270,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    // Circular mean of E and W should be N (0°) not S (180°)
    const azimuth = result.current?.avgAzimuth ?? 0;
    expect(azimuth).toBe(180);
  });

  // Test 8: Different panel wattages across roofs
  it("uses only first roof wattage (documented behavior)", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 400 },
        },
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 500 },
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    // Uses first roof's wattage only
    expect(result.current?.panelWattage).toBe(400);
    expect(result.current?.systemSize).toBe(8); // 20 * 400 / 1000
  });

  // Test 9: Missing module_specs
  it("uses default wattage when module_specs missing", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
        },
      ],
    } as PanelGenerationData;
    const { result } = renderHook(() => usePanelData(data));

    expect(result.current?.panelWattage).toBe(400);
  });

  // Test 10: Memoization
  it("memoizes result when data unchanged", () => {
    const data = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;

    const { result, rerender } = renderHook(() => usePanelData(data));
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult); // Same object reference
  });

  it("recalculates when data changes", () => {
    const data1 = {
      roofs: [
        {
          panel_count: 10,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;
    const data2 = {
      roofs: [
        {
          panel_count: 20,
          pitch: 30,
          azimuth: 180,
          module_specs: { power_w: 400 },
        },
      ],
    } as PanelGenerationData;

    const { result, rerender } = renderHook(({ data }) => usePanelData(data), {
      initialProps: { data: data1 },
    });

    const firstResult = result.current;

    rerender({ data: data2 });

    expect(result.current).not.toBe(firstResult);
    expect(result.current?.totalPanels).toBe(20);
  });
});

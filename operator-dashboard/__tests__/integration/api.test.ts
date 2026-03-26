/**
 * Integration tests for operator-dashboard API service.
 * Verifies that every ApiService method calls fetch with the correct
 * URL, HTTP method, headers, and body.
 */

// --- fetch mock ---
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// --- localStorage mock ---
const store: Record<string, string> = {};
Object.defineProperty(global, "localStorage", {
  value: {
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
    }),
    clear: jest.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
    }),
  },
});

import api from "@/lib/api";

const ok = (body: any): Partial<Response> => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

describe("ApiService – integration route tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(store)) delete store[k];
    (api as any).token = null;
    store["authToken"] = "test-tok";
  });

  // Helper to get the first fetch call's URL & options
  const fetchUrl = () => mockFetch.mock.calls[0][0] as string;
  const fetchOpts = () => mockFetch.mock.calls[0][1] as RequestInit;
  const fetchBody = () => JSON.parse(fetchOpts().body as string);

  // ---- Auth routes ----
  it("login → POST /auth/login with email & password", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        status: "success",
        data: {
          token: "jwt",
          user: { _id: "1", role: "operator" },
        },
      }),
    );
    await api.login("op@t.com", "pw");
    expect(fetchUrl()).toMatch(/\/auth\/login$/);
    expect(fetchOpts().method).toBe("POST");
    expect(fetchBody()).toEqual({ email: "op@t.com", password: "pw" });
  });

  it("register → POST /auth/register", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        status: "success",
        data: { token: "jwt", user: { _id: "2", role: "operator" } },
      }),
    );
    const data = {
      name: "N",
      email: "n@t.com",
      password: "p",
      passwordConfirm: "p",
      role: "operator" as const,
      company: "Co",
    };
    await api.register(data);
    expect(fetchUrl()).toMatch(/\/auth\/register$/);
    expect(fetchOpts().method).toBe("POST");
  });

  it("logout → POST /auth/logout", async () => {
    mockFetch.mockResolvedValueOnce(ok({}));
    await api.logout();
    expect(fetchUrl()).toMatch(/\/auth\/logout$/);
    expect(fetchOpts().method).toBe("POST");
  });

  it("getCurrentUser → GET /auth/me with auth header", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { user: { _id: "1" } } }),
    );
    await api.getCurrentUser();
    expect(fetchUrl()).toMatch(/\/auth\/me$/);
    expect(fetchOpts().method).toBeUndefined(); // GET is default for fetch
    expect(
      (fetchOpts().headers as Record<string, string>)["Authorization"],
    ).toBe("Bearer test-tok");
  });

  // ---- Station routes ----
  it("getMyStations → GET /stations/my-stations", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { stations: [] } }),
    );
    await api.getMyStations();
    expect(fetchUrl()).toMatch(/\/stations\/my-stations$/);
  });

  it("getStation → GET /stations/:id", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { station: { _id: "s1" } } }),
    );
    await api.getStation("s1");
    expect(fetchUrl()).toMatch(/\/stations\/s1$/);
  });

  it("createStation → POST /stations", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { station: { _id: "new" } } }),
    );
    await api.createStation({ name: "S" } as any);
    expect(fetchUrl()).toMatch(/\/stations$/);
    expect(fetchOpts().method).toBe("POST");
  });

  it("updateStation → PATCH /stations/:id", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { station: { _id: "s1" } } }),
    );
    await api.updateStation("s1", { name: "U" } as any);
    expect(fetchUrl()).toMatch(/\/stations\/s1$/);
    expect(fetchOpts().method).toBe("PATCH");
  });

  it("deleteStation → DELETE /stations/:id", async () => {
    mockFetch.mockResolvedValueOnce(ok({ status: "success" }));
    await api.deleteStation("s1");
    expect(fetchUrl()).toMatch(/\/stations\/s1$/);
    expect(fetchOpts().method).toBe("DELETE");
  });

  it("addPort → POST /stations/:id/ports", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { station: { _id: "s1" } } }),
    );
    await api.addPort("s1", {
      connectorType: "CCS",
      power_kW: 50,
      total: 2,
      pricePerKWh: 5,
    } as any);
    expect(fetchUrl()).toMatch(/\/stations\/s1\/ports$/);
    expect(fetchOpts().method).toBe("POST");
  });

  it("updateOccupancy → PATCH /stations/:id/occupancy", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { station: { _id: "s1" } } }),
    );
    await api.updateOccupancy("s1", {
      connectorType: "CCS",
      occupied: 2,
    } as any);
    expect(fetchUrl()).toMatch(/\/stations\/s1\/occupancy$/);
    expect(fetchOpts().method).toBe("PATCH");
    expect(fetchBody()).toEqual({ connectorType: "CCS", occupied: 2 });
  });

  it("getAllStations → GET /stations with query params", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { stations: [] } }),
    );
    await api.getAllStations({
      status: "active",
      lat: 28.6,
      lng: 77.2,
      radius: 10,
    });
    const url = fetchUrl();
    expect(url).toContain("/stations");
    expect(url).toContain("status=active");
    expect(url).toContain("lat=28.6");
    expect(url).toContain("lng=77.2");
    expect(url).toContain("radius=10");
  });

  it("getAllStations without params → GET /stations (no query string)", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ status: "success", data: { stations: [] } }),
    );
    await api.getAllStations();
    expect(fetchUrl()).toMatch(/\/stations$/);
  });
});

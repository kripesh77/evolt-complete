/**
 * Unit tests for operator-dashboard ApiService (src/lib/api.ts)
 * Tests route construction, auth token management, and response handling.
 */

// --- Global fetch mock ---
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// --- localStorage mock ---
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, val: string) => {
    store[key] = val;
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key];
  }),
  clear: jest.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
};
Object.defineProperty(global, "localStorage", { value: mockLocalStorage });

// --- Import api AFTER mocks are in place ---
import api from "@/lib/api";

// Helper: build a successful Response-like object
const okResponse = (body: any): Partial<Response> => ({
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue(body),
});

const errResponse = (status: number, msg: string): Partial<Response> => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({ message: msg }),
});

describe("ApiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    // Reset internal token
    (api as any).token = null;
  });

  // ---------- Token management ----------
  describe("Token management", () => {
    it("setToken should store token in localStorage", () => {
      api.setToken("tok123");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "authToken",
        "tok123",
      );
    });

    it("clearToken should remove token from localStorage", () => {
      api.setToken("tok123");
      api.clearToken();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("user");
    });

    it("getStoredToken should read from localStorage", () => {
      store["authToken"] = "stored-tok";
      expect(api.getStoredToken()).toBe("stored-tok");
    });

    it("isAuthenticated should return true when token exists", () => {
      store["authToken"] = "tok";
      expect(api.isAuthenticated()).toBe(true);
    });

    it("isAuthenticated should return false when no token", () => {
      expect(api.isAuthenticated()).toBe(false);
    });
  });

  // ---------- Authentication ----------
  describe("Authentication", () => {
    it("login should POST /auth/login and store token for operators", async () => {
      const body = {
        status: "success",
        data: {
          token: "jwt-op",
          user: { _id: "1", name: "Op", role: "operator" },
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse(body));

      const result = await api.login("op@test.com", "pass");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(result).toEqual(body);
      expect(store["authToken"]).toBe("jwt-op");
    });

    it("login should reject non-operator users", async () => {
      const body = {
        status: "success",
        data: {
          token: "jwt-u",
          user: { _id: "2", name: "User", role: "user" },
        },
      };
      mockFetch.mockResolvedValueOnce(okResponse(body));

      await expect(api.login("user@test.com", "pass")).rejects.toThrow(
        "station operators",
      );
    });

    it("register should POST /auth/register", async () => {
      const body = {
        status: "success",
        data: { token: "jwt-new", user: { _id: "3", role: "operator" } },
      };
      mockFetch.mockResolvedValueOnce(okResponse(body));

      const userData = {
        name: "New",
        email: "n@t.com",
        password: "p",
        passwordConfirm: "p",
        role: "operator" as const,
        company: "TestCo",
      };
      await api.register(userData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/register"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("logout should POST /auth/logout and clear token", async () => {
      api.setToken("tok");
      mockFetch.mockResolvedValueOnce(okResponse({}));

      await api.logout();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/logout"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(api.isAuthenticated()).toBe(false);
    });

    it("getCurrentUser should GET /auth/me", async () => {
      store["authToken"] = "tok";
      const body = {
        status: "success",
        data: { user: { _id: "1", name: "Op" } },
      };
      mockFetch.mockResolvedValueOnce(okResponse(body));

      const user = await api.getCurrentUser();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/me"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer tok",
          }),
        }),
      );
      expect(user).toEqual({ _id: "1", name: "Op" });
    });
  });

  // ---------- Stations ----------
  describe("Station endpoints", () => {
    beforeEach(() => {
      store["authToken"] = "tok";
    });

    it("getMyStations should GET /stations/my-stations", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { stations: [{ _id: "s1" }] },
        }),
      );
      const stations = await api.getMyStations();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/my-stations"),
        expect.any(Object),
      );
      expect(stations).toEqual([{ _id: "s1" }]);
    });

    it("getStation should GET /stations/:id", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { station: { _id: "s1" } },
        }),
      );
      const station = await api.getStation("s1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/s1"),
        expect.any(Object),
      );
      expect(station).toEqual({ _id: "s1" });
    });

    it("createStation should POST /stations", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { station: { _id: "new" } },
        }),
      );
      await api.createStation({ name: "Test" } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/stations$/),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("updateStation should PATCH /stations/:id", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { station: { _id: "s1" } },
        }),
      );
      await api.updateStation("s1", { name: "Updated" } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/s1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("deleteStation should DELETE /stations/:id", async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ status: "success" }));
      await api.deleteStation("s1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/s1"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("addPort should POST /stations/:id/ports", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { station: { _id: "s1" } },
        }),
      );
      await api.addPort("s1", {
        connectorType: "CCS",
        power_kW: 50,
        total: 2,
        pricePerKWh: 5,
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/s1/ports"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("updateOccupancy should PATCH /stations/:id/occupancy", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { station: { _id: "s1" } },
        }),
      );
      await api.updateOccupancy("s1", {
        connectorType: "CCS",
        occupied: 1,
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stations/s1/occupancy"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("getAllStations should GET /stations with query params", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          status: "success",
          data: { stations: [] },
        }),
      );
      await api.getAllStations({ status: "active", vehicleType: "car" });
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/stations");
      expect(calledUrl).toContain("status=active");
      expect(calledUrl).toContain("vehicleType=car");
    });
  });

  // ---------- Error handling ----------
  describe("Error handling", () => {
    it("should throw on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce(errResponse(400, "Bad request"));
      await expect(api.getMyStations()).rejects.toThrow("Bad request");
    });

    it("should clear token on 401 response", async () => {
      store["authToken"] = "old-token";
      (api as any).token = "old-token";

      mockFetch.mockResolvedValueOnce(errResponse(401, "Unauthorized"));
      await expect(api.getMyStations()).rejects.toThrow("Unauthorized");

      // token should be cleared after 401
      expect((api as any).token).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
    });
  });
});

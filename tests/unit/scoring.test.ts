import {
  normalizeInverse,
  normalizeDirect,
  calculateDistanceScore,
  calculateAvailabilityScore,
  calculateWaitScore,
  calculatePowerScore,
  calculateCostScore,
  calculateBatterySafetyScore,
  calculateFinalScore,
  scoreStations,
  type StationScoreInput,
} from "../../src/utils/scoring";
import type { ScoringWeights } from "../../src/types/vehicle";

describe("Scoring Utilities", () => {
  describe("normalizeInverse", () => {
    it("should normalize values where lower is better", () => {
      expect(normalizeInverse(0, 100)).toBe(1);
      expect(normalizeInverse(100, 100)).toBe(0);
      expect(normalizeInverse(50, 100)).toBe(0.5);
    });

    it("should handle edge cases", () => {
      expect(normalizeInverse(0, 0)).toBe(1);
      expect(normalizeInverse(150, 100)).toBe(0); // Value exceeds max
    });
  });

  describe("normalizeDirect", () => {
    it("should normalize values where higher is better", () => {
      expect(normalizeDirect(100, 100)).toBe(1);
      expect(normalizeDirect(0, 100)).toBe(0);
      expect(normalizeDirect(50, 100)).toBe(0.5);
    });

    it("should handle edge cases", () => {
      expect(normalizeDirect(0, 0)).toBe(0);
      expect(normalizeDirect(150, 100)).toBe(1); // Capped at max
    });
  });

  describe("calculateDistanceScore", () => {
    it("should give higher score to closer stations", () => {
      const closeScore = calculateDistanceScore(1, 50);
      const farScore = calculateDistanceScore(40, 50);
      expect(closeScore).toBeGreaterThan(farScore);
    });

    it("should return 1 for distance 0", () => {
      expect(calculateDistanceScore(0, 50)).toBe(1);
    });
  });

  describe("calculateAvailabilityScore", () => {
    it("should give higher score to more available slots", () => {
      const fullAvailable = calculateAvailabilityScore(5, 5);
      const halfAvailable = calculateAvailabilityScore(2, 5);
      const noneAvailable = calculateAvailabilityScore(0, 5);

      expect(fullAvailable).toBeGreaterThan(halfAvailable);
      expect(halfAvailable).toBeGreaterThan(noneAvailable);
    });

    it("should include bonus for any free slots", () => {
      const withFreeSlots = calculateAvailabilityScore(1, 10);
      expect(withFreeSlots).toBeGreaterThan(0.1); // Base 0.1 + bonus
    });
  });

  describe("calculateWaitScore", () => {
    it("should give higher score to shorter wait times", () => {
      const noWait = calculateWaitScore(0, 60);
      const shortWait = calculateWaitScore(15, 60);
      const longWait = calculateWaitScore(45, 60);

      expect(noWait).toBeGreaterThan(shortWait);
      expect(shortWait).toBeGreaterThan(longWait);
    });

    it("should return 1 for no wait", () => {
      expect(calculateWaitScore(0, 60)).toBe(1);
    });
  });

  describe("calculatePowerScore", () => {
    it("should calculate power score for bikes", () => {
      const lowPower = calculatePowerScore(2, "bike");
      const highPower = calculatePowerScore(5, "bike");
      expect(highPower).toBeGreaterThan(lowPower);
    });

    it("should calculate power score for cars", () => {
      const slowCharger = calculatePowerScore(7, "car");
      const fastCharger = calculatePowerScore(150, "car");
      expect(fastCharger).toBeGreaterThan(slowCharger);
    });
  });

  describe("calculateCostScore", () => {
    it("should give higher score to lower prices", () => {
      const cheap = calculateCostScore(5, "bike");
      const expensive = calculateCostScore(10, "bike");
      expect(cheap).toBeGreaterThan(expensive);
    });
  });

  describe("calculateBatterySafetyScore", () => {
    it("should give high score when well within range", () => {
      const safeScore = calculateBatterySafetyScore(10, 100);
      expect(safeScore).toBeGreaterThan(0.8);
    });

    it("should give lower score near limit", () => {
      const riskyScore = calculateBatterySafetyScore(80, 100);
      expect(riskyScore).toBeLessThan(0.5);
    });

    it("should return 0 when out of range", () => {
      expect(calculateBatterySafetyScore(100, 100)).toBe(0);
      expect(calculateBatterySafetyScore(110, 100)).toBe(0);
    });
  });

  describe("calculateFinalScore", () => {
    it("should calculate weighted average of scores", () => {
      const scores = {
        distance: 0.8,
        availability: 0.6,
        waitTime: 0.9,
        power: 0.7,
        cost: 0.5,
      };

      const weights: ScoringWeights = {
        distance: 0.25,
        availability: 0.2,
        waitTime: 0.2,
        power: 0.2,
        cost: 0.15,
      };

      const finalScore = calculateFinalScore(scores, weights);
      expect(finalScore).toBeGreaterThan(0);
      expect(finalScore).toBeLessThanOrEqual(1);
    });

    it("should handle equal weights", () => {
      const scores = {
        distance: 1,
        availability: 1,
        waitTime: 1,
        power: 1,
        cost: 1,
      };

      const weights: ScoringWeights = {
        distance: 1,
        availability: 1,
        waitTime: 1,
        power: 1,
        cost: 1,
      };

      expect(calculateFinalScore(scores, weights)).toBe(1);
    });
  });

  describe("scoreStations", () => {
    it("should score and sort stations by final score", () => {
      const stations: StationScoreInput[] = [
        {
          stationId: "station1",
          distanceKm: 5,
          freeSlots: 2,
          totalSlots: 4,
          waitTimeMinutes: 0,
          powerKW: 50,
          pricePerKWh: 0.45,
          reachableKm: 100,
        },
        {
          stationId: "station2",
          distanceKm: 20,
          freeSlots: 0,
          totalSlots: 4,
          waitTimeMinutes: 30,
          powerKW: 100,
          pricePerKWh: 0.5,
          reachableKm: 100,
        },
        {
          stationId: "station3",
          distanceKm: 2,
          freeSlots: 4,
          totalSlots: 4,
          waitTimeMinutes: 0,
          powerKW: 22,
          pricePerKWh: 0.35,
          reachableKm: 100,
        },
      ];

      const scored = scoreStations(stations, "car");

      // Should be sorted by score descending
      expect(scored[0]!.score).toBeGreaterThanOrEqual(scored[1]!.score);
      expect(scored[1]!.score).toBeGreaterThanOrEqual(scored[2]!.score);

      // Each station should have scores object
      scored.forEach((s) => {
        expect(s.scores).toBeDefined();
        expect(s.scores.distance).toBeDefined();
        expect(s.scores.availability).toBeDefined();
      });
    });

    it("should handle empty station list", () => {
      const scored = scoreStations([], "car");
      expect(scored).toEqual([]);
    });

    it("should handle single station", () => {
      const stations: StationScoreInput[] = [
        {
          stationId: "station1",
          distanceKm: 5,
          freeSlots: 2,
          totalSlots: 4,
          waitTimeMinutes: 0,
          powerKW: 50,
          pricePerKWh: 0.45,
          reachableKm: 100,
        },
      ];

      const scored = scoreStations(stations, "car");
      expect(scored).toHaveLength(1);
      expect(scored[0]!.score).toBeGreaterThan(0);
    });
  });
});

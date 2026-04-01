import dotenv from "dotenv";
dotenv.config({ path: "./config.env" });

import type {
  GeoLocation,
  RouteInfo,
  GeoPolygon,
  DistanceMatrixResult,
} from "../types/vehicle.js";

const ORS_BASE_URL = "https://api.openrouteservice.org";

/**
 * RouteService - Handles route calculations and polygon buffer creation
 * using OpenRouteService APIs
 */
export class RouteService {
  private static apiKey: string = process.env.ORS_API_KEY || "";

  /**
   * Get driving route between two points from OpenRouteService
   */
  static async getRoute(
    origin: GeoLocation,
    destination: GeoLocation,
  ): Promise<RouteInfo> {
    if (!this.apiKey) {
      throw new Error("ORS_API_KEY is not configured");
    }

    const response = await fetch(
      `${ORS_BASE_URL}/v2/directions/driving-car/geojson`,
      {
        method: "POST",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [origin.longitude, origin.latitude],
            [destination.longitude, destination.latitude],
          ],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouteService Directions API error: ${error}`);
    }

    const data = (await response.json()) as {
      features: Array<{
        geometry: { coordinates: [number, number][] };
        properties: {
          segments: Array<{ distance: number; duration: number }>;
        };
      }>;
      bbox?: [number, number, number, number];
    };

    const feature = data.features[0]!;
    const geometry = feature.geometry;
    const properties = feature.properties;

    // Extract polyline coordinates
    const polyline: [number, number][] = geometry.coordinates;

    // Extract bounding box
    const bbox = data.bbox || this.calculateBoundingBox(polyline);

    return {
      polyline,
      totalDistanceKm: properties.segments[0]!.distance / 1000, // Convert meters to km
      totalDurationMinutes: properties.segments[0]!.duration / 60, // Convert seconds to minutes
      boundingBox: {
        minLon: bbox[0],
        minLat: bbox[1],
        maxLon: bbox[2],
        maxLat: bbox[3],
      },
    };
  }

  /**
   * Create a polygon buffer around the route polyline
   * Uses convex hull of offset points to guarantee a valid (non-self-intersecting) polygon
   */
  static createRouteBuffer(
    polyline: [number, number][],
    offsetKm: number,
  ): GeoPolygon {
    // Convert offset from km to approximate degrees
    // At equator: 1 degree ≈ 111 km
    const avgLat =
      polyline.reduce((sum, coord) => sum + coord[1], 0) / polyline.length;
    const latOffset = offsetKm / 111;
    const lonOffset = offsetKm / (111 * Math.cos((avgLat * Math.PI) / 180));

    // Generate offset points around each polyline point (8 directions)
    const allPoints: [number, number][] = [];
    const directions = 8;

    for (const point of polyline) {
      for (let d = 0; d < directions; d++) {
        const angle = (d * 2 * Math.PI) / directions;
        const offsetPoint: [number, number] = [
          point[0] + Math.cos(angle) * lonOffset,
          point[1] + Math.sin(angle) * latOffset,
        ];
        allPoints.push(offsetPoint);
      }
    }

    // Compute convex hull of all offset points
    const hull = this.convexHull(allPoints);

    // Close the polygon
    if (hull.length > 0) {
      hull.push(hull[0]!);
    }

    return {
      type: "Polygon",
      coordinates: [hull],
    };
  }

  /**
   * Compute convex hull using Graham scan algorithm
   * Returns points in counter-clockwise order (required by GeoJSON)
   */
  private static convexHull(points: [number, number][]): [number, number][] {
    if (points.length < 3) return points;

    // Find the point with lowest y (and leftmost if tie)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (
        points[i]![1] < points[start]![1] ||
        (points[i]![1] === points[start]![1] &&
          points[i]![0] < points[start]![0])
      ) {
        start = i;
      }
    }

    const startPoint = points[start]!;

    // Sort points by polar angle with respect to start point
    const sorted = points
      .filter((_, i) => i !== start)
      .sort((a, b) => {
        const angleA = Math.atan2(a[1] - startPoint[1], a[0] - startPoint[0]);
        const angleB = Math.atan2(b[1] - startPoint[1], b[0] - startPoint[0]);
        if (angleA !== angleB) return angleA - angleB;
        // If same angle, closer point first
        const distA = (a[0] - startPoint[0]) ** 2 + (a[1] - startPoint[1]) ** 2;
        const distB = (b[0] - startPoint[0]) ** 2 + (b[1] - startPoint[1]) ** 2;
        return distA - distB;
      });

    // Graham scan
    const hull: [number, number][] = [startPoint];

    for (const point of sorted) {
      // Remove points that make clockwise turn
      while (
        hull.length > 1 &&
        this.crossProduct(
          hull[hull.length - 2]!,
          hull[hull.length - 1]!,
          point,
        ) <= 0
      ) {
        hull.pop();
      }
      hull.push(point);
    }

    return hull;
  }

  /**
   * Cross product of vectors OA and OB where O is origin
   * Positive = counter-clockwise, Negative = clockwise, Zero = collinear
   */
  private static crossProduct(
    o: [number, number],
    a: [number, number],
    b: [number, number],
  ): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  /**
   * Get distance matrix from one origin to multiple destinations
   * Uses OpenRouteService Matrix API - single request for all distances
   */
  static async getDistanceMatrix(
    origin: GeoLocation,
    destinations: GeoLocation[],
  ): Promise<DistanceMatrixResult> {
    if (!this.apiKey) {
      throw new Error("ORS_API_KEY is not configured");
    }

    if (destinations.length === 0) {
      return { distances: [[]], durations: [[]] };
    }

    // ORS Matrix API has a limit of 50 locations per request
    // Origin is index 0, destinations start from index 1
    const MAX_LOCATIONS = 50;
    if (destinations.length > MAX_LOCATIONS - 1) {
      // Split into batches and merge results
      return this.getDistanceMatrixBatched(origin, destinations);
    }

    const locations: [number, number][] = [
      [origin.longitude, origin.latitude],
      ...destinations.map((d) => [d.longitude, d.latitude] as [number, number]),
    ];

    const response = await fetch(`${ORS_BASE_URL}/v2/matrix/driving-car`, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        sources: [0], // Only calculate from origin
        destinations: destinations.map((_, i) => i + 1), // All stations
        metrics: ["distance", "duration"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouteService Matrix API error: ${error}`);
    }

    const data = (await response.json()) as {
      distances: number[][];
      durations: number[][];
    };

    return {
      distances: data.distances, // meters
      durations: data.durations, // seconds
    };
  }

  /**
   * Handle large number of destinations by batching requests
   */
  private static async getDistanceMatrixBatched(
    origin: GeoLocation,
    destinations: GeoLocation[],
  ): Promise<DistanceMatrixResult> {
    const BATCH_SIZE = 49; // Leave room for origin
    const batches: GeoLocation[][] = [];

    for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
      batches.push(destinations.slice(i, i + BATCH_SIZE));
    }

    const results = await Promise.all(
      batches.map((batch) => this.getDistanceMatrix(origin, batch)),
    );

    // Merge results
    const allDistances: number[] = [];
    const allDurations: number[] = [];

    for (const result of results) {
      if (result.distances[0]) {
        allDistances.push(...result.distances[0]);
      }
      if (result.durations[0]) {
        allDurations.push(...result.durations[0]);
      }
    }

    return {
      distances: [allDistances],
      durations: [allDurations],
    };
  }

  /**
   * Calculate bounding box from polyline coordinates
   */
  private static calculateBoundingBox(
    polyline: [number, number][],
  ): [number, number, number, number] {
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;

    for (const [lon, lat] of polyline) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Simplify polyline by reducing number of points (Douglas-Peucker algorithm)
   * Useful for creating smoother buffers around long routes
   */
  static simplifyPolyline(
    polyline: [number, number][],
    tolerance: number = 0.001,
  ): [number, number][] {
    if (polyline.length <= 2) return polyline;

    // Find the point with maximum distance from the line between first and last
    let maxDist = 0;
    let maxIndex = 0;

    const first = polyline[0]!;
    const last = polyline[polyline.length - 1]!;

    for (let i = 1; i < polyline.length - 1; i++) {
      const dist = this.perpendicularDistance(polyline[i]!, first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDist > tolerance) {
      const left = this.simplifyPolyline(
        polyline.slice(0, maxIndex + 1),
        tolerance,
      );
      const right = this.simplifyPolyline(polyline.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }

    return [first, last];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private static perpendicularDistance(
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number],
  ): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];

    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) {
      // Line start and end are the same point
      const pdx = point[0] - lineStart[0];
      const pdy = point[1] - lineStart[1];
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) /
          lengthSq,
      ),
    );

    const projX = lineStart[0] + t * dx;
    const projY = lineStart[1] + t * dy;

    const distX = point[0] - projX;
    const distY = point[1] - projY;

    return Math.sqrt(distX * distX + distY * distY);
  }
}

export default RouteService;

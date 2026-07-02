import Vehicle, { type VehicleDocument } from "../models/Vehicle.js";
import VehicleRequest, {
  MAX_PENDING_REQUESTS_PER_USER,
  type VehicleRequestDocument,
  type VehicleRequestStatus,
} from "../models/VehicleRequest.js";
import type { VehicleType, ConnectorType } from "../types/vehicle.js";

export interface CreateVehicleInput {
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  batteryCapacity_kWh: number;
  compatibleConnectors: ConnectorType[];
  addedBy?: string;
}

export interface SubmitVehicleRequestInput {
  requestedBy: string;
  make: string;
  modelName: string;
  variant?: string;
  vehicleType: VehicleType;
  batteryCapacity_kWh?: number;
  compatibleConnectors?: ConnectorType[];
  notes?: string;
}

export interface ReviewVehicleRequestInput {
  reviewedBy: string;
  reviewNotes?: string;
  // Required when approving — admin supplies/corrects verified specs
  vehicleData?: Omit<CreateVehicleInput, "addedBy">;
}

/**
 * Thrown for client-facing errors (bad input, not found, conflict).
 * Controller maps `status` to the HTTP response code.
 */
export class VehicleServiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VehicleServiceError";
    this.status = status;
  }
}

/**
 * Vehicle Service - Catalog search, user requests, and admin moderation
 */
export class VehicleService {
  /**
   * Search the verified vehicle catalog.
   * Public — no authentication required.
   */
  static async searchVehicles(
    query: string,
    vehicleType?: VehicleType,
    limit = 20,
  ): Promise<VehicleDocument[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    return Vehicle.search(query, vehicleType, safeLimit);
  }

  /**
   * Get a single catalog vehicle by ID.
   * Used to resolve a saved vehicleId reference into full specs.
   */
  static async getVehicleById(vehicleId: string): Promise<VehicleDocument> {
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      isActive: true,
    });

    if (!vehicle) {
      throw new VehicleServiceError("Vehicle not found in catalog", 404);
    }

    return vehicle;
  }

  /**
   * Get multiple catalog vehicles by ID (e.g. resolving a user's saved list).
   * Silently omits IDs that no longer resolve (deactivated/deleted) rather
   * than failing the whole batch.
   */
  static async getVehiclesByIds(
    vehicleIds: string[],
  ): Promise<VehicleDocument[]> {
    if (vehicleIds.length === 0) return [];

    const filter: Record<string, unknown> = {
      _id: { $in: vehicleIds },
      isActive: true,
    };

    return Vehicle.find(filter);
  }

  /**
   * Create a catalog vehicle directly.
   * Admin-only — does not go through the request/review flow.
   */
  static async createVehicle(
    input: CreateVehicleInput,
  ): Promise<VehicleDocument> {
    const filter: Record<string, unknown> = {
      make: { $regex: `^${escapeRegex(input.make.trim())}$`, $options: "i" },
      modelName: {
        $regex: `^${escapeRegex(input.modelName.trim())}$`,
        $options: "i",
      },
      variant: input.variant
        ? { $regex: `^${escapeRegex(input.variant.trim())}$`, $options: "i" }
        : { $in: [null, ""] },
      vehicleType: input.vehicleType,
    };

    const existing = await Vehicle.findOne(filter);

    if (existing) {
      throw new VehicleServiceError(
        "A vehicle with this make, model, and variant already exists in the catalog",
        409,
      );
    }

    return Vehicle.create(input);
  }

  /**
   * Submit a request for a vehicle missing from the catalog.
   * Authenticated users only. Rejects if:
   *  - an exact-match request from anyone is already pending
   *  - the requesting user already has MAX_PENDING_REQUESTS_PER_USER pending
   */
  static async submitVehicleRequest(
    input: SubmitVehicleRequestInput,
  ): Promise<VehicleRequestDocument> {
    const pendingCount = await VehicleRequest.countPendingForUser(
      input.requestedBy,
    );

    if (pendingCount >= MAX_PENDING_REQUESTS_PER_USER) {
      throw new VehicleServiceError(
        `You already have ${MAX_PENDING_REQUESTS_PER_USER} pending vehicle requests. ` +
          "Please wait for admin review before submitting more.",
        429,
      );
    }

    // Check the catalog itself first — the vehicle might already exist
    const catalogFilter: Record<string, unknown> = {
      make: { $regex: `^${escapeRegex(input.make.trim())}$`, $options: "i" },
      modelName: {
        $regex: `^${escapeRegex(input.modelName.trim())}$`,
        $options: "i",
      },
      variant: input.variant
        ? { $regex: `^${escapeRegex(input.variant.trim())}$`, $options: "i" }
        : { $in: [null, ""] },
      vehicleType: input.vehicleType,
      isActive: true,
    };

    const inCatalog = await Vehicle.findOne(catalogFilter);

    if (inCatalog) {
      throw new VehicleServiceError(
        "This vehicle already exists in the catalog — search for it instead of requesting it",
        409,
      );
    }

    const duplicate = await VehicleRequest.findPendingDuplicate(
      input.make,
      input.modelName,
      input.variant,
      input.vehicleType,
    );

    if (duplicate) {
      throw new VehicleServiceError(
        "A request for this make and model is already pending review",
        409,
      );
    }

    return VehicleRequest.create(input);
  }

  /**
   * List vehicle requests for admin moderation.
   */
  static async listVehicleRequests(
    status?: VehicleRequestStatus,
    limit = 50,
  ): Promise<VehicleRequestDocument[]> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const safeLimit = Math.min(Math.max(limit, 1), 100);

    return VehicleRequest.find({ ...filter, status: "pending" })
      .sort({ createdAt: 1 }) // oldest first — first in, first reviewed
      .limit(safeLimit)
      .populate("requestedBy", "name email");
  }

  /**
   * Approve a vehicle request: creates the catalog entry and links it back
   * to the request. Admin supplies/corrects final verified specs.
   */
  static async approveVehicleRequest(
    requestId: string,
    review: ReviewVehicleRequestInput,
  ): Promise<{ request: VehicleRequestDocument; vehicle: VehicleDocument }> {
    const request = await VehicleRequest.findById(requestId);

    if (!request) {
      throw new VehicleServiceError("Vehicle request not found", 404);
    }

    if (request.status !== "pending") {
      throw new VehicleServiceError(
        `Request has already been ${request.status}`,
        409,
      );
    }

    // Admin-supplied specs take precedence; fall back to what the user submitted
    const specs = review.vehicleData;
    const batteryCapacity_kWh =
      specs?.batteryCapacity_kWh ?? request.batteryCapacity_kWh;
    const compatibleConnectors =
      specs?.compatibleConnectors ?? request.compatibleConnectors;

    if (
      batteryCapacity_kWh === undefined ||
      !compatibleConnectors ||
      compatibleConnectors.length === 0
    ) {
      throw new VehicleServiceError(
        "batteryCapacity_kWh, and compatibleConnectors " +
          "are required to approve a request (the user did not provide them, " +
          "so they must be supplied in vehicleData)",
        400,
      );
    }

    const vehicle = await VehicleService.createVehicle({
      make: specs?.make ?? request.make,
      modelName: specs?.modelName ?? request.modelName,
      variant: specs?.variant ?? request.variant,
      vehicleType: specs?.vehicleType ?? request.vehicleType,
      batteryCapacity_kWh,
      compatibleConnectors,
      addedBy: review.reviewedBy,
    });

    request.status = "approved";
    request.reviewedBy =
      review.reviewedBy as unknown as typeof request.reviewedBy;
    request.reviewNotes = review.reviewNotes;
    request.resultingVehicleId =
      vehicle._id as typeof request.resultingVehicleId;
    await request.save();

    return { request, vehicle };
  }

  /**
   * Reject a vehicle request without creating a catalog entry.
   */
  static async rejectVehicleRequest(
    requestId: string,
    review: ReviewVehicleRequestInput,
  ): Promise<VehicleRequestDocument> {
    const request = await VehicleRequest.findById(requestId);

    if (!request) {
      throw new VehicleServiceError("Vehicle request not found", 404);
    }

    if (request.status !== "pending") {
      throw new VehicleServiceError(
        `Request has already been ${request.status}`,
        409,
      );
    }

    request.status = "rejected";
    request.reviewedBy =
      review.reviewedBy as unknown as typeof request.reviewedBy;
    request.reviewNotes = review.reviewNotes;
    await request.save();

    return request;
  }

  static async getMyVehiclesRequest(
    id: string,
  ): Promise<VehicleRequestDocument[]> {
    return await VehicleRequest.find({ requestedBy: id }).sort({
      createdAt: -1,
    });
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default VehicleService;

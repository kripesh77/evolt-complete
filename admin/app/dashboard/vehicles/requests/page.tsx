"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/api";
import {
  VehicleRequest,
  ConnectorType,
  VehicleType,
  CONNECTOR_OPTIONS,
} from "@/types";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Loader2,
  Battery,
  User,
  MessageSquare,
} from "lucide-react";

function getRequester(request: VehicleRequest) {
  if (typeof request.requestedBy === "object" && request.requestedBy) {
    return request.requestedBy;
  }
  return null;
}

export default function VehicleRequestsPage() {
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<VehicleRequest | null>(
    null,
  );
  const [rejectModal, setRejectModal] = useState<VehicleRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [approveForm, setApproveForm] = useState({
    batteryCapacity_kWh: 0,
    compatibleConnectors: [] as ConnectorType[],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getVehicleRequests({ limit: 50 });
      setRequests(data);
    } catch (error) {
      console.error("Failed to load vehicle requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openApproveModal = (request: VehicleRequest) => {
    setError("");
    setReviewNotes("");
    setApproveForm({
      batteryCapacity_kWh: request.batteryCapacity_kWh || 0,
      compatibleConnectors:
        request.compatibleConnectors?.length
          ? [...request.compatibleConnectors]
          : request.vehicleType === "bike"
            ? ["AC_SLOW"]
            : ["Type2"],
    });
    setApproveModal(request);
  };

  const toggleApproveConnector = (connector: ConnectorType) => {
    if (!approveModal) return;
    const option = CONNECTOR_OPTIONS.find((c) => c.value === connector);
    if (!option || option.vehicleType !== approveModal.vehicleType) return;

    setApproveForm((prev) => ({
      ...prev,
      compatibleConnectors: prev.compatibleConnectors.includes(connector)
        ? prev.compatibleConnectors.length > 1
          ? prev.compatibleConnectors.filter((c) => c !== connector)
          : prev.compatibleConnectors
        : [...prev.compatibleConnectors, connector],
    }));
  };

  const handleApprove = async () => {
    if (!approveModal) return;

    if (
      !approveForm.batteryCapacity_kWh ||
      approveForm.compatibleConnectors.length === 0
    ) {
      setError("Battery capacity and at least one connector are required");
      return;
    }

    setProcessingId(approveModal._id);
    setError("");

    try {
      await api.approveVehicleRequest(approveModal._id, {
        reviewNotes: reviewNotes.trim() || undefined,
        vehicleData: {
          batteryCapacity_kWh: approveForm.batteryCapacity_kWh,
          compatibleConnectors: approveForm.compatibleConnectors,
        },
      });

      setRequests((prev) => prev.filter((r) => r._id !== approveModal._id));
      setApproveModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    setProcessingId(rejectModal._id);
    setError("");

    try {
      await api.rejectVehicleRequest(
        rejectModal._id,
        reviewNotes.trim() || undefined,
      );
      setRequests((prev) => prev.filter((r) => r._id !== rejectModal._id));
      setRejectModal(null);
      setReviewNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Requests</h1>
        <p className="text-gray-600">
          Review user-submitted vehicles and approve or reject them
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No pending requests
          </h3>
          <p className="mt-2 text-gray-500">
            All vehicle requests have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const requester = getRequester(request);
            const needsSpecs =
              !request.batteryCapacity_kWh ||
              !request.compatibleConnectors?.length;

            return (
              <div
                key={request._id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="relative h-40 w-full flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 lg:h-32 lg:w-48">
                    {request.image ? (
                      <Image
                        src={request.image}
                        alt={`${request.make} ${request.modelName}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.make} {request.modelName}
                          {request.variant ? ` ${request.variant}` : ""}
                        </h3>
                        <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {request.vehicleType}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                        Pending
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      {requester && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          {requester.name} ({requester.email})
                        </span>
                      )}
                      {request.batteryCapacity_kWh ? (
                        <span className="flex items-center gap-1">
                          <Battery className="h-4 w-4 text-green-600" />
                          {request.batteryCapacity_kWh} kWh
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          Battery capacity not provided
                        </span>
                      )}
                      {request.compatibleConnectors?.length ? (
                        <span>
                          Connectors: {request.compatibleConnectors.join(", ")}
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          Connectors not provided
                        </span>
                      )}
                      {request.notes && (
                        <span className="flex items-start gap-1 sm:col-span-2">
                          <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                          {request.notes}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => openApproveModal(request)}
                        disabled={processingId === request._id}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                        {needsSpecs && (
                          <span className="text-xs opacity-80">
                            (specs required)
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setError("");
                          setReviewNotes("");
                          setRejectModal(request);
                        }}
                        disabled={processingId === request._id}
                        className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Approve Vehicle Request
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {approveModal.make} {approveModal.modelName}
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Battery Capacity (kWh) *
                </label>
                <input
                  type="number"
                  value={approveForm.batteryCapacity_kWh || ""}
                  onChange={(e) =>
                    setApproveForm({
                      ...approveForm,
                      batteryCapacity_kWh: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="1"
                  step="0.1"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Compatible Connectors *
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONNECTOR_OPTIONS.filter(
                    (c) => c.vehicleType === approveModal.vehicleType,
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleApproveConnector(option.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        approveForm.compatibleConnectors.includes(option.value)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional note for the user..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setApproveModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processingId === approveModal._id}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {processingId === approveModal._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Reject Vehicle Request
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {rejectModal.make} {rejectModal.modelName}
            </p>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Explain why this request was rejected..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectModal._id}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === rejectModal._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

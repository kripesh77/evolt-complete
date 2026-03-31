"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { formatOperatingHours } from "@/lib/utils";
import { Station, Port } from "@/types";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Zap,
  MapPin,
  Clock,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useOccupancySocket, useStationRoom, OccupancyChangedPayload } from "@/lib/socket";

export default function StationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.id as string;

  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Real-time occupancy updates
  const handleOccupancyChanged = useCallback(
    (payload: OccupancyChangedPayload) => {
      if (payload.stationId !== stationId) return;
      setStation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ports: prev.ports.map((p) =>
            p.connectorType === payload.connectorType
              ? { ...p, occupied: payload.occupied, total: payload.total }
              : p,
          ),
        };
      });
    },
    [stationId],
  );

  useOccupancySocket(handleOccupancyChanged);
  
  // Join station room when operator enters edit page
  useStationRoom(stationId);

  useEffect(() => {
    loadStation();
  }, [stationId]);

  const loadStation = async () => {
    try {
      const data = await api.getStation(stationId);
      setStation(data);
    } catch (error) {
      console.error("Failed to load station:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOccupancy = async (port: Port, delta: number) => {
    if (!station) return;

    const newOccupied = port.occupied + delta;
    if (newOccupied < 0 || newOccupied > port.total) return;

    setIsUpdating(port.connectorType);

    try {
      const updatedStation = await api.updateOccupancy(stationId, {
        connectorType: port.connectorType,
        occupied: newOccupied,
      });
      setStation(updatedStation);
    } catch (error) {
      console.error("Failed to update occupancy:", error);
      alert("Failed to update occupancy");
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleStatus = async () => {
    if (!station) return;

    try {
      const newStatus = station.status === "active" ? "inactive" : "active";
      const updatedStation = await api.updateStation(stationId, {
        status: newStatus,
      });
      setStation(updatedStation);
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await api.deleteStation(stationId);
      router.push("/dashboard/stations");
    } catch (error) {
      console.error("Failed to delete station:", error);
      alert("Failed to delete station");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="rounded-xl bg-white p-12 text-center shadow-sm">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Station not found
        </h3>
        <Link
          href="/dashboard/stations"
          className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stations
        </Link>
      </div>
    );
  }

  const totalPorts = station.ports.reduce((s, p) => s + p.total, 0);
  const occupiedPorts = station.ports.reduce((s, p) => s + p.occupied, 0);
  const availablePorts = totalPorts - occupiedPorts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/stations"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{station.name}</h1>
            <p className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-4 w-4" />
              {station.address}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/stations/${stationId}/edit`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => setDeleteModal(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1 flex items-center gap-2">
                {station.status === "active" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-lg font-semibold capitalize">
                  {station.status}
                </span>
              </div>
            </div>
            <button
              onClick={toggleStatus}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                station.status === "active"
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {station.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Availability</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-600">
              {availablePorts}
            </span>
            <span className="text-gray-500">
              / {totalPorts} ports available
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${totalPorts > 0 ? (availablePorts / totalPorts) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Operating Hours</p>
          <div className="mt-1 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-lg font-semibold">
              {formatOperatingHours(station.operatingHours)}
            </span>
          </div>
        </div>
      </div>

      {/* Station Images */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ImageIcon className="h-5 w-5 text-green-600" />
          Station Images
        </h2>

        {station.images && station.images.length > 0 ? (
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={station.images[currentImageIndex]}
                alt={`${station.name} - Image ${currentImageIndex + 1}`}
                fill
                className="object-cover"
              />
              
              {/* Navigation arrows for multiple images */}
              {station.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? station.images!.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === station.images!.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  
                  {/* Image counter */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                    {currentImageIndex + 1} / {station.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip for multiple images */}
            {station.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {station.images.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg ${
                      index === currentImageIndex
                        ? "ring-2 ring-green-500"
                        : "ring-1 ring-gray-200 hover:ring-gray-300"
                    }`}
                  >
                    <Image
                      src={imageUrl}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12">
            <ImageIcon className="h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No images uploaded</p>
            <Link
              href={`/dashboard/stations/${stationId}/edit`}
              className="mt-3 text-sm font-medium text-green-600 hover:text-green-700"
            >
              Add images in edit mode
            </Link>
          </div>
        )}
      </div>

      {/* Ports - Occupancy Management */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Zap className="h-5 w-5 text-green-600" />
          Charging Ports - Real-time Occupancy
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Update port occupancy in real-time as vehicles connect or disconnect.
        </p>

        <div className="space-y-4">
          {station.ports.map((port) => {
            const available = port.total - port.occupied;
            const occupancyPercent = (port.occupied / port.total) * 100;

            return (
              <div
                key={port.connectorType}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                        available > 0
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {port.connectorType}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {port.powerKW} kW • {port.vehicleType} • ₹
                        {port.pricePerKWh}/kWh
                      </p>
                    </div>
                  </div>

                  {/* Occupancy Controls */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Occupied</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateOccupancy(port, -1)}
                          disabled={
                            port.occupied === 0 ||
                            isUpdating === port.connectorType
                          }
                          className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center text-xl font-bold">
                          {isUpdating === port.connectorType ? (
                            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                          ) : (
                            port.occupied
                          )}
                        </span>
                        <button
                          onClick={() => updateOccupancy(port, 1)}
                          disabled={
                            port.occupied >= port.total ||
                            isUpdating === port.connectorType
                          }
                          className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-px h-12 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="text-xl font-bold text-green-600">
                        {available}
                      </p>
                    </div>
                    <div className="w-px h-12 bg-gray-200" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-xl font-bold text-gray-600">
                        {port.total}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancyPercent > 80
                          ? "bg-red-500"
                          : occupancyPercent > 50
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                    <span>{occupancyPercent.toFixed(0)}% occupied</span>
                    <span>{available} slots free</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Location Map Preview */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapPin className="h-5 w-5 text-green-600" />
          Location
        </h2>
        <div className="aspect-video overflow-hidden rounded-lg bg-gray-100">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              station.location.coordinates[0] - 0.01
            }%2C${station.location.coordinates[1] - 0.01}%2C${
              station.location.coordinates[0] + 0.01
            }%2C${
              station.location.coordinates[1] + 0.01
            }&layer=mapnik&marker=${station.location.coordinates[1]}%2C${
              station.location.coordinates[0]
            }`}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Coordinates: {station.location.coordinates[1].toFixed(6)},{" "}
          {station.location.coordinates[0].toFixed(6)}
        </p>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Station
            </h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete &quot;{station.name}&quot;? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

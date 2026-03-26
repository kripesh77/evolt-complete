"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import api from "@/lib/api";
import {
  Station,
  ConnectorType,
  VehicleType,
  CONNECTOR_OPTIONS,
} from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Loader2,
  MapPin,
  Save,
  AlertCircle,
} from "lucide-react";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

interface PortFormData {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  occupied: number;
  pricePerKWh: number;
}

export default function EditStationPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.id as string;

  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    operatingHours: "",
    status: "active" as "active" | "inactive",
    location: {
      lat: 28.6139,
      lng: 77.209,
    },
  });

  const [ports, setPorts] = useState<PortFormData[]>([]);

  useEffect(() => {
    loadStation();
  }, [stationId]);

  const loadStation = async () => {
    try {
      const data = await api.getStation(stationId);
      setStation(data);
      setFormData({
        name: data.name,
        address: data.address,
        operatingHours: data.operatingHours,
        status: data.status,
        location: {
          lat: data.location.coordinates[1],
          lng: data.location.coordinates[0],
        },
      });
      setPorts(
        data.ports.map((p) => ({
          connectorType: p.connectorType,
          vehicleType: p.vehicleType,
          powerKW: p.powerKW,
          total: p.total,
          occupied: p.occupied,
          pricePerKWh: p.pricePerKWh,
        })),
      );
    } catch (error) {
      console.error("Failed to load station:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (location: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: location.address,
      location: { lat: location.lat, lng: location.lng },
    }));
  };

  const handlePortChange = (
    index: number,
    field: keyof PortFormData,
    value: string | number,
  ) => {
    const newPorts = [...ports];

    if (field === "connectorType") {
      const connector = CONNECTOR_OPTIONS.find((c) => c.value === value);
      newPorts[index] = {
        ...newPorts[index],
        connectorType: value as ConnectorType,
        vehicleType: connector?.vehicleType || "car",
      };
    } else {
      newPorts[index] = {
        ...newPorts[index],
        [field]: typeof value === "string" ? parseFloat(value) || 0 : value,
      };
    }

    setPorts(newPorts);
  };

  const addPort = () => {
    setPorts([
      ...ports,
      {
        connectorType: "Type2",
        vehicleType: "car",
        powerKW: 22,
        total: 1,
        occupied: 0,
        pricePerKWh: 15,
      },
    ]);
  };

  const removePort = (index: number) => {
    if (ports.length > 1) {
      setPorts(ports.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Station name is required");
      return;
    }

    if (!formData.address.trim()) {
      setError("Please select a location on the map");
      return;
    }

    if (ports.length === 0) {
      setError("At least one port is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.updateStation(stationId, {
        name: formData.name,
        address: formData.address,
        operatingHours: formData.operatingHours,
        status: formData.status,
        location: {
          type: "Point",
          coordinates: [formData.location.lng, formData.location.lat],
        },
        ports: ports.map((p) => ({
          connectorType: p.connectorType,
          vehicleType: p.vehicleType,
          powerKW: p.powerKW,
          total: p.total,
          occupied: p.occupied,
          pricePerKWh: p.pricePerKWh,
        })),
      });

      router.push(`/dashboard/stations/${stationId}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update station";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/stations/${stationId}`}
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Station</h1>
          <p className="text-gray-600">Update {station.name}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Zap className="h-5 w-5 text-green-600" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Station Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Operating Hours
              </label>
              <input
                type="text"
                value={formData.operatingHours}
                onChange={(e) =>
                  setFormData({ ...formData, operatingHours: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapPin className="h-5 w-5 text-green-600" />
            Location
          </h2>

          <LocationPicker
            initialLocation={formData.location}
            onLocationChange={handleLocationChange}
          />

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

        {/* Ports */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Zap className="h-5 w-5 text-green-600" />
              Charging Ports
            </h2>
            <button
              type="button"
              onClick={addPort}
              className="flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200"
            >
              <Plus className="h-4 w-4" />
              Add Port
            </button>
          </div>

          <div className="space-y-4">
            {ports.map((port, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Port {index + 1}
                  </span>
                  {ports.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePort(index)}
                      className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Connector Type
                    </label>
                    <select
                      value={port.connectorType}
                      onChange={(e) =>
                        handlePortChange(index, "connectorType", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    >
                      {CONNECTOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Power (kW)
                    </label>
                    <input
                      type="number"
                      value={port.powerKW}
                      onChange={(e) =>
                        handlePortChange(index, "powerKW", e.target.value)
                      }
                      min="1"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Total Slots
                    </label>
                    <input
                      type="number"
                      value={port.total}
                      onChange={(e) =>
                        handlePortChange(index, "total", e.target.value)
                      }
                      min="1"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Occupied
                    </label>
                    <input
                      type="number"
                      value={port.occupied}
                      onChange={(e) =>
                        handlePortChange(index, "occupied", e.target.value)
                      }
                      min="0"
                      max={port.total}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Price (₹/kWh)
                    </label>
                    <input
                      type="number"
                      value={port.pricePerKWh}
                      onChange={(e) =>
                        handlePortChange(index, "pricePerKWh", e.target.value)
                      }
                      min="0"
                      step="0.5"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/dashboard/stations/${stationId}`}
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

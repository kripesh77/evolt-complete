"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import api from "@/lib/api";
import {
  ConnectorType,
  VehicleType,
  CONNECTOR_OPTIONS,
  OperatingHours,
} from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Loader2,
  MapPin,
} from "lucide-react";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

interface PortFormData {
  connectorType: ConnectorType;
  vehicleType: VehicleType;
  powerKW: number;
  total: number;
  pricePerKWh: number;
}

export default function NewStationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location: { lat: 28.6139, lng: 77.209 },
  });

  const [operatingHoursType, setOperatingHoursType] = useState<"24/7" | "custom">(
    "24/7",
  );
  const [customHours, setCustomHours] = useState({
    openTime: "09:00",
    closeTime: "21:00",
  });

  const [ports, setPorts] = useState<PortFormData[]>([
    {
      connectorType: "Type2",
      vehicleType: "car",
      powerKW: 22,
      total: 2,
      pricePerKWh: 15,
    },
  ]);

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

    setIsSubmitting(true);

    try {
      const operatingHours: OperatingHours =
        operatingHoursType === "24/7"
          ? { type: "24/7" }
          : {
              type: "custom",
              openTime: customHours.openTime,
              closeTime: customHours.closeTime,
            };

      await api.createStation({
        name: formData.name,
        address: formData.address,
        operatingHours,
        location: {
          type: "Point",
          coordinates: [formData.location.lng, formData.location.lat],
        },
        ports: ports.map((p) => ({
          connectorType: p.connectorType,
          vehicleType: p.vehicleType,
          powerKW: p.powerKW,
          total: p.total,
          pricePerKWh: p.pricePerKWh,
        })),
      });

      router.push("/dashboard/stations");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create station",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/stations"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Station</h1>
          <p className="text-gray-600">Create a new EV charging station</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Zap className="h-5 w-5 text-green-600" />
            Basic Information
          </h2>
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="e.g., EV Hub Downtown"
            />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Operating Hours
          </h2>
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={operatingHoursType === "24/7"}
                onChange={() => setOperatingHoursType("24/7")}
                className="h-4 w-4 text-green-600"
              />
              <span className="text-gray-700">24/7</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                checked={operatingHoursType === "custom"}
                onChange={() => setOperatingHoursType("custom")}
                className="h-4 w-4 text-green-600"
              />
              <span className="text-gray-700">Custom Hours</span>
            </label>
          </div>
          {operatingHoursType === "custom" && (
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={customHours.openTime}
                  onChange={(e) =>
                    setCustomHours({ ...customHours, openTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={customHours.closeTime}
                  onChange={(e) =>
                    setCustomHours({ ...customHours, closeTime: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800"
                />
              </div>
            </div>
          )}
        </div>

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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Connector
                    </label>
                    <select
                      value={port.connectorType}
                      onChange={(e) =>
                        handlePortChange(index, "connectorType", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                    >
                      {CONNECTOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/stations"
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
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create Station
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

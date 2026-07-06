"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { ConnectorType, VehicleType, CONNECTOR_OPTIONS, OperatingHours } from "@/types";
import { ArrowLeft, Plus, Trash2, Zap, Loader2, MapPin, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

// Dynamic import to avoid SSR issues with Leaflet
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
  pricePerKWh: number;
}

export default function NewStationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cloudinaryConfig, setCloudinaryConfig] = useState<{ cloudName: string; apiKey: string } | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    location: {
      lat: 28.6139,
      lng: 77.209,
    },
  });

  const [operatingHoursType, setOperatingHoursType] = useState<"24/7" | "custom">("24/7");
  const [customHours, setCustomHours] = useState({
    openTime: "09:00",
    closeTime: "21:00",
  });

  const [images, setImages] = useState<string[]>([]);

  const [ports, setPorts] = useState<PortFormData[]>([
    {
      connectorType: "Type2",
      vehicleType: "car",
      powerKW: 22,
      total: 2,
      pricePerKWh: 15,
    },
  ]);

  // Fetch Cloudinary config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.getCloudinaryConfig();
        setCloudinaryConfig(config);
      } catch (err) {
        console.error("Failed to fetch Cloudinary config:", err);
      }
    };
    fetchConfig();
  }, []);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !cloudinaryConfig) return;

    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }

    setUploadingImages(true);
    setError("");

    try {
      const uploadPromises = files.map((file) =>
        api.uploadImageToCloudinary(file, cloudinaryConfig)
      );
      const urls = await Promise.all(uploadPromises);
      setImages([...images, ...urls]);
    } catch (err) {
      setError("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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

    // Validate custom hours
    if (operatingHoursType === "custom") {
      if (!customHours.openTime || !customHours.closeTime) {
        setError("Please specify both opening and closing times");
        return;
      }
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
        images: images.length > 0 ? images : undefined,
      });

      router.push("/dashboard/stations");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create station";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
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
        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Zap className="h-5 w-5 text-green-600" />
            Basic Information
          </h2>

          <div className="space-y-4">
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
                className="w-full rounded-lg border border-gray-300 text-gray-800 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                placeholder="e.g., EV Hub Downtown"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Operating Hours
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="operatingHoursType"
                  value="24/7"
                  checked={operatingHoursType === "24/7"}
                  onChange={() => setOperatingHoursType("24/7")}
                  className="h-4 w-4 text-green-600"
                />
                <span className="text-gray-700">24/7 (Always Open)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="operatingHoursType"
                  value="custom"
                  checked={operatingHoursType === "custom"}
                  onChange={() => setOperatingHoursType("custom")}
                  className="h-4 w-4 text-green-600"
                />
                <span className="text-gray-700">Custom Hours</span>
              </label>
            </div>

            {operatingHoursType === "custom" && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Opening Time *
                  </label>
                  <input
                    type="time"
                    value={customHours.openTime}
                    onChange={(e) =>
                      setCustomHours({ ...customHours, openTime: e.target.value })
                    }
                    required={operatingHoursType === "custom"}
                    className="w-full rounded-lg border border-gray-300 text-gray-800 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Closing Time *
                  </label>
                  <input
                    type="time"
                    value={customHours.closeTime}
                    onChange={(e) =>
                      setCustomHours({ ...customHours, closeTime: e.target.value })
                    }
                    required={operatingHoursType === "custom"}
                    className="w-full rounded-lg border border-gray-300 text-gray-800 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <p className="col-span-2 text-sm text-gray-600">
                  {customHours.openTime < customHours.closeTime
                    ? `Station operates from ${customHours.openTime} to ${customHours.closeTime} daily`
                    : `Station operates from ${customHours.openTime} to ${customHours.closeTime} (crosses midnight)`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ImageIcon className="h-5 w-5 text-green-600" />
            Station Images (Optional)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingImages ? "Uploading..." : "Click to upload images"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Maximum 5 images, up to 5MB each
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages || images.length >= 5}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Station image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <MapPin className="h-5 w-5 text-green-600" />
            Location
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Search for a location or click on the map to select the station
            location.
          </p>

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
              className="w-full rounded-lg border border-gray-300 text-gray-800 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              placeholder="Address will be auto-filled from map selection"
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Connector Type
                    </label>
                    <select
                      value={port.connectorType}
                      onChange={(e) =>
                        handlePortChange(index, "connectorType", e.target.value)
                      }
                      className="text-gray-800 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                      className="w-full text-gray-800 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                      className="w-full text-gray-800 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                      className="text-gray-800 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
            href="/dashboard/stations"
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || uploadingImages}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : uploadingImages ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading Images...
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

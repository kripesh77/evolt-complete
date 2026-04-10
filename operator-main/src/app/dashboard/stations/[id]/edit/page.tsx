"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import {
  Station,
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
  Save,
  AlertCircle,
  Clock,
  ImageIcon,
  Upload,
  X,
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
    status: "active" as "active" | "inactive",
    location: {
      lat: 28.6139,
      lng: 77.209,
    },
  });

  // Operating hours state
  const [hoursType, setHoursType] = useState<"24/7" | "custom">("24/7");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");

  const [ports, setPorts] = useState<PortFormData[]>([]);

  // Image management state
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        status: data.status,
        location: {
          lat: data.location.coordinates[1],
          lng: data.location.coordinates[0],
        },
      });
      
      // Load operating hours
      if (data.operatingHours) {
        setHoursType(data.operatingHours.type);
        if (data.operatingHours.type === "custom") {
          setOpenTime(data.operatingHours.openTime || "09:00");
          setCloseTime(data.operatingHours.closeTime || "21:00");
        }
      }
      
      // Load images
      setImages(data.images || []);
      
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

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check max images limit
    if (images.length >= 5) {
      setImageError("Maximum 5 images allowed per station");
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    setImageError("");

    try {
      // Get Cloudinary config
      const cloudinaryConfig = await api.getCloudinaryConfig();
      
      // Upload to Cloudinary
      const imageUrl = await api.uploadImageToCloudinary(file, cloudinaryConfig);
      
      // Add to station in backend
      const updatedStation = await api.addStationImages(stationId, [imageUrl]);
      setImages(updatedStation.images || []);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Image delete handler
  const handleDeleteImage = async (imageUrl: string) => {
    setIsDeletingImage(imageUrl);
    setImageError("");

    try {
      const updatedStation = await api.deleteStationImage(stationId, imageUrl);
      setImages(updatedStation.images || []);
    } catch (err) {
      console.error("Failed to delete image:", err);
      setImageError(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setIsDeletingImage(null);
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

    // Build operating hours object
    const operatingHours: OperatingHours = hoursType === "24/7"
      ? { type: "24/7" }
      : { type: "custom", openTime, closeTime };

    setIsSubmitting(true);

    try {
      await api.updateStation(stationId, {
        name: formData.name,
        address: formData.address,
        operatingHours,
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
          </div>
        </div>

        {/* Operating Hours */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Clock className="h-5 w-5 text-green-600" />
            Operating Hours
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hoursType"
                  checked={hoursType === "24/7"}
                  onChange={() => setHoursType("24/7")}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">24/7 (Always Open)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="hoursType"
                  checked={hoursType === "custom"}
                  onChange={() => setHoursType("custom")}
                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Custom Hours</span>
              </label>
            </div>

            {hoursType === "custom" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
                {openTime > closeTime && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-amber-600">
                      ⓘ Station operates overnight (closes after midnight)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Station Images */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ImageIcon className="h-5 w-5 text-green-600" />
            Station Images
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Upload up to 5 images of your station. Images help users identify your station.
          </p>

          {imageError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {imageError}
            </div>
          )}

          {/* Image Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {images.map((imageUrl, index) => (
              <div key={index} className="group relative aspect-square">
                <Image
                  src={imageUrl}
                  alt={`Station image ${index + 1}`}
                  fill
                  className="rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(imageUrl)}
                  disabled={isDeletingImage === imageUrl}
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                >
                  {isDeletingImage === imageUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}

            {/* Upload Button */}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="mt-2 text-xs text-gray-500">Add Image</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <p className="mt-3 text-xs text-gray-400">
            {images.length}/5 images • Max 5MB per image • JPG, PNG, WebP supported
          </p>
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

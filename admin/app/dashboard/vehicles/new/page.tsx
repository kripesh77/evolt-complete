"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import {
  ConnectorType,
  VehicleType,
  CONNECTOR_OPTIONS,
} from "@/types";
import {
  ArrowLeft,
  Car,
  Loader2,
  Upload,
  Plus,
  Save,
} from "lucide-react";

export default function NewVehiclePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    make: "",
    modelName: "",
    variant: "",
    vehicleType: "car" as VehicleType,
    image: "",
    batteryCapacity_kWh: 50,
  });

  const [selectedConnectors, setSelectedConnectors] = useState<
    ConnectorType[]
  >(["Type2"]);

  const handleVehicleTypeChange = (type: VehicleType) => {
    setFormData((prev) => ({ ...prev, vehicleType: type }));
    const defaultConnector =
      type === "bike" ? "AC_SLOW" : ("Type2" as ConnectorType);
    setSelectedConnectors([defaultConnector]);
  };

  const toggleConnector = (connector: ConnectorType) => {
    const option = CONNECTOR_OPTIONS.find((c) => c.value === connector);
    if (!option || option.vehicleType !== formData.vehicleType) return;

    setSelectedConnectors((prev) =>
      prev.includes(connector)
        ? prev.length > 1
          ? prev.filter((c) => c !== connector)
          : prev
        : [...prev, connector],
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    setError("");

    try {
      const cloudinaryConfig = await api.getCloudinaryConfig();
      const imageUrl = await api.uploadImageToCloudinary(
        file,
        cloudinaryConfig,
      );
      setFormData((prev) => ({ ...prev, image: imageUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.make.trim() || !formData.modelName.trim()) {
      setError("Make and model name are required");
      return;
    }

    if (!formData.image) {
      setError("Please upload a vehicle image");
      return;
    }

    if (selectedConnectors.length === 0) {
      setError("Select at least one compatible connector");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.createVehicle({
        make: formData.make.trim(),
        modelName: formData.modelName.trim(),
        variant: formData.variant.trim() || undefined,
        vehicleType: formData.vehicleType,
        image: formData.image,
        batteryCapacity_kWh: formData.batteryCapacity_kWh,
        compatibleConnectors: selectedConnectors,
      });

      router.push("/dashboard/vehicles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vehicle");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableConnectors = CONNECTOR_OPTIONS.filter(
    (c) => c.vehicleType === formData.vehicleType,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vehicles"
          className="rounded-lg p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Vehicle</h1>
          <p className="text-gray-600">
            Add a new vehicle directly to the catalog
          </p>
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
            <Car className="h-5 w-5 text-green-600" />
            Vehicle Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Vehicle Type *
              </label>
              <div className="flex gap-3">
                {(["car", "bike"] as VehicleType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleVehicleTypeChange(type)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      formData.vehicleType === type
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Make *
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                  required
                  placeholder="e.g., Tata"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Model Name *
                </label>
                <input
                  type="text"
                  value={formData.modelName}
                  onChange={(e) =>
                    setFormData({ ...formData, modelName: e.target.value })
                  }
                  required
                  placeholder="e.g., Nexon EV"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Variant
              </label>
              <input
                type="text"
                value={formData.variant}
                onChange={(e) =>
                  setFormData({ ...formData, variant: e.target.value })
                }
                placeholder="e.g., Max"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Battery Capacity (kWh) *
              </label>
              <input
                type="number"
                value={formData.batteryCapacity_kWh}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    batteryCapacity_kWh: parseFloat(e.target.value) || 0,
                  })
                }
                min="1"
                step="0.1"
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Compatible Connectors *
              </label>
              <div className="flex flex-wrap gap-2">
                {availableConnectors.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleConnector(option.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedConnectors.includes(option.value)
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Vehicle Image *
          </h2>

          {formData.image ? (
            <div className="relative mb-4 aspect-video w-full max-w-md overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={formData.image}
                alt="Vehicle preview"
                fill
                className="object-cover"
              />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isUploadingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {formData.image ? "Replace Image" : "Upload Image"}
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/vehicles"
            className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingImage}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Create Vehicle
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

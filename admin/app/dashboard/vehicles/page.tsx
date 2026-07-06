"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { Vehicle, VehicleType } from "@/types";
import { Plus, Search, Car, Battery, Zap } from "lucide-react";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, typeFilter]);

  const loadVehicles = async () => {
    try {
      const data = await api.searchVehicles({ limit: 50 });
      setVehicles(data);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.make.toLowerCase().includes(q) ||
          v.modelName.toLowerCase().includes(q) ||
          v.variant?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((v) => v.vehicleType === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  console.log(vehicles);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Catalog</h1>
          <p className="text-gray-600">
            Browse and manage verified EV models in the platform
          </p>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          Add Vehicle
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by make, model, or variant..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | VehicleType)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="all">All Types</option>
          <option value="car">Car</option>
          <option value="bike">Bike</option>
        </select>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <Car className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {vehicles.length === 0
              ? "No vehicles in catalog"
              : "No vehicles found"}
          </h3>
          {vehicles.length === 0 && (
            <Link
              href="/dashboard/vehicles/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add First Vehicle
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle._id}
              className="overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md border border-black/20"
            >
              <div className="relative h-40 bg-gray-100">
                {vehicle.image ? (
                  <img
                    src={vehicle.image}
                    alt={`${vehicle.make} ${vehicle.modelName}`}
                    // fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                <span
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    vehicle.vehicleType === "car"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {vehicle.vehicleType}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">
                  {vehicle.make} {vehicle.modelName}
                </h3>
                {vehicle.variant && (
                  <p className="text-sm text-gray-500">{vehicle.variant}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Battery className="h-4 w-4 text-green-600" />
                    {vehicle.batteryCapacity_kWh} kWh
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-green-600" />
                    {vehicle.compatibleConnectors.join(", ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

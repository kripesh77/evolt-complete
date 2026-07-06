"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Station } from "@/types";
import {
  Plus,
  Search,
  MapPin,
  Zap,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useOccupancySocket, OccupancyChangedPayload } from "@/lib/socket";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    stationId: string;
    stationName: string;
  }>({
    show: false,
    stationId: "",
    stationName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time occupancy updates
  const handleOccupancyChanged = useCallback(
    (payload: OccupancyChangedPayload) => {
      setStations((prev) =>
        prev.map((s) => {
          if (s._id !== payload.stationId) return s;
          return {
            ...s,
            ports: s.ports.map((p) =>
              p.connectorType === payload.connectorType
                ? { ...p, occupied: payload.occupied, total: payload.total }
                : p,
            ),
          };
        }),
      );
    },
    [],
  );

  useOccupancySocket(handleOccupancyChanged);

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    filterStations();
  }, [stations, searchQuery, statusFilter]);

  const loadStations = async () => {
    try {
      const data = await api.getMyStations();
      setStations(data);
    } catch (error) {
      console.error("Failed to load stations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStations = () => {
    let filtered = [...stations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    setFilteredStations(filtered);
  };

  const handleDelete = async () => {
    if (!deleteModal.stationId) return;
    setIsDeleting(true);

    try {
      await api.deleteStation(deleteModal.stationId);
      setStations((prev) =>
        prev.filter((s) => s._id !== deleteModal.stationId),
      );
      setDeleteModal({ show: false, stationId: "", stationName: "" });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Stations</h1>
          <p className="text-gray-600">Manage your EV charging stations</p>
        </div>
        <Link
          href="/dashboard/stations/new"
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          Add Station
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Stations List */}
      {filteredStations.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <MapPin className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {stations.length === 0 ? "No stations yet" : "No stations found"}
          </h3>
          <p className="mt-2 text-gray-500">
            {stations.length === 0
              ? "Add your first charging station to get started."
              : "Try adjusting your search or filter."}
          </p>
          {stations.length === 0 && (
            <Link
              href="/dashboard/stations/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add Station
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Station
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Availability
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStations.map((station) => {
                const totalPorts = station.ports.reduce(
                  (s, p) => s + p.total,
                  0,
                );
                const occupiedPorts = station.ports.reduce(
                  (s, p) => s + p.occupied,
                  0,
                );
                const availablePorts = totalPorts - occupiedPorts;
                const availabilityPercent =
                  totalPorts > 0 ? (availablePorts / totalPorts) * 100 : 0;

                return (
                  <tr key={station._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {station.name}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {station.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          station.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {station.status === "active" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {station.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {totalPorts} ports
                      </span>
                      <div className="text-xs text-gray-500">
                        {station.ports.length} types
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-gray-200">
                          <div
                            className={`h-2 rounded-full ${
                              availabilityPercent > 50
                                ? "bg-green-500"
                                : availabilityPercent > 0
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${availabilityPercent}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {availablePorts}/{totalPorts}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/stations/${station._id}`}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/stations/${station._id}/edit`}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() =>
                            setDeleteModal({
                              show: true,
                              stationId: station._id,
                              stationName: station.name,
                            })
                          }
                          className="rounded p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Station
            </h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete &quot;{deleteModal.stationName}
              &quot;? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteModal({
                    show: false,
                    stationId: "",
                    stationName: "",
                  })
                }
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

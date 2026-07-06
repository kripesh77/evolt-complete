"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Station } from "@/types";
import { MapPin, Zap, Battery, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useOccupancySocket, OccupancyChangedPayload } from "@/lib/socket";

interface DashboardStats {
  totalStations: number;
  activeStations: number;
  inactiveStations: number;
  totalPorts: number;
  occupiedPorts: number;
  availablePorts: number;
  occupancyRate: number;
}

function calculateStats(stationsData: Station[]): DashboardStats {
  const totalStations = stationsData.length;
  const activeStations = stationsData.filter(
    (s) => s.status === "active",
  ).length;
  const inactiveStations = totalStations - activeStations;

  let totalPorts = 0;
  let occupiedPorts = 0;

  stationsData.forEach((station) => {
    station.ports.forEach((port) => {
      totalPorts += port.total;
      occupiedPorts += port.occupied;
    });
  });

  const availablePorts = totalPorts - occupiedPorts;
  const occupancyRate = totalPorts > 0 ? (occupiedPorts / totalPorts) * 100 : 0;

  return {
    totalStations,
    activeStations,
    inactiveStations,
    totalPorts,
    occupiedPorts,
    availablePorts,
    occupancyRate,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time occupancy updates
  const handleOccupancyChanged = useCallback(
    (payload: OccupancyChangedPayload) => {
      setStations((prev) => {
        const updated = prev.map((s) => {
          if (s._id !== payload.stationId) return s;
          return {
            ...s,
            ports: s.ports.map((p) =>
              p.connectorType === payload.connectorType
                ? { ...p, occupied: payload.occupied, total: payload.total }
                : p,
            ),
          };
        });
        setStats(calculateStats(updated));
        return updated;
      });
    },
    [],
  );

  useOccupancySocket(handleOccupancyChanged);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stationsData = await api.getMyStations();
      setStations(stationsData);
      setStats(calculateStats(stationsData));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your charging stations today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Stations"
          value={stats?.totalStations || 0}
          icon={MapPin}
          color="blue"
        />
        <StatCard
          title="Active Stations"
          value={stats?.activeStations || 0}
          icon={CheckCircle}
          color="green"
          subtitle={`${stats?.inactiveStations || 0} inactive`}
        />
        <StatCard
          title="Total Ports"
          value={stats?.totalPorts || 0}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Available Ports"
          value={stats?.availablePorts || 0}
          icon={Battery}
          color="emerald"
          subtitle={`${stats?.occupiedPorts || 0} occupied`}
        />
      </div>

      {/* Occupancy Rate */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Current Occupancy Rate
            </h3>
            <p className="text-sm text-gray-500">Across all your stations</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900">
              {stats?.occupancyRate.toFixed(1) || 0}%
            </span>
          </div>
        </div>
        <div className="mt-4 h-4 w-full rounded-full bg-gray-200">
          <div
            className="h-4 rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${stats?.occupancyRate || 0}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>{stats?.occupiedPorts || 0} occupied</span>
          <span>{stats?.availablePorts || 0} available</span>
        </div>
      </div>

      {/* Recent Stations */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Stations</h3>
          <Link
            href="/dashboard/stations"
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            View all →
          </Link>
        </div>

        {stations.length === 0 ? (
          <div className="py-8 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">No stations yet</p>
            <Link
              href="/dashboard/stations/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Zap className="h-4 w-4" />
              Add Your First Station
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stations.slice(0, 5).map((station) => {
              const totalPorts = station.ports.reduce((s, p) => s + p.total, 0);
              const occupiedPorts = station.ports.reduce(
                (s, p) => s + p.occupied,
                0,
              );
              const availablePorts = totalPorts - occupiedPorts;

              return (
                <Link
                  key={station._id}
                  href={`/dashboard/stations/${station._id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        station.status === "active"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {station.name}
                      </h4>
                      <p className="text-sm text-gray-500">{station.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        availablePorts > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {availablePorts > 0 ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          {availablePorts} available
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          All occupied
                        </>
                      )}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">
                      {totalPorts} total ports
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "green" | "purple" | "emerald";
  subtitle?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

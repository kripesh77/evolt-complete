"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import StatCard from "@/components/StatCard";
import {
  Users,
  MapPin,
  Car,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStations: 0,
    activeStations: 0,
    totalVehicles: 0,
    pendingRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, stations, vehicles, requests] = await Promise.all([
        api.getUsers(),
        api.getAllStations(),
        api.searchVehicles({ limit: 50 }),
        api.getVehicleRequests(),
      ]);

      setStats({
        totalUsers: users.length,
        totalStations: stations.length,
        activeStations: stations.filter((s) => s.status === "active").length,
        totalVehicles: vehicles.length,
        pendingRequests: requests.filter((r) => r.status === "pending").length,
      });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setIsLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-600">
          Platform overview and pending actions at a glance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Stations"
          value={stats.totalStations}
          icon={MapPin}
          color="green"
          subtitle={`${stats.activeStations} active`}
        />
        <StatCard
          title="Vehicle Catalog"
          value={stats.totalVehicles}
          icon={Car}
          color="purple"
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={ClipboardList}
          color="orange"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="mt-4 space-y-3">
            <QuickAction
              href="/dashboard/users"
              label="Manage Users"
              description="View and activate/deactivate accounts"
            />
            <QuickAction
              href="/dashboard/stations"
              label="Manage Stations"
              description="View, edit, or remove charging stations"
            />
            <QuickAction
              href="/dashboard/vehicles/requests"
              label="Review Vehicle Requests"
              description={`${stats.pendingRequests} pending approval`}
            />
            <QuickAction
              href="/dashboard/vehicles/new"
              label="Add Vehicle to Catalog"
              description="Create a vehicle entry directly"
            />
          </div>
        </div>

        {stats.pendingRequests > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-orange-900">
              Action Required
            </h3>
            <p className="mt-2 text-sm text-orange-700">
              You have {stats.pendingRequests} vehicle request
              {stats.pendingRequests !== 1 ? "s" : ""} waiting for review.
            </p>
            <Link
              href="/dashboard/vehicles/requests"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Review Requests
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
    >
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-400" />
    </Link>
  );
}

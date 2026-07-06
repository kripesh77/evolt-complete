"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  MapPin,
  Users,
  Car,
  ClipboardList,
  LogOut,
  ChevronLeft,
  Shield,
  Plus,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/dashboard/users", icon: Users },
  {
    name: "Stations",
    href: "/dashboard/stations",
    icon: MapPin,
    excludedPaths: ["/dashboard/stations/new"],
  },
  { name: "Add Station", href: "/dashboard/stations/new", icon: Plus },
  {
    name: "Vehicles",
    href: "/dashboard/vehicles",
    icon: Car,
    excludedPaths: ["/dashboard/vehicles/requests"],
  },
  {
    name: "Vehicle Requests",
    href: "/dashboard/vehicles/requests",
    icon: ClipboardList,
  },
];

const isRouteActive = (
  pathname: string,
  href: string,
  excludedPaths: string[] = [],
) => {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;

  const isExcluded = excludedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isExcluded) return false;

  return pathname.startsWith(`${href}/`);
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-gray-900 text-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-green-500" />
            <span className="text-lg font-bold">EV Admin</span>
          </div>
        )}
        {collapsed && <Shield className="mx-auto h-8 w-8 text-green-500" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`rounded p-1 hover:bg-gray-800 ${collapsed ? "mx-auto mt-2" : ""}`}
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {!collapsed && user && (
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = isRouteActive(
            pathname,
            item.href,
            "excludedPaths" in item ? item.excludedPaths : [],
          );
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-2">
        <button
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-red-600 hover:text-white ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

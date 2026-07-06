"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";

interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationChange: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
}

declare global {
  interface Window {
    L: typeof import("leaflet");
  }
}

export default function LocationPicker({
  initialLocation,
  onLocationChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || { lat: 28.6139, lng: 77.209 }, // Default to Delhi
  );
  const [address, setAddress] = useState("");

  useEffect(() => {
    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return;

      // Add Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Add Leaflet JS
      if (!window.L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // Wait for Leaflet to be available
      await new Promise((resolve) => setTimeout(resolve, 100));

      initMap();
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    const L = window.L;

    // Initialize map
    const map = L.map(mapRef.current).setView(
      [selectedLocation.lat, selectedLocation.lng],
      13,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add marker
    const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
      draggable: true,
    }).addTo(map);

    marker.on("dragend", function () {
      const position = marker.getLatLng();
      updateLocation(position.lat, position.lng);
    });

    map.on("click", function (e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      updateLocation(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Get initial address
    if (initialLocation) {
      reverseGeocode(initialLocation.lat, initialLocation.lng);
    }
  };

  const updateLocation = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    onLocationChange({ lat, lng, address: addr });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const data = await response.json();
      const addr = data.display_name || "";
      setAddress(addr);
      return addr;
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return "";
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery,
        )}&limit=1`,
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setSelectedLocation({ lat: latitude, lng: longitude });
        setAddress(display_name);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          markerRef.current.setLatLng([latitude, longitude]);
        }

        onLocationChange({
          lat: latitude,
          lng: longitude,
          address: display_name,
        });
      } else {
        alert("Location not found");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for a location..."
            className="text-gray-800 w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          Search
        </button>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="h-80 w-full rounded-lg border border-gray-300"
        style={{ zIndex: 0 }}
      />

      {/* Selected Location Info */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Selected Location
            </p>
            <p className="text-sm text-gray-600">
              {address || "Click on the map to select a location"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Lat: {selectedLocation.lat.toFixed(6)}, Lng:{" "}
              {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

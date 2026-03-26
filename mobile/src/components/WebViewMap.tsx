import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { GeoLocation, Station } from "../types";

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  title?: string;
  type?: "station" | "user" | "custom";
}

interface WebViewMapProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  markers?: Marker[];
  userLocation?: GeoLocation | null;
  customLocation?: GeoLocation | null;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (location: GeoLocation) => void;
  style?: any;
  interactive?: boolean;
}

export interface WebViewMapRef {
  animateToRegion: (location: GeoLocation) => void;
  fitToMarkers: () => void;
}

const WebViewMap = forwardRef<WebViewMapRef, WebViewMapProps>(
  (
    {
      initialRegion,
      markers = [],
      userLocation,
      customLocation,
      onMarkerPress,
      onMapPress,
      style,
      interactive = true,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const defaultCenter = initialRegion || {
      latitude: 28.6139,
      longitude: 77.209,
    };

    useImperativeHandle(ref, () => ({
      animateToRegion: (location: GeoLocation) => {
        webViewRef.current?.injectJavaScript(`
        map.flyTo([${location.latitude}, ${location.longitude}], 15);
        true;
      `);
      },
      fitToMarkers: () => {
        webViewRef.current?.injectJavaScript(`
        if (markerGroup.getLayers().length > 0) {
          map.fitBounds(markerGroup.getBounds(), { padding: [50, 50] });
        }
        true;
      `);
      },
    }));

    useEffect(() => {
      if (!isLoading && markers.length > 0) {
        updateMarkers();
      }
    }, [markers, isLoading]);

    useEffect(() => {
      if (!isLoading && userLocation) {
        webViewRef.current?.injectJavaScript(`
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
          radius: 8,
          fillColor: '#4285F4',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);
        true;
      `);
      }
    }, [userLocation, isLoading]);

    useEffect(() => {
      if (!isLoading && customLocation) {
        webViewRef.current?.injectJavaScript(`
        if (customMarker) map.removeLayer(customMarker);
        customMarker = L.marker([${customLocation.latitude}, ${customLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#3B82F6;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map).bindPopup('Custom Location');
        true;
      `);
      }
    }, [customLocation, isLoading]);

    const updateMarkers = () => {
      const markersJson = JSON.stringify(markers);
      webViewRef.current?.injectJavaScript(`
      markerGroup.clearLayers();
      const markers = ${markersJson};
      markers.forEach(m => {
        const color = m.color || '#4CAF50';
        const marker = L.marker([m.latitude, m.longitude], {
          icon: L.divIcon({
            className: 'station-marker',
            html: '<div style="background:' + color + ';width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z"/></svg></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        });
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
        });
        if (m.title) marker.bindPopup(m.title);
        markerGroup.addLayer(marker);
      });
      true;
    `);
    };

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "markerPress" && onMarkerPress) {
          onMarkerPress(data.id);
        } else if (data.type === "mapPress" && onMapPress) {
          onMapPress({ latitude: data.lat, longitude: data.lng });
        } else if (data.type === "ready") {
          setIsLoading(false);
        }
      } catch (e) {
        console.log("WebView message parse error:", e);
      }
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none !important; }
    .station-marker, .custom-marker { background: transparent !important; border: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      dragging: ${interactive},
      touchZoom: ${interactive},
      doubleClickZoom: ${interactive},
      scrollWheelZoom: ${interactive},
      boxZoom: ${interactive},
      keyboard: ${interactive}
    }).setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);
    
    var markerGroup = L.layerGroup().addTo(map);
    var userMarker = null;
    var customMarker = null;
    
    ${
      interactive
        ? `
    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    });
    `
        : ""
    }
    
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }, 500);
  </script>
</body>
</html>
  `;

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{
            html: htmlContent,
            baseUrl: "https://0s2djcq5-3000.inc1.devtunnels.ms/api/v1",
          }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default WebViewMap;

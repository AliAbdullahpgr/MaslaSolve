/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef } from "react";

export interface IssueMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  status: string;
  priority: string;
  selected?: boolean;
  onClick?: () => void;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: IssueMarker[];
  onMapClick?: (lat: number, lng: number) => void;
  pinLat?: number;
  pinLng?: number;
  pinColor?: string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
}

export default function LeafletMap({
  center = [31.5204, 74.3587],
  zoom = 13,
  markers = [],
  onMapClick,
  pinLat,
  pinLng,
  pinColor = "#D83A1F",
  className,
  style,
  interactive = true,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pinMarkerRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const mod = await import("leaflet");
      const L = mod.default;
      (window as any).L = L;

      try {
        await import("leaflet.markercluster");
      } catch (error) {
        console.warn("Leaflet marker clustering failed to load. Rendering markers without clustering.", error);
      }

      if (cancelled || !containerRef.current || mapRef.current) return;

      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      if (onMapClick) {
        map.on("click", (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;

      // Create cluster group for issue markers
      const markerLayer =
        typeof L.markerClusterGroup === "function"
          ? L.markerClusterGroup({
              maxClusterRadius: 40,
              iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                const size = count < 10 ? 32 : count < 50 ? 38 : 44;
                return L.divIcon({
                  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#0b1a24;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size < 38 ? 12 : 14}px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
                  className: "",
                  iconSize: [size, size],
                  iconAnchor: [size / 2, size / 2],
                });
              },
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: false,
              zoomToBoundsOnClick: true,
            })
          : L.layerGroup();
      markerLayer.addTo(map);
      mapRef.current._clusterGroup = markerLayer;

      // Add initial pin marker if provided
      if (pinLat != null && pinLng != null) {
        const icon = makePinIcon(L, pinColor);
        pinMarkerRef.current = L.marker([pinLat, pinLng], { icon, draggable: !!onMapClick }).addTo(map);
        if (onMapClick) {
          pinMarkerRef.current.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            onMapClick(pos.lat, pos.lng);
          });
        }
      }

      // Add issue markers to cluster group
      markers.forEach((m) => addIssueMarker(L, markerLayer, m, markerRefs));
    };

    initMap().catch((error) => {
      console.error("Failed to initialize Leaflet map", error);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        pinMarkerRef.current = null;
        markerRefs.current.clear();
      }
    };
  }, []);

  // Update pin marker when lat/lng changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void import("leaflet").then((mod) => {
      const L = mod.default;
      if (pinLat == null || pinLng == null) return;
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLatLng([pinLat, pinLng]);
      } else {
        const icon = makePinIcon(L, pinColor);
        pinMarkerRef.current = L.marker([pinLat, pinLng], { icon, draggable: !!onMapClick }).addTo(map);
        if (onMapClick) {
          pinMarkerRef.current.on("dragend", (e: any) => {
            const pos = e.target.getLatLng();
            onMapClick(pos.lat, pos.lng);
          });
        }
      }
      map.panTo([pinLat, pinLng]);
    });
  }, [pinLat, pinLng]);

  // Sync issue markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void import("leaflet").then((mod) => {
      const L = mod.default;
      const clusterGroup = map._clusterGroup;
      if (!clusterGroup) return;

      const existingIds = new Set(markerRefs.current.keys());
      const newIds = new Set(markers.map((m) => m.id));

      // Remove markers no longer in list
      existingIds.forEach((id) => {
        if (!newIds.has(id)) {
          const m = markerRefs.current.get(id);
          if (m) clusterGroup.removeLayer(m);
          markerRefs.current.delete(id);
        }
      });

      // Add or update
      markers.forEach((m) => {
        if (markerRefs.current.has(m.id)) {
          const existing = markerRefs.current.get(m.id);
          existing.setLatLng([m.lat, m.lng]);
          existing.setIcon(makeIssueIcon(L, m.color, m.selected ?? false));
        } else {
          addIssueMarker(L, clusterGroup, m, markerRefs);
        }
      });
    });
  }, [markers]);

  return (
    <>
      <style>{`
        .leaflet-container { font-family: inherit; }
        .ms-issue-icon { display: flex; align-items: center; justify-content: center; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.8); }
        .ms-issue-icon-inner { transform: rotate(45deg); font-size: 11px; font-weight: 700; color: #fff; }
        .ms-pin-icon { width: 20px; height: 20px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
        .ms-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .ms-popup .leaflet-popup-content { margin: 0; }
        .ms-popup .leaflet-popup-tip-container { display: none; }
      `}</style>
      <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", ...style }} />
    </>
  );
}

function makePinIcon(L: any, color: string) {
  return L.divIcon({
    className: "",
    html: `<div class="ms-pin-icon" style="background:${color};"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

function makeIssueIcon(L: any, color: string, selected: boolean) {
  const size = selected ? 32 : 26;
  return L.divIcon({
    className: "",
    html: `<div class="ms-issue-icon" style="width:${size}px;height:${size}px;background:${color};${selected ? "box-shadow:0 0 0 3px rgba(255,255,255,0.9),0 0 0 5px " + color + ";" : ""}">
      <div class="ms-issue-icon-inner">●</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function addIssueMarker(L: any, map: any, m: IssueMarker, refs: React.MutableRefObject<Map<string, any>>) {
  const icon = makeIssueIcon(L, m.color, m.selected ?? false);
  const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);

  const popupHtml = `
    <div style="padding:10px 12px;min-width:160px;font-family:system-ui,sans-serif;">
      <div style="font-size:10px;font-family:monospace;color:#888;letter-spacing:0.08em;margin-bottom:4px;">${m.status.replace("_", " ")} · ${m.priority}</div>
      <div style="font-size:13px;font-weight:600;color:#0b1a24;line-height:1.3;">${m.title}</div>
    </div>`;
  marker.bindPopup(popupHtml, { className: "ms-popup", offset: [0, -4] });

  if (m.onClick) {
    marker.on("click", () => {
      m.onClick!();
      marker.openPopup();
    });
  } else {
    marker.on("click", () => marker.openPopup());
  }

  refs.current.set(m.id, marker);
}

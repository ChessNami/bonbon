// src/components/user/ZoneViewer.js
import React, { useState, useEffect, useMemo } from "react";
import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    LayersControl,
    Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import Swal from "sweetalert2";
import { supabase } from "../../../../supabaseClient";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
});

const ZoneViewer = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [zones, setZones] = useState([]);
    const [approvedCounts, setApprovedCounts] = useState({});
    const [satelliteView, setSatelliteView] = useState(true); // Satellite ON by default
    const [loading, setLoading] = useState(true);
    const [currentUserLocation, setCurrentUserLocation] = useState(null);
    const [currentUserZone, setCurrentUserZone] = useState(null);

    const zoneColors = {
        blue: { fill: "rgba(59, 130, 246, 0.5)", border: "#3b82f6" },
        green: { fill: "rgba(34, 197, 94, 0.5)", border: "#22c55e" },
        red: { fill: "rgba(239, 68, 68, 0.5)", border: "#ef4444" },
        yellow: { fill: "rgba(250, 204, 21, 0.5)", border: "#ca8a04" },
        purple: { fill: "rgba(168, 85, 247, 0.5)", border: "#a855f7" },
        orange: { fill: "rgba(251, 146, 60, 0.5)", border: "#ea580c" },
        teal: { fill: "rgba(20, 184, 166, 0.5)", border: "#0d9488" },
        pink: { fill: "rgba(236, 72, 153, 0.5)", border: "#ec4899" },
    };

    const getZoneColors = (color) => {
        if (color && color.startsWith("#")) {
            return { border: color, fill: `${color}80` };
        }
        return zoneColors[color] || zoneColors.blue;
    };

    const getCentroid = (coords) => {
        if (!coords || coords.length < 3) return centerCoords;
        try {
            const polygon = turf.polygon([[...coords.map(c => [c[1], c[0]]), [coords[0][1], coords[0][0]]]]);
            const centroid = turf.centroid(polygon);
            return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
        } catch {
            return centerCoords;
        }
    };

    // Big pulsing "YOU" marker
    const youAreHereIcon = L.divIcon({
        className: "you-are-here-marker",
        html: `
            <div class="pulse-container">
                <div class="pulse-ring"></div>
                <div class="pulse-ring delay"></div>
                <div class="you-marker">YOU</div>
            </div>
            <style>
                .pulse-container {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .you-marker {
                    background: #dc2626;
                    color: white;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 20px;
                    border: 5px solid white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                    z-index: 10;
                }
                .pulse-ring {
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    border: 6px solid #dc2626;
                    border-radius: 50%;
                    opacity: 0.8;
                    animation: pulse 2s infinite;
                }
                .pulse-ring.delay {
                    animation-delay: 1s;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    70% { transform: scale(1.6); opacity: 0; }
                    100% { transform: scale(1.6); opacity: 0; }
                }
            </style>
        `,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const { data: { user } } = await supabase.auth.getUser();

                // Fetch zones
                const { data: zonesData, error: zonesError } = await supabase
                    .from("barangay_zones")
                    .select("*")
                    .order("name");

                if (zonesError) throw zonesError;
                setZones(zonesData || []);

                // Fetch approved residents (status = 1)
                const { data: residentsData, error: resError } = await supabase
                    .from("residents")
                    .select(`
                        household,
                        spouse,
                        household_composition,
                        location_lat,
                        location_lng,
                        resident_profile_status!inner(status)
                    `)
                    .eq("resident_profile_status.status", 1);

                if (resError) throw resError;

                const counts = {};
                zonesData.forEach(zone => counts[zone.id] = 0);

                residentsData?.forEach(resident => {
                    const household = resident.household;
                    const zoneName = household?.zone?.trim();
                    if (!zoneName) return;

                    const matchedZone = zonesData.find(z => {
                        const dbName = z.name.toLowerCase();
                        const input = zoneName.toLowerCase();
                        return dbName === input ||
                            dbName.includes(input) ||
                            input.includes(dbName.replace("zone ", ""));
                    });

                    if (matchedZone) {
                        counts[matchedZone.id]++;
                        if (resident.spouse && Object.keys(resident.spouse).length > 0) counts[matchedZone.id]++;
                        if (resident.household_composition) {
                            let comp = resident.household_composition;
                            if (typeof comp === "string") comp = JSON.parse(comp) || [];
                            comp?.forEach(member => {
                                if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                                    counts[matchedZone.id]++;
                                }
                            });
                        }
                    }
                });

                setApprovedCounts(counts);

                // Fetch current user's location (works for pending or approved)
                if (user) {
                    const { data: residentRecord } = await supabase
                        .from("residents")
                        .select(`
                            id,
                            location_lat,
                            location_lng,
                            household
                        `)
                        .eq("user_id", user.id)
                        .single();

                    if (residentRecord && residentRecord.location_lat && residentRecord.location_lng) {
                        const lat = residentRecord.location_lat;
                        const lng = residentRecord.location_lng;

                        let zoneName = null;
                        try {
                            const household = typeof residentRecord.household === "string"
                                ? JSON.parse(residentRecord.household)
                                : residentRecord.household;
                            zoneName = household?.zone?.trim();
                        } catch { }

                        const matchedZone = zonesData.find(z => {
                            const dbName = z.name.toLowerCase();
                            const input = (zoneName || "").toLowerCase();
                            return dbName === input ||
                                dbName.includes(input) ||
                                input.includes(dbName.replace("zone ", ""));
                        });

                        setCurrentUserLocation({ lat, lng });
                        if (matchedZone) setCurrentUserZone(matchedZone);
                    }
                }

            } catch (err) {
                console.error("Error loading zones:", err);
                toast.fire({ icon: "error", title: "Failed to load zone data" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="p-6 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 text-center">
                    <p className="text-lg text-gray-600">View approved resident distribution across zones</p>
                    {currentUserLocation && (
                        <p className="text-sm text-indigo-600 mt-3 font-semibold">
                            🔴 Your location is marked with a large pulsing red marker
                        </p>
                    )}
                </div>

                <div className="flex justify-center mb-6">
                    <label className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={satelliteView}
                                onChange={(e) => setSatelliteView(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-14 h-8 rounded-full shadow-inner transition-colors ${satelliteView ? "bg-indigo-600" : "bg-gray-300"}`}>
                                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-all ${satelliteView ? "translate-x-6 bg-white" : "bg-white"}`}></div>
                            </div>
                        </div>
                        <span className="font-semibold text-lg text-gray-700 select-none">Satellite View</span>
                    </label>
                </div>

                <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                    <div className="h-[70vh] md:h-[80vh]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full bg-gray-100">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
                                    <p className="mt-6 text-xl text-gray-700">Loading zones...</p>
                                </div>
                            </div>
                        ) : zones.length === 0 ? (
                            <div className="flex items-center justify-center h-full bg-gray-50">
                                <p className="text-2xl text-gray-500">No zones have been defined yet.</p>
                            </div>
                        ) : (
                            <MapContainer
                                center={currentUserLocation || centerCoords}
                                zoom={currentUserLocation ? 18 : 16}
                                maxZoom={18}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={true}
                            >
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked={!satelliteView} name="Street">
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer checked={satelliteView} name="Satellite">
                                        <TileLayer
                                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                            attribution="Esri, Maxar, Earthstar Geographics"
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>

                                {zones.map((zone) => {
                                    const colors = getZoneColors(zone.color);
                                    const centroid = getCentroid(zone.coords?.slice(0, -1) || []);
                                    const approved = approvedCounts[zone.id] || 0;
                                    const isUserZone = currentUserZone?.id === zone.id;

                                    return (
                                        <React.Fragment key={zone.id}>
                                            <Polygon
                                                positions={zone.coords || []}
                                                pathOptions={{
                                                    fillColor: colors.fill,
                                                    color: colors.border,
                                                    weight: isUserZone ? 7 : 4,
                                                    opacity: 1,
                                                    fillOpacity: isUserZone ? 0.7 : 0.5,
                                                }}
                                            >
                                                <Popup>
                                                    <div className="p-4 max-w-xs text-center">
                                                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                                                            {zone.name}
                                                        </h3>
                                                        <div className="bg-green-50 px-6 py-3 rounded-lg mb-3">
                                                            <p className="text-sm uppercase tracking-wide text-gray-600">Approved Residents</p>
                                                            <p className="text-3xl font-extrabold text-green-700 mt-1">
                                                                {approved}
                                                            </p>
                                                        </div>
                                                        {isUserZone && (
                                                            <div className="bg-red-100 border-2 border-red-600 rounded-lg px-6 py-3">
                                                                <p className="text-xl font-extrabold text-red-700">
                                                                    ✨ You are here ✨
                                                                </p>
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-3">
                                                            Head, spouse & live-in members
                                                        </p>
                                                    </div>
                                                </Popup>
                                            </Polygon>

                                            {/* Smaller, cleaner zone label */}
                                            <Marker
                                                position={centroid}
                                                interactive={false}
                                                icon={L.divIcon({
                                                    className: "zone-label-div",
                                                    html: `<div style="background: rgba(255,255,255,0.95); padding: 6px 12px; border-radius: 10px; font-weight: bold; font-size: 14px; color: #1e40af; border: 2px solid ${colors.border}; box-shadow: 0 3px 10px rgba(0,0,0,0.2); text-align: center;">
                                                        ${zone.name}<br/>
                                                        <span style="font-size: 13px; color: #16a34a; font-weight: bold;">
                                                            ${approved} approved
                                                        </span>
                                                        ${isUserZone ? '<br/><span style="font-size: 12px; color: #dc2626;">(You are here)</span>' : ''}
                                                    </div>`,
                                                    iconSize: [140, 60],
                                                    iconAnchor: [70, 30],
                                                })}
                                            />
                                        </React.Fragment>
                                    );
                                })}

                                {/* Pulsing "YOU" Marker */}
                                {currentUserLocation && (
                                    <Marker
                                        position={[currentUserLocation.lat, currentUserLocation.lng]}
                                        icon={youAreHereIcon}
                                    >
                                        <Popup>
                                            <div className="text-center p-4">
                                                <p className="font-bold text-xl text-red-700">You are here</p>
                                                <p className="text-sm text-gray-600 mt-1">Your registered location</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}
                            </MapContainer>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600">
                        Click on any zone to view details. Population counts include approved residents only.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ZoneViewer;
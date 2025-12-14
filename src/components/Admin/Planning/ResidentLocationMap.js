// src/components/admin/ResidentLocationMap.js
import React, { useState, useEffect, useMemo } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    LayersControl,
    Polygon,               // ← Added for zone polygons
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const ResidentLocationMap = () => {
    const centerCoords = useMemo(() => [8.509057, 124.649134], []);
    const [residents, setResidents] = useState([]);
    const [zones, setZones] = useState([]);              // ← New: barangay zones
    const [loading, setLoading] = useState(true);
    const [satelliteView, setSatelliteView] = useState(true);
    const [showZones, setShowZones] = useState(false);   // ← New: toggle for zones

    // Function to get status badge
    const getStatusBadge = (status) => {
        const badges = {
            1: { text: "Approved", class: "bg-green-100 text-green-800" },
            2: { text: "Rejected", class: "bg-red-100 text-red-800" },
            3: { text: "Pending", class: "bg-yellow-100 text-yellow-800" },
            4: { text: "Update Requested", class: "bg-blue-100 text-blue-800" },
            5: { text: "Update Approved", class: "bg-purple-100 text-purple-800" },
            6: { text: "To Update", class: "bg-orange-100 text-orange-800" },
        };
        const { text, class: badgeClass } = badges[status] || { text: "Unknown", class: "bg-gray-100 text-gray-800" };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>{text}</span>;
    };

    // Status colors for resident markers
    const statusColors = {
        1: { bg: "bg-emerald-500", border: "border-emerald-500" },
        2: { bg: "bg-red-500", border: "border-red-500" },
        3: { bg: "bg-yellow-500", border: "border-yellow-500" },
        4: { bg: "bg-blue-500", border: "border-blue-500" },
        5: { bg: "bg-purple-500", border: "border-purple-500" },
        6: { bg: "bg-orange-500", border: "border-orange-500" },
    };

    // Create custom marker with profile picture or initials
    const createResidentIcon = (profilePicUrl, displayName, status) => {
        const initials = displayName
            ? displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "👤";

        const statusColor = statusColors[status] || { bg: "bg-emerald-500", border: "border-white" };

        if (profilePicUrl) {
            return L.divIcon({
                html: `
          <div class="relative">
            <img 
              src="${profilePicUrl}" 
              alt="Resident Profile"
              class="w-12 h-12 rounded-full object-cover border-4 ${statusColor.border} shadow-xl"
              onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiM2MzhlZTYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZiIgZHk9Ii4zZW0iIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5Zb3U8L3RleHQ+PC9zdmc+';"
            />
            <div class="absolute -bottom-1 -right-1 ${statusColor.bg} border-2 border-white rounded-full w-5 h-5"></div>
          </div>
        `,
                className: "custom-profile-marker",
                iconSize: [48, 48],
                iconAnchor: [24, 48],
                popupAnchor: [0, -48],
            });
        }

        return L.divIcon({
            html: `
        <div class="relative">
          <div class="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl border-4 ${statusColor.border} font-bold text-lg">
            ${initials}
          </div>
          <div class="absolute -bottom-1 -right-1 ${statusColor.bg} border-2 border-white rounded-full w-5 h-5"></div>
        </div>
      `,
            className: "custom-profile-marker-fallback",
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -48],
        });
    };

    // ← NEW: Fetch barangay zones
    useEffect(() => {
        const fetchZones = async () => {
            try {
                const { data, error } = await supabase.from("barangay_zones").select("*");
                if (error) throw error;
                setZones(data || []);
            } catch (err) {
                console.error("Error fetching zones:", err);
            }
        };
        fetchZones();
    }, []);

    // Existing resident data fetch
    useEffect(() => {
        const fetchResidentsWithFullData = async () => {
            try {
                setLoading(true);

                const { data: residentsData, error: resError } = await supabase
                    .from("residents")
                    .select(`
            id,
            user_id,
            location_lat,
            location_lng,
            household,
            spouse,
            household_composition,
            census,
            image_url,
            valid_id_url,
            zone_cert_url,
            resident_profile_status ( status )
          `)
                    .not("location_lat", "is", null)
                    .not("location_lng", "is", null);

                if (resError) throw resError;
                if (!residentsData || residentsData.length === 0) {
                    setResidents([]);
                    return;
                }

                const enhancedResidents = await Promise.all(
                    residentsData.map(async (resident) => {
                        let household = typeof resident.household === "string"
                            ? JSON.parse(resident.household)
                            : resident.household || {};

                        let spouse = resident.spouse
                            ? (typeof resident.spouse === "string" ? JSON.parse(resident.spouse) : resident.spouse)
                            : null;

                        let householdComposition = resident.household_composition
                            ? (typeof resident.household_composition === "string"
                                ? JSON.parse(resident.household_composition)
                                : resident.household_composition)
                            : [];

                        let census = resident.census
                            ? (typeof resident.census === "string" ? JSON.parse(resident.census) : resident.census)
                            : {};

                        let signedProfilePic = null;
                        if (resident.image_url) {
                            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                .from("householdhead")
                                .createSignedUrl(resident.image_url, 3600);
                            if (!signedUrlError && signedUrlData) {
                                signedProfilePic = signedUrlData.signedUrl;
                            }
                        }

                        const fullName = `${household.firstName || "Unknown"} ${household.lastName || "Unknown"}`.trim();
                        const fullAddress = household.address || "No address provided";

                        return {
                            ...resident,
                            position: [parseFloat(resident.location_lat), parseFloat(resident.location_lng)],
                            fullName,
                            displayName: fullName,
                            profilePic: signedProfilePic,
                            fullAddress,
                            civilStatus: household.civilStatus || "N/A",
                            birthdate: household.dob || "N/A",
                            contact: household.phoneNumber || "None",
                            spouse,
                            household_composition: householdComposition,
                            census,
                            status: resident.resident_profile_status?.status ?? 3,
                        };
                    })
                );

                setResidents(enhancedResidents);
            } catch (err) {
                console.error("Error loading residents:", err);
                Swal.fire({
                    icon: "error",
                    title: "Failed to load map data",
                    text: err.message || "Please refresh the page.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchResidentsWithFullData();

        const channel = supabase
            .channel("residents-geotag")
            .on("postgres_changes", { event: "*", schema: "public", table: "residents" }, () => {
                fetchResidentsWithFullData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const createCustomClusterIcon = (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 50 : 60;

        return L.divIcon({
            html: `<div class="cluster-icon bg-blue-700 text-white rounded-full flex items-center justify-center font-bold shadow-2xl border-4 border-white">
        ${count}
      </div>`,
            className: "custom-cluster",
            iconSize: L.point(size, size),
        });
    };

    // ← NEW: Zone color helper (consistent with ZoneMapper)
    const getZoneColors = (color) => {
        if (color.startsWith("#")) {
            return { fill: `${color}80`, border: color };
        }
        const predefined = {
            blue: { fill: "rgba(59, 130, 246, 0.5)", border: "#3b82f6" },
            green: { fill: "rgba(34, 197, 94, 0.5)", border: "#22c55e" },
            red: { fill: "rgba(239, 68, 68, 0.5)", border: "#ef4444" },
            yellow: { fill: "rgba(250, 204, 21, 0.5)", border: "#ca8a04" },
            purple: { fill: "rgba(168, 85, 247, 0.5)", border: "#a855f7" },
            orange: { fill: "rgba(251, 146, 60, 0.5)", border: "#ea580c" },
            teal: { fill: "rgba(20, 184, 166, 0.5)", border: "#0d9488" },
            pink: { fill: "rgba(236, 72, 153, 0.5)", border: "#ec4899" },
        };
        return predefined[color] || predefined.blue;
    };

    // ← NEW: Simple centroid for zone name label
    const getCentroid = (coords) => {
        if (!coords || coords.length < 3) return centerCoords;
        let latSum = 0,
            lngSum = 0;
        coords.forEach(([lat, lng]) => {
            latSum += lat;
            lngSum += lng;
        });
        return [latSum / coords.length, lngSum / coords.length];
    };

    return (
        <div className="p-6 max-w-full mx-auto bg-gray-50 min-h-screen">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Total Residents Mapped</h2>
                        <p className="text-sm opacity-90">
                            {loading ? "Loading..." : `${residents.length} residents with verified locations`}
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={satelliteView}
                                onChange={(e) => setSatelliteView(e.target.checked)}
                                className="w-6 h-6"
                            />
                            <span className="font-semibold text-lg">Satellite View</span>
                        </label>

                        {/* ← NEW TOGGLE SWITCH */}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showZones}
                                onChange={(e) => setShowZones(e.target.checked)}
                                className="w-6 h-6"
                            />
                            <span className="font-semibold text-lg">Show Zones</span>
                        </label>
                    </div>
                </div>

                <div className="h-screen" style={{ minHeight: "600px" }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full bg-gray-100">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
                                <p className="mt-6 text-xl text-gray-700">Loading resident locations...</p>
                            </div>
                        </div>
                    ) : residents.length === 0 ? (
                        <div className="flex items-center justify-center h-full bg-gray-50">
                            <p className="text-2xl text-gray-500">No residents have pinned their location yet.</p>
                        </div>
                    ) : (
                        <MapContainer
                            center={centerCoords}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                            scrollWheelZoom={true}
                        >
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked={!satelliteView} name="Street Map">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© OpenStreetMap contributors'
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer checked={satelliteView} name="Satellite">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution='Esri, Maxar, Earthstar Geographics'
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            {/* Resident markers */}
                            <MarkerClusterGroup
                                chunkedLoading
                                iconCreateFunction={createCustomClusterIcon}
                                maxClusterRadius={50}
                                spiderfyOnMaxZoom={true}
                                showCoverageOnHover={true}
                            >
                                {residents.map((resident) => (
                                    <Marker
                                        key={resident.id}
                                        position={resident.position}
                                        icon={createResidentIcon(resident.profilePic, resident.displayName, resident.status)}
                                    >
                                        <Popup maxWidth={500} minWidth={350} className="custom-resident-popup">
                                            {/* Popup content remains exactly the same */}
                                            <div className="p-4 font-sans text-sm">
                                                <div className="flex items-center gap-4 mb-4">
                                                    {resident.profilePic ? (
                                                        <img
                                                            src={resident.profilePic}
                                                            alt="Profile"
                                                            className="w-20 h-20 rounded-full object-cover border-4 border-blue-300 shadow-lg flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0">
                                                            {resident.displayName[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-800">{resident.displayName}</h3>
                                                        <p className="text-sm text-gray-600">Household Head</p>
                                                        <div className="mt-1">{getStatusBadge(resident.status)}</div>
                                                    </div>
                                                </div>

                                                <hr className="my-4 border-gray-300" />

                                                <div className="mb-4">
                                                    <p className="font-semibold text-gray-700 mb-1">Residence</p>
                                                    <p className="bg-gray-100 p-3 rounded-lg text-sm leading-relaxed">
                                                        {resident.fullAddress}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Born:</span>
                                                        <span className="ml-2">
                                                            {resident.birthdate ? new Date(resident.birthdate).toLocaleDateString() : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Contact:</span>
                                                        <span className="ml-2">{resident.contact || "None"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Civil Status:</span>
                                                        <span className="ml-2">{resident.civilStatus || "N/A"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700">Voter:</span>
                                                        <span className="ml-2">{resident.census?.isRegisteredVoter ? "Yes" : "No"}</span>
                                                    </div>
                                                </div>

                                                {resident.spouse && (
                                                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                        <p className="font-semibold text-purple-800">Spouse</p>
                                                        <p className="text-sm mt-1">
                                                            {resident.spouse.firstName} {resident.spouse.lastName}
                                                        </p>
                                                    </div>
                                                )}

                                                {resident.household_composition?.length > 0 && (
                                                    <div className="mb-4">
                                                        <p className="font-semibold text-sm mb-2">
                                                            Household Members ({resident.household_composition.length})
                                                        </p>
                                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                                            {resident.household_composition.map((m, i) => (
                                                                <div key={i} className="bg-gray-100 px-3 py-2 rounded text-sm">
                                                                    {m.firstName} {m.lastName} <span className="text-gray-600">({m.relation})</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                                                    Resident ID: {resident.id}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MarkerClusterGroup>

                            {/* ← NEW: Render zones when toggle is on */}
                            {showZones &&
                                zones.map((zone) => {
                                    const colors = getZoneColors(zone.color);
                                    const centroid = getCentroid(zone.coords.slice(0, -1)); // remove closing point

                                    return (
                                        <React.Fragment key={zone.id}>
                                            <Polygon
                                                positions={zone.coords}
                                                pathOptions={{
                                                    fillColor: colors.fill,
                                                    color: colors.border,
                                                    weight: 3,
                                                    fillOpacity: 0.4,
                                                }}
                                            />
                                            <Marker
                                                position={centroid}
                                                interactive={false}
                                                icon={L.divIcon({
                                                    className: "zone-label",
                                                    html: `<div style="background:transparent; color:white; font-weight:bold; font-size:16px; text-shadow: 2px 2px 4px black; pointer-events:none;">
                            ${zone.name}
                          </div>`,
                                                    iconSize: [200, 40],
                                                    iconAnchor: [100, 20],
                                                })}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                        </MapContainer>
                    )}
                </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
                <p>Only residents who have completed location pinpointing are shown on the map.</p>
            </div>
        </div>
    );
};

export default ResidentLocationMap;
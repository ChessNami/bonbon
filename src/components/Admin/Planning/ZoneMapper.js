import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    Polygon,
    CircleMarker,
    LayersControl,
    Popup,
    Marker,
    useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import {
    FaMapMarkedAlt,
    FaSave,
    FaBan,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

// Stable toast instance (created once, outside component)
const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
});

const ZoneMapper = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);

    const [zones, setZones] = useState([]);
    const [newZoneCoords, setNewZoneCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedZoneNumber, setSelectedZoneNumber] = useState("");
    const [editingZoneId, setEditingZoneId] = useState(null);
    const [newZoneColor, setNewZoneColor] = useState("blue");
    const [useCustomColor, setUseCustomColor] = useState(false);
    const [customColor, setCustomColor] = useState("#3b82f6");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [residentCounts, setResidentCounts] = useState({});
    const [mapLoaded, setMapLoaded] = useState(false);

    // Refs
    const draggingVertexIndexRef = useRef(draggingVertexIndex);
    const dragStartCoordRef = useRef(dragStartCoord);
    const newZoneCoordsRef = useRef(newZoneCoords);

    useEffect(() => {
        draggingVertexIndexRef.current = draggingVertexIndex;
        dragStartCoordRef.current = dragStartCoord;
        newZoneCoordsRef.current = newZoneCoords;
    }, [draggingVertexIndex, dragStartCoord, newZoneCoords]);

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

    const currentColor = useCustomColor
        ? { border: customColor, fill: `${customColor}80` }
        : zoneColors[newZoneColor];

    // Check admin
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return setIsAdmin(false);

                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role_id")
                    .eq("user_id", user.id)
                    .single();

                if (error || !data) return setIsAdmin(false);

                const { data: roleData } = await supabase
                    .from("roles")
                    .select("name")
                    .eq("id", data.role_id)
                    .in("name", ["admin", "dev"])
                    .single();

                setIsAdmin(!!roleData);
            } catch (err) {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    // Fetch zones and residents ONLY ONCE
    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: zonesData, error: zonesError } = await supabase
                    .from("barangay_zones")
                    .select("*")
                    .order("name");

                if (zonesError) throw zonesError;
                setZones(zonesData || []);

                const { data: residentsData, error: resError } = await supabase
                    .from("residents")
                    .select(`
                        household,
                        spouse,
                        household_composition,
                        resident_profile_status!inner(status)
                    `)
                    .in("resident_profile_status.status", [1, 3]);

                if (resError) throw resError;

                const counts = {};
                zonesData.forEach(zone => {
                    counts[zone.id] = { approved: 0, pending: 0 };
                });

                residentsData?.forEach(resident => {
                    const status = resident.resident_profile_status.status;
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

                    if (!matchedZone) return;

                    const zoneId = matchedZone.id;

                    const increment = () => {
                        if (status === 1) counts[zoneId].approved++;
                        else if (status === 3) counts[zoneId].pending++;
                    };

                    increment();
                    if (resident.spouse && Object.keys(resident.spouse).length > 0) increment();

                    if (resident.household_composition) {
                        let comp = resident.household_composition;
                        if (typeof comp === "string") {
                            try { comp = JSON.parse(comp); } catch { }
                        }
                        comp?.forEach(member => {
                            if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                                increment();
                            }
                        });
                    }
                });

                setResidentCounts(counts);
            } catch (err) {
                console.error("Error loading data:", err);
                toast.fire({ icon: "error", title: "Failed to load zones" });
            }
        };

        fetchData();
    }, []); // ← Empty array: runs only once

    const isPolygonValid = (coords) => {
        if (coords.length < 3) return false;
        try {
            const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
            const issues = kinks(polygon);
            return issues.features.length === 0;
        } catch {
            return false;
        }
    };

    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndexRef.current === null && selectedZoneNumber) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewZoneCoords(prev => {
                        const updated = [...prev, newCoord];
                        setActionHistory(h => [...h, { type: "add", coord: newCoord, index: updated.length - 1 }]);
                        setRedoHistory([]);
                        return updated;
                    });
                }
            },
        });

        // Middle mouse pan + disable context menu
        useEffect(() => {
            const container = map.getContainer();
            let isMiddleDown = false;
            let lastPos = null;

            const down = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isMiddleDown = true;
                    lastPos = { x: e.clientX, y: e.clientY };
                    container.style.cursor = "grabbing";
                }
            };
            const move = (e) => {
                if (isMiddleDown && lastPos) {
                    const dx = lastPos.x - e.clientX;
                    const dy = lastPos.y - e.clientY;
                    map.panBy([dx, dy]);
                    lastPos = { x: e.clientX, y: e.clientY };
                }
            };
            const up = () => {
                isMiddleDown = false;
                lastPos = null;
                container.style.cursor = "grab";
            };

            container.addEventListener("mousedown", down);
            container.addEventListener("mousemove", move);
            container.addEventListener("mouseup", up);
            container.addEventListener("mouseleave", up);
            container.addEventListener("contextmenu", (e) => e.preventDefault());

            return () => {
                container.removeEventListener("mousedown", down);
                container.removeEventListener("mousemove", move);
                container.removeEventListener("mouseup", up);
                container.removeEventListener("mouseleave", up);
                container.removeEventListener("contextmenu", (e) => e.preventDefault());
            };
        }, [map]);

        // Vertex dragging
        useEffect(() => {
            const container = map.getContainer();
            const move = (e) => {
                if (draggingVertexIndexRef.current !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    const index = draggingVertexIndexRef.current;
                    setNewZoneCoords(prev => {
                        const updated = [...prev];
                        updated[index] = [latlng.lat, latlng.lng];
                        return updated;
                    });
                }
            };
            const up = () => {
                if (draggingVertexIndexRef.current !== null) {
                    const index = draggingVertexIndexRef.current;
                    setActionHistory(h => [...h, {
                        type: "drag",
                        index,
                        startCoord: dragStartCoordRef.current,
                        endCoord: newZoneCoordsRef.current[index]
                    }]);
                    setRedoHistory([]);
                    setDraggingVertexIndex(null);
                    setDragStartCoord(null);
                }
            };

            container.addEventListener("mousemove", move);
            container.addEventListener("mouseup", up);
            container.addEventListener("mouseleave", up);

            return () => {
                container.removeEventListener("mousemove", move);
                container.removeEventListener("mouseup", up);
                container.removeEventListener("mouseleave", up);
            };
        }, [map]);

        return null;
    };

    const handleKeyDown = useCallback((e) => {
        if (!isAdding || !selectedZoneNumber) return;

        if (e.ctrlKey && e.key === "z" && actionHistory.length > 0) {
            e.preventDefault();
            const last = actionHistory[actionHistory.length - 1];
            setActionHistory(h => h.slice(0, -1));
            setRedoHistory(h => [...h, last]);
            if (last.type === "add") {
                setNewZoneCoords(c => c.filter((_, i) => i !== last.index));
            } else if (last.type === "drag") {
                setNewZoneCoords(c => {
                    const updated = [...c];
                    updated[last.index] = last.startCoord;
                    return updated;
                });
            }
        } else if (e.ctrlKey && e.key === "y" && redoHistory.length > 0) {
            e.preventDefault();
            const last = redoHistory[redoHistory.length - 1];
            setRedoHistory(h => h.slice(0, -1));
            setActionHistory(h => [...h, last]);
            if (last.type === "add") {
                setNewZoneCoords(c => {
                    const updated = [...c];
                    updated.splice(last.index, 0, last.coord);
                    return updated;
                });
            } else if (last.type === "drag") {
                setNewZoneCoords(c => {
                    const updated = [...c];
                    updated[last.index] = last.endCoord;
                    return updated;
                });
            }
        } else if (e.ctrlKey && e.key === "x" && newZoneCoords.length > 0) {
            e.preventDefault();
            setNewZoneCoords(c => c.slice(0, -1));
            setActionHistory(h => [...h, { type: "remove_last" }]);
            setRedoHistory([]);
        }
    }, [isAdding, selectedZoneNumber, actionHistory, redoHistory, newZoneCoords]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const resetForm = () => {
        setNewZoneCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setSelectedZoneNumber("");
        setEditingZoneId(null);
        setIsAdding(false);
        setNewZoneColor("blue");
        setUseCustomColor(false);
        setCustomColor("#3b82f6");
    };

    const handleSelectZone = (zoneNum) => {
        if (!zoneNum) {
            resetForm();
            return;
        }

        setSelectedZoneNumber(zoneNum);
        const zoneName = `Zone ${zoneNum}`;
        const existingZone = zones.find(z => z.name === zoneName);

        if (existingZone) {
            setEditingZoneId(existingZone.id);
            setNewZoneCoords(existingZone.coords?.slice(0, -1) || []);
            const color = existingZone.color || "blue";
            if (color.startsWith("#")) {
                setUseCustomColor(true);
                setCustomColor(color);
            } else {
                setUseCustomColor(false);
                setNewZoneColor(color);
            }
        } else {
            setEditingZoneId(null);
            setNewZoneCoords([]);
            setUseCustomColor(false);
            setNewZoneColor("blue");
        }
        setIsAdding(true);
    };

    const handleSaveZone = async () => {
        if (!isAdmin) return toast.fire({ icon: "error", title: "Admins only" });
        if (!selectedZoneNumber) return toast.fire({ icon: "warning", title: "Select a zone first" });
        if (newZoneCoords.length < 3) return toast.fire({ icon: "error", title: "Need at least 3 points" });
        if (!isPolygonValid(newZoneCoords)) return toast.fire({ icon: "error", title: "Polygon cannot self-intersect" });

        setIsSaving(true);
        const zoneName = `Zone ${selectedZoneNumber}`;
        const finalColor = useCustomColor ? customColor : zoneColors[newZoneColor].border;

        const zoneData = {
            name: zoneName,
            coords: [...newZoneCoords, newZoneCoords[0]],
            color: finalColor,
        };

        try {
            let result;
            if (editingZoneId) {
                ({ data: result } = await supabase
                    .from("barangay_zones")
                    .update(zoneData)
                    .eq("id", editingZoneId)
                    .select()
                    .single());
            } else {
                ({ data: result } = await supabase
                    .from("barangay_zones")
                    .insert(zoneData)
                    .select()
                    .single());
            }

            if (result) {
                setZones(prev => {
                    if (editingZoneId) {
                        return prev.map(z => z.id === result.id ? result : z);
                    }
                    return [...prev, result];
                });
                toast.fire({ icon: "success", title: `Zone ${selectedZoneNumber} saved!` });
                resetForm();
            }
        } catch (err) {
            console.error(err);
            toast.fire({ icon: "error", title: "Save failed" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteZone = async (id, name) => {
        if (!isAdmin) return;
        const result = await Swal.fire({
            title: "Delete Zone?",
            text: `Delete ${name}? This cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from("barangay_zones").delete().eq("id", id);
                if (error) throw error;
                setZones(prev => prev.filter(z => z.id !== id));
                toast.fire({ icon: "success", title: "Zone deleted" });
            } catch {
                toast.fire({ icon: "error", title: "Delete failed" });
            }
        }
    };

    const getCentroid = (coords) => {
        if (!coords || coords.length < 3) return bonbonCoords;
        try {
            const polygon = turf.polygon([[...coords.map(c => [c[1], c[0]]), [coords[0][1], coords[0][0]]]]);
            const centroid = turf.centroid(polygon);
            return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
        } catch {
            return bonbonCoords;
        }
    };

    return (
        <div className="p-4 min-h-screen bg-gray-50">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="flex flex-wrap gap-4 mb-6 justify-between items-center">
                    <motion.button
                        onClick={() => isAdmin && mapLoaded && !isAdding && setIsAdding(true)}
                        disabled={!isAdmin || !mapLoaded || isAdding}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-white font-semibold shadow-lg transition-all ${!isAdmin || !mapLoaded || isAdding
                                ? "bg-gray-400 cursor-not-allowed opacity-70"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            }`}
                        whileHover={{ scale: (!isAdmin || !mapLoaded || isAdding) ? 1 : 1.05 }}
                        whileTap={{ scale: (!isAdmin || !mapLoaded || isAdding) ? 1 : 0.95 }}
                        title={
                            !isAdmin ? "Admin access required" :
                                !mapLoaded ? "Loading map..." :
                                    isAdding ? "Editing in progress" :
                                        "Click to edit zone boundaries"
                        }
                    >
                        <FaMapMarkedAlt size={20} />
                        {isAdding ? "Editing in Progress..." :
                            !mapLoaded ? "Loading Map..." :
                                !isAdmin ? "Edit Zone Boundaries" :
                                    "Edit Zone Boundaries"}
                    </motion.button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <motion.div
                        className={`relative ${isAdding ? "xl:col-span-3" : "xl:col-span-4"} transition-all`}
                        layout
                    >
                        <div className="h-[70vh] md:h-[80vh] rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                            <MapContainer
                                center={bonbonCoords}
                                zoom={16}
                                maxZoom={20}
                                style={{ height: "100%", width: "100%" }}
                                whenReady={() => setMapLoaded(true)}
                            >
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="Street">
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Satellite">
                                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                                    </LayersControl.BaseLayer>
                                </LayersControl>

                                {zones.map((zone) => {
                                    const colors = getZoneColors(zone.color);
                                    const centroid = getCentroid(zone.coords?.slice(0, -1));
                                    const counts = residentCounts[zone.id] || { approved: 0, pending: 0 };

                                    return (
                                        <React.Fragment key={zone.id}>
                                            <Polygon
                                                positions={zone.coords || []}
                                                pathOptions={{
                                                    fillColor: colors.fill,
                                                    color: colors.border,
                                                    weight: 4,
                                                    opacity: 1,
                                                    fillOpacity: 0.5,
                                                }}
                                            >
                                                <Popup>
                                                    <div className="w-64 p-4 bg-white rounded-lg shadow-xl">
                                                        <h3 className="text-lg font-bold text-gray-800 text-center mb-3">
                                                            {zone.name}
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                                            <div className="bg-green-50 px-3 py-2 rounded-md text-center">
                                                                <p className="text-gray-600 text-xs">Approved</p>
                                                                <p className="font-bold text-green-700 text-lg">{counts.approved}</p>
                                                            </div>
                                                            <div className="bg-orange-50 px-3 py-2 rounded-md text-center">
                                                                <p className="text-gray-600 text-xs">Pending</p>
                                                                <p className="font-bold text-orange-700 text-lg">{counts.pending}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-center py-2 bg-blue-50 rounded-md mb-4">
                                                            <p className="text-sm text-gray-600">Total Residents</p>
                                                            <p className="text-2xl font-bold text-blue-600">
                                                                {counts.approved + counts.pending}
                                                            </p>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => handleSelectZone(zone.name.split(" ")[1])}
                                                                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors"
                                                                >
                                                                    Edit Boundary
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                                                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md text-sm transition-colors"
                                                                >
                                                                    Delete Zone
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Polygon>

                                            <Marker
                                                position={centroid}
                                                interactive={false}
                                                icon={L.divIcon({
                                                    className: "zone-label-div",
                                                    html: `<div style="background: rgba(255,255,255,0.8); padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 16px; color: #1e40af; border: 2px solid ${colors.border}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                                                        ${zone.name}
                                                    </div>`,
                                                    iconSize: [120, 40],
                                                    iconAnchor: [60, 20],
                                                })}
                                            />
                                        </React.Fragment>
                                    );
                                })}

                                {isAdding && selectedZoneNumber && newZoneCoords.length > 0 && (
                                    <>
                                        <Polygon
                                            positions={[...newZoneCoords, newZoneCoords[0]]}
                                            pathOptions={{
                                                fillColor: currentColor.fill,
                                                color: currentColor.border,
                                                weight: 4,
                                                dashArray: "12, 8",
                                                opacity: 0.9,
                                            }}
                                        />
                                        {newZoneCoords.map((coord, i) => (
                                            <CircleMarker
                                                key={i}
                                                center={coord}
                                                radius={10}
                                                pathOptions={{
                                                    color: "#fff",
                                                    weight: 3,
                                                    fillColor: currentColor.border,
                                                    fillOpacity: 1,
                                                }}
                                                eventHandlers={{
                                                    mousedown: (e) => {
                                                        if (e.originalEvent.button === 2) {
                                                            e.originalEvent.preventDefault();
                                                            setDraggingVertexIndex(i);
                                                            setDragStartCoord(coord);
                                                        }
                                                    },
                                                }}
                                            />
                                        ))}
                                    </>
                                )}

                                <MapClickHandler />
                            </MapContainer>
                        </div>

                        <div className="mt-6 bg-white p-6 rounded-xl shadow-lg">
                            <h3 className="font-bold text-lg mb-4">Editing Controls</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>• <strong>Left Click</strong>: Add vertex</div>
                                <div>• <strong>Right Click + Drag</strong> on vertex: Move point</div>
                                <div>• <strong>Ctrl + Z</strong>: Undo • <strong>Ctrl + Y</strong>: Redo</div>
                                <div>• <strong>Ctrl + X</strong>: Remove last point</div>
                                <div>• <strong>Middle Mouse Drag</strong>: Pan map freely</div>
                            </div>
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {isAdding && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 50 }}
                                className="xl:col-span-1"
                            >
                                <div className="bg-white p-8 rounded-xl shadow-2xl h-fit sticky top-6">
                                    <h2 className="text-2xl font-bold mb-8 text-center">Edit Zone</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold mb-3">Select Zone to Edit/Create</label>
                                            <select
                                                value={selectedZoneNumber}
                                                onChange={(e) => handleSelectZone(e.target.value)}
                                                className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                                            >
                                                <option value="">-- Choose Zone (1-9) --</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                                    <option key={num} value={num}>
                                                        Zone {num} {zones.find(z => z.name === `Zone ${num}`) ? "(Exists)" : "(New)"}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedZoneNumber && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold mb-3">Zone Color</label>

                                                    {/* Predefined Color Boxes */}
                                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                                        {Object.entries(zoneColors).map(([key, colors]) => (
                                                            <label
                                                                key={key}
                                                                className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all ${!useCustomColor && newZoneColor === key
                                                                        ? "border-gray-800 shadow-lg scale-105"
                                                                        : "border-transparent"
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="predefinedColor"
                                                                    value={key}
                                                                    checked={!useCustomColor && newZoneColor === key}
                                                                    onChange={(e) => {
                                                                        setUseCustomColor(false);
                                                                        setNewZoneColor(e.target.value);
                                                                    }}
                                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                                />
                                                                <div
                                                                    className="h-16 w-full rounded-lg shadow-md"
                                                                    style={{ backgroundColor: colors.fill }}
                                                                    title={key.charAt(0).toUpperCase() + key.slice(1)}
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>

                                                    {/* Custom Color Toggle + Picker */}
                                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                        <input
                                                            type="checkbox"
                                                            id="useCustom"
                                                            checked={useCustomColor}
                                                            onChange={(e) => setUseCustomColor(e.target.checked)}
                                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                        />
                                                        <label htmlFor="useCustom" className="text-sm font-medium cursor-pointer flex-1">
                                                            Use Custom Color
                                                        </label>
                                                        <input
                                                            type="color"
                                                            value={customColor}
                                                            onChange={(e) => setCustomColor(e.target.value)}
                                                            disabled={!useCustomColor}
                                                            className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer disabled:opacity-50"
                                                        />
                                                    </div>

                                                    {/* Live Preview */}
                                                    <div className="mt-5 text-center">
                                                        <p className="text-xs text-gray-600 mb-2">Current Zone Preview</p>
                                                        <div
                                                            className="h-20 rounded-xl shadow-inner border-4 border-gray-300"
                                                            style={{
                                                                backgroundColor: useCustomColor
                                                                    ? `${customColor}80`
                                                                    : zoneColors[newZoneColor]?.fill || zoneColors.blue.fill,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-6">
                                                    <motion.button
                                                        onClick={handleSaveZone}
                                                        disabled={isSaving || newZoneCoords.length < 3}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg disabled:opacity-60"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaSave />
                                                        {isSaving ? "Saving..." : "Save Zone"}
                                                    </motion.button>

                                                    <motion.button
                                                        onClick={resetForm}
                                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaBan />
                                                        Cancel
                                                    </motion.button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ZoneMapper;
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Polygon,
    CircleMarker,
    LayersControl,
    useMapEvents,
    Popup,
    Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import {
    FaMapMarkedAlt,
    FaSave,
    FaBan,
    FaTag,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const ZoneMapper = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [zones, setZones] = useState([]);
    const [newZoneCoords, setNewZoneCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingZoneId, setEditingZoneId] = useState(null);
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneColor, setNewZoneColor] = useState("blue");
    const [customColor, setCustomColor] = useState("#3b82f6");
    const [useCustomColor, setUseCustomColor] = useState(false);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Refs for event handlers
    const draggingVertexIndexRef = useRef(draggingVertexIndex);
    const dragStartCoordRef = useRef(dragStartCoord);
    const newZoneCoordsRef = useRef(newZoneCoords);

    useEffect(() => {
        draggingVertexIndexRef.current = draggingVertexIndex;
    }, [draggingVertexIndex]);

    useEffect(() => {
        dragStartCoordRef.current = dragStartCoord;
    }, [dragStartCoord]);

    useEffect(() => {
        newZoneCoordsRef.current = newZoneCoords;
    }, [newZoneCoords]);

    // Predefined zone colors
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

    // Get colors for a zone
    const getZoneColors = (color) => {
        if (color.startsWith("#")) {
            return { border: color, fill: `${color}80` };
        }
        return zoneColors[color] || zoneColors.blue;
    };

    // Current color for new/editing zone
    const currentColor = useCustomColor
        ? { border: customColor, fill: `${customColor}80` }
        : zoneColors[newZoneColor];

    // Toast configuration
    const toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
    });

    // Check admin status
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setIsAdmin(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role_id")
                    .eq("user_id", user.id)
                    .single();

                if (error || !data) {
                    setIsAdmin(false);
                    return;
                }

                const { data: roleData } = await supabase
                    .from("roles")
                    .select("name")
                    .eq("id", data.role_id)
                    .in("name", ["admin", "dev"])
                    .single();

                setIsAdmin(!!roleData);
            } catch (err) {
                console.error("Error checking admin status:", err);
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, []);

    // Fetch existing zones
    useEffect(() => {
        const fetchZones = async () => {
            try {
                const { data, error } = await supabase.from("barangay_zones").select("*");
                if (error) throw error;
                setZones(data || []);
            } catch (err) {
                console.error("Error fetching zones:", err);
                toast.fire({
                    icon: "error",
                    title: "Failed to load zones",
                });
            }
        };
        fetchZones();
    }, [toast]);

    // Validate polygon
    const isPolygonValid = (coords) => {
        if (coords.length < 3) return true;
        try {
            const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
            const issues = kinks(polygon);
            return issues.features.length === 0;
        } catch (e) {
            return false;
        }
    };

    // Map click handler for adding points and custom interactions
    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndexRef.current === null) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewZoneCoords((prev) => {
                        const updated = [...prev, newCoord];
                        setActionHistory((h) => [...h, { type: "add", coord: newCoord, index: updated.length - 1 }]);
                        setRedoHistory([]);
                        return updated;
                    });
                }
            },
        });

        // Middle mouse drag panning + disable context menu
        useEffect(() => {
            const container = map.getContainer();
            let isMiddleDown = false;
            let lastPos = null;

            const down = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isMiddleDown = true;
                    lastPos = { x: e.clientX, y: e.clientY };
                    container.classList.add("cursor-grabbing");
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
                container.classList.remove("cursor-grabbing");
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
                    setNewZoneCoords((prev) => {
                        const updated = [...prev];
                        updated[index] = [latlng.lat, latlng.lng];
                        return updated;
                    });
                }
            };

            const up = () => {
                if (draggingVertexIndexRef.current !== null) {
                    const index = draggingVertexIndexRef.current;
                    const endCoord = newZoneCoordsRef.current[index];
                    setActionHistory((h) => [
                        ...h,
                        { type: "drag", index, startCoord: dragStartCoordRef.current, endCoord },
                    ]);
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

    // Keyboard shortcuts
    const handleKeyDown = useCallback(
        (e) => {
            if (!isAdding) return;

            if (e.ctrlKey && e.key === "z" && actionHistory.length > 0) {
                e.preventDefault();
                const last = actionHistory[actionHistory.length - 1];
                setActionHistory((h) => h.slice(0, -1));
                setRedoHistory((h) => [...h, last]);
                if (last.type === "add") {
                    setNewZoneCoords((c) => c.filter((_, i) => i !== last.index));
                } else if (last.type === "drag") {
                    setNewZoneCoords((c) => {
                        const updated = [...c];
                        updated[last.index] = last.startCoord;
                        return updated;
                    });
                }
            } else if (e.ctrlKey && e.key === "y" && redoHistory.length > 0) {
                e.preventDefault();
                const last = redoHistory[redoHistory.length - 1];
                setRedoHistory((h) => h.slice(0, -1));
                setActionHistory((h) => [...h, last]);
                if (last.type === "add") {
                    setNewZoneCoords((c) => {
                        const updated = [...c];
                        updated.splice(last.index, 0, last.coord);
                        return updated;
                    });
                } else if (last.type === "drag") {
                    setNewZoneCoords((c) => {
                        const updated = [...c];
                        updated[last.index] = last.endCoord;
                        return updated;
                    });
                }
            } else if (e.ctrlKey && e.key === "x" && newZoneCoords.length > 0 && !editingZoneId) {
                e.preventDefault();
                const lastCoord = newZoneCoords[newZoneCoords.length - 1];
                setActionHistory((h) => [...h, { type: "add", coord: lastCoord, index: newZoneCoords.length - 1 }]);
                setRedoHistory([]);
                setNewZoneCoords((c) => c.slice(0, -1));
            }
        },
        [actionHistory, redoHistory, isAdding, newZoneCoords, editingZoneId]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const resetForm = () => {
        setNewZoneCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewZoneName("");
        setNewZoneColor("blue");
        setCustomColor("#3b82f6");
        setUseCustomColor(false);
        setIsAdding(false);
        setEditingZoneId(null);
        setDraggingVertexIndex(null);
    };

    const handleSaveZone = async () => {
        if (!isAdmin) {
            toast.fire({ icon: "error", title: "Only admins can create/edit zones" });
            return;
        }

        if (isSaving) return;

        if (newZoneCoords.length < 3) {
            toast.fire({ icon: "error", title: "Zone must have at least 3 points" });
            return;
        }
        if (!newZoneName.trim()) {
            toast.fire({ icon: "error", title: "Please enter a zone name" });
            return;
        }
        if (!isPolygonValid(newZoneCoords)) {
            toast.fire({ icon: "error", title: "Zone cannot have self-intersections" });
            return;
        }

        setIsSaving(true);

        const finalColor = useCustomColor ? customColor : zoneColors[newZoneColor].border;

        const zoneData = {
            name: newZoneName.trim(),
            color: finalColor,
            coords: [...newZoneCoords, newZoneCoords[0]],
        };

        try {
            let data, error;
            if (editingZoneId) {
                ({ data, error } = await supabase
                    .from("barangay_zones")
                    .update(zoneData)
                    .eq("id", editingZoneId)
                    .select()
                    .single());
            } else {
                ({ data, error } = await supabase
                    .from("barangay_zones")
                    .insert([zoneData])
                    .select()
                    .single());
            }

            if (error) throw error;

            setZones((prev) =>
                editingZoneId
                    ? prev.map((z) => (z.id === editingZoneId ? data : z))
                    : [...prev, data]
            );

            toast.fire({
                icon: "success",
                title: `Zone "${newZoneName}" ${editingZoneId ? "updated" : "created"} successfully!`,
            });
            resetForm();
        } catch (err) {
            console.error("Save error:", err);
            toast.fire({ icon: "error", title: "Failed to save zone" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditZone = (zone) => {
        if (!isAdmin) return;
        setEditingZoneId(zone.id);
        setNewZoneCoords(zone.coords.slice(0, -1));
        setNewZoneName(zone.name);
        if (zone.color.startsWith("#")) {
            setUseCustomColor(true);
            setCustomColor(zone.color);
        } else {
            setUseCustomColor(false);
            const key = Object.keys(zoneColors).find((k) => zoneColors[k].border === zone.color) || "blue";
            setNewZoneColor(key);
        }
        setActionHistory([]);
        setRedoHistory([]);
        setIsAdding(true);
    };

    const handleDeleteZone = async (id) => {
        if (!isAdmin) return;

        const result = await Swal.fire({
            title: "Delete Zone?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it",
            cancelButtonText: "Cancel",
            position: "center",
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from("barangay_zones").delete().eq("id", id);
                if (error) throw error;

                setZones((prev) => prev.filter((z) => z.id !== id));
                toast.fire({ icon: "success", title: "Zone deleted" });
            } catch (err) {
                toast.fire({ icon: "error", title: "Failed to delete zone" });
            }
        }
    };

    const getCentroid = (coords) => {
        if (coords.length < 3) return bonbonCoords;
        const polygon = turf.polygon([[...coords.map(([lat, lng]) => [lng, lat]), [coords[0][1], coords[0][0]]]]);
        const centroid = turf.centroid(polygon);
        return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
    };

    return (
        <div className="p-4 mx-auto max-w-7xl">

            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => isAdmin && !isAdding && setIsAdding(true)}
                    disabled={!isAdmin || isAdding}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${
                        isAdding || !isAdmin ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    whileHover={{ scale: isAdding || !isAdmin ? 1 : 1.05 }}
                    whileTap={{ scale: isAdding || !isAdmin ? 1 : 0.95 }}
                >
                    <FaMapMarkedAlt />
                    {isAdding ? "Drawing Zone..." : "Draw New Zone"}
                </motion.button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    className={`relative ${isAdding ? "lg:col-span-2" : "lg:col-span-3"} transition-all duration-300 ease-in-out`}
                    layout
                    transition={{ duration: 0.3 }}
                >
                    <div className="h-[500px] md:h-[600px] lg:h-[700px] rounded-lg shadow-lg overflow-hidden">
                        <MapContainer center={bonbonCoords} zoom={16} maxZoom={20} style={{ height: "100%", width: "100%" }}>
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Street">
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; OpenStreetMap contributors'
                                    />
                                </LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satellite">
                                    <TileLayer
                                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        attribution="Esri"
                                    />
                                </LayersControl.BaseLayer>
                            </LayersControl>

                            {zones.map((zone) => {
                                const colors = getZoneColors(zone.color);
                                const centroid = getCentroid(zone.coords.slice(0, -1));
                                return (
                                    <React.Fragment key={zone.id}>
                                        <Polygon
                                            positions={zone.coords}
                                            pathOptions={{
                                                fillColor: colors.fill,
                                                color: colors.border,
                                                weight: 3,
                                            }}
                                        >
                                            <Popup>
                                                <div className="text-center">
                                                    <h3 className="font-bold text-lg">{zone.name}</h3>
                                                    {isAdmin && (
                                                        <div className="mt-3 flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => handleEditZone(zone)}
                                                                className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteZone(zone.id)}
                                                                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
                                                            >
                                                                Delete
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
                                                className: "zone-label",
                                                html: `<div style="background:transparent; border:none; color:black; font-weight:bold; font-size:14px; text-shadow:1px 1px 2px white; text-align:center;">${zone.name}</div>`,
                                                iconSize: [100, 20],
                                                iconAnchor: [50, 10],
                                            })}
                                        />
                                    </React.Fragment>
                                );
                            })}

                            {isAdding && newZoneCoords.length > 0 && (
                                <>
                                    <Polygon
                                        positions={[...newZoneCoords, newZoneCoords[0]]}
                                        pathOptions={{
                                            fillColor: currentColor.fill,
                                            color: currentColor.border,
                                            weight: 3,
                                            dashArray: "10, 6",
                                        }}
                                    />
                                    {newZoneCoords.map((coord, i) => (
                                        <CircleMarker
                                            key={i}
                                            center={coord}
                                            radius={8}
                                            pathOptions={{
                                                color: "#fff",
                                                weight: 2,
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

                    <div className="mt-6 bg-white p-5 rounded-lg shadow">
                        <h3 className="font-semibold mb-3">Keyboard & Mouse Controls (when drawing)</h3>
                        <ul className="text-sm space-y-1 text-gray-700">
                            <li>• <strong>Left Click</strong>: Add point</li>
                            <li>• <strong>Right Click + Drag</strong> on vertex: Move point</li>
                            <li>• <strong>Ctrl + Z</strong>: Undo last action</li>
                            <li>• <strong>Ctrl + Y</strong>: Redo</li>
                            <li>• <strong>Ctrl + X</strong>: Remove last point</li>
                            <li>• <strong>Middle Mouse Drag</strong>: Pan map</li>
                        </ul>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="col-span-1"
                        >
                            <div className="bg-white p-6 rounded-lg shadow-lg">
                                <h2 className="text-xl font-bold mb-5">
                                    {editingZoneId ? "Edit Zone" : "Create New Zone"}
                                </h2>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            <FaTag /> Zone Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newZoneName}
                                            onChange={(e) => setNewZoneName(e.target.value)}
                                            placeholder="e.g., Zone 1, Purok 5"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Color</label>
                                        <select
                                            value={newZoneColor}
                                            onChange={(e) => setNewZoneColor(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        >
                                            <option value="blue">Blue</option>
                                            <option value="green">Green</option>
                                            <option value="red">Red</option>
                                            <option value="yellow">Yellow</option>
                                            <option value="purple">Purple</option>
                                            <option value="orange">Orange</option>
                                            <option value="teal">Teal</option>
                                            <option value="pink">Pink</option>
                                        </select>
                                        <div className="mt-3 h-12 rounded-lg" style={{ backgroundColor: zoneColors[newZoneColor]?.fill }} />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <motion.button
                                            onClick={handleSaveZone}
                                            disabled={isSaving}
                                            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition"
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FaSave />
                                            {isSaving ? "Saving..." : editingZoneId ? "Save Changes" : "Save Zone"}
                                        </motion.button>
                                        <motion.button
                                            onClick={resetForm}
                                            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium transition"
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FaBan /> Cancel
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ZoneMapper;
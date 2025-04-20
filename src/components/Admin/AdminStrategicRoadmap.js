import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Popup, Polyline, useMapEvents, CircleMarker, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../../index.css";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaAlignLeft, FaTag, FaMap } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const AdminStrategicRoadmap = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []); // Center retained for map initialization
    const [roads, setRoads] = useState([]); // Empty initial roads state
    const [newRoadCoords, setNewRoadCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingRoadId, setEditingRoadId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newType, setNewType] = useState("Widening");
    const [newColor, setNewColor] = useState("blue");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const maxDistance = 0.001; // ~100 meters in lat/lng degrees (approximate)

    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndex === null) {
                    const clickedCoord = [e.latlng.lat, e.latlng.lng];
                    const newCoord = clickedCoord; // Placeholder for road-snapping logic
                    if (newRoadCoords.length > 0) {
                        const lastCoord = newRoadCoords[newRoadCoords.length - 1];
                        const distance = L.latLng(lastCoord).distanceTo(L.latLng(newCoord)) / 1000; // in km
                        if (distance > maxDistance * 200) {
                            Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "error",
                                title: `Point too far! Max distance is ~${maxDistance * 200000} meters.`,
                                showConfirmButton: false,
                                timer: 1500,
                            });
                            return;
                        }
                    }
                    setNewRoadCoords((prev) => {
                        const updatedCoords = [...prev, newCoord];
                        setActionHistory((prevHistory) => [
                            ...prevHistory,
                            { type: "add", coord: newCoord, index: updatedCoords.length - 1 },
                        ]);
                        setRedoHistory([]);
                        return updatedCoords;
                    });
                }
            },
        });

        // Middle mouse dragging
        useEffect(() => {
            let isMiddleMouseDown = false;
            let lastMousePos = null;
            const mapContainer = map.getContainer();

            const handleMouseDown = (e) => {
                if (e.button === 1) {
                    e.preventDefault();
                    isMiddleMouseDown = true;
                    lastMousePos = { x: e.clientX, y: e.clientY };
                    mapContainer.classList.add("map-dragging");
                }
            };

            const handleMouseMove = (e) => {
                if (isMiddleMouseDown) {
                    const currentPos = { x: e.clientX, y: e.clientY };
                    const deltaX = lastMousePos.x - currentPos.x;
                    const deltaY = lastMousePos.y - currentPos.y;
                    map.panBy([deltaX, deltaY], { animate: false });
                    lastMousePos = currentPos;
                }
            };

            const handleMouseUp = () => {
                isMiddleMouseDown = false;
                lastMousePos = null;
                mapContainer.classList.remove("map-dragging");
            };

            mapContainer.addEventListener("mousedown", handleMouseDown);
            mapContainer.addEventListener("mousemove", handleMouseMove);
            mapContainer.addEventListener("mouseup", handleMouseUp);
            mapContainer.addEventListener("mouseleave", handleMouseUp);

            return () => {
                mapContainer.removeEventListener("mousedown", handleMouseDown);
                mapContainer.removeEventListener("mousemove", handleMouseMove);
                mapContainer.removeEventListener("mouseup", handleMouseUp);
                mapContainer.removeEventListener("mouseleave", handleMouseUp);
            };
        }, [map]);

        // Disable default right-click
        useEffect(() => {
            const mapContainer = map.getContainer();
            const handleContextMenu = (e) => e.preventDefault();
            mapContainer.addEventListener("contextmenu", handleContextMenu);
            return () => mapContainer.removeEventListener("contextmenu", handleContextMenu);
        }, [map]);

        // Vertex dragging
        useEffect(() => {
            const mapContainer = map.getContainer();

            const handleMouseMove = (e) => {
                if (draggingVertexIndex !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    const newCoord = [latlng.lat, latlng.lng];
                    setNewRoadCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[draggingVertexIndex] = newCoord;
                        return updatedCoords;
                    });
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    const endCoord = newRoadCoords[draggingVertexIndex];
                    if (dragStartCoord) {
                        setActionHistory((prevHistory) => [
                            ...prevHistory,
                            {
                                type: "drag",
                                index: draggingVertexIndex,
                                startCoord: dragStartCoord,
                                endCoord: endCoord,
                            },
                        ]);
                        setRedoHistory([]);
                    }
                    setDraggingVertexIndex(null);
                    setDragStartCoord(null);
                }
            };

            mapContainer.addEventListener("mousemove", handleMouseMove);
            mapContainer.addEventListener("mouseup", handleMouseUp);
            mapContainer.addEventListener("mouseleave", handleMouseUp);

            return () => {
                mapContainer.removeEventListener("mousemove", handleMouseMove);
                mapContainer.removeEventListener("mouseup", handleMouseUp);
                mapContainer.removeEventListener("mouseleave", handleMouseUp);
            };
        }, [map]);

        return null;
    };

    const handleKeyDown = useCallback(
        (e) => {
            if (!isAdding) return;

            if (e.ctrlKey && e.key === "z" && actionHistory.length > 0) {
                e.preventDefault();
                const lastAction = actionHistory[actionHistory.length - 1];
                setActionHistory((prev) => prev.slice(0, -1));
                setRedoHistory((prev) => [...prev, lastAction]);

                if (lastAction.type === "add") {
                    setNewRoadCoords((prev) => prev.filter((_, i) => i !== lastAction.index));
                } else if (lastAction.type === "drag") {
                    setNewRoadCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[lastAction.index] = lastAction.startCoord;
                        return updatedCoords;
                    });
                }
            } else if (e.ctrlKey && e.key === "y" && redoHistory.length > 0) {
                e.preventDefault();
                const lastRedo = redoHistory[redoHistory.length - 1];
                setRedoHistory((prev) => prev.slice(0, -1));
                setActionHistory((prev) => [...prev, lastRedo]);

                if (lastRedo.type === "add") {
                    setNewRoadCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords.splice(lastRedo.index, 0, lastRedo.coord);
                        return updatedCoords;
                    });
                } else if (lastRedo.type === "drag") {
                    setNewRoadCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[lastRedo.index] = lastRedo.endCoord;
                        return updatedCoords;
                    });
                }
            } else if (e.ctrlKey && e.key === "x" && newRoadCoords.length > 0 && !editingRoadId) {
                e.preventDefault();
                setNewRoadCoords((prev) => {
                    const lastCoord = prev[prev.length - 1];
                    setActionHistory((prevHistory) => [
                        ...prevHistory,
                        { type: "add", coord: lastCoord, index: prev.length - 1 },
                    ]);
                    setRedoHistory([]);
                    return prev.slice(0, -1);
                });
            }
        },
        [actionHistory, redoHistory, isAdding, newRoadCoords, editingRoadId]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const handleAddRoad = () => {
        if (newRoadCoords.length < 2) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A road must have at least 2 points!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newDescription || !newType) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide a title, description, and type!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        const newRoad = {
            id: roads.length + 1,
            title: newTitle,
            description: newDescription,
            type: newType,
            color: newColor,
            coords: [...newRoadCoords],
        };
        setRoads([...roads, newRoad]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Road added successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    const handleDeleteRoad = (id) => {
        setRoads(roads.filter((road) => road.id !== id));
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Road deleted successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const handleEditRoad = (id) => {
        setEditingRoadId(id);
        const roadToEdit = roads.find((r) => r.id === id);
        setNewRoadCoords(roadToEdit.coords);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(roadToEdit.title);
        setNewDescription(roadToEdit.description);
        setNewType(roadToEdit.type);
        setNewColor(roadToEdit.color);
        setIsAdding(true);
    };

    const handleSaveEdit = () => {
        if (newRoadCoords.length < 2) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A road must have at least 2 points!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newDescription || !newType) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide a title, description, and type!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        const updatedRoads = roads.map((road) =>
            road.id === editingRoadId
                ? {
                    ...road,
                    title: newTitle,
                    description: newDescription,
                    type: newType,
                    color: newColor,
                    coords: [...newRoadCoords],
                }
                : road
        );
        setRoads(updatedRoads);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Road updated successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    const resetForm = () => {
        setNewRoadCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle("");
        setNewDescription("");
        setNewType("Widening");
        setNewColor("blue");
        setIsAdding(false);
        setEditingRoadId(null);
        setDraggingVertexIndex(null);
        setDragStartCoord(null);
    };

    const getRoadStyle = (color) => {
        const styles = {
            gray: { color: "gray", weight: 4 },
            yellow: { color: "yellow", weight: 4 },
            blue: { color: "blue", weight: 4 },
        };
        return styles[color] || styles.blue;
    };

    const getRoadCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    return (
        <div className="p-4 mx-auto">
            {/* Buttons Section */}
            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => !isAdding && setIsAdding(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${isAdding ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    disabled={isAdding}
                    whileHover={{ scale: isAdding ? 1 : 1.05 }}
                    whileTap={{ scale: isAdding ? 1 : 0.95 }}
                >
                    <FaMapMarkedAlt />
                    Create Road Marking
                </motion.button>
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaMap />
                    View All Roads
                </motion.button>
            </div>

            {/* Main Content Section */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Section: Map and Legends */}
                <AnimatePresence>
                    <motion.div
                        key="map-section"
                        className={`flex flex-col gap-6 ${isAdding ? "w-full lg:w-2/3" : "w-full"}`}
                        initial={{ width: "100%", opacity: 0.8, scale: 0.95 }}
                        animate={{ width: isAdding ? "66.67%" : "100%", opacity: 1, scale: 1 }}
                        exit={{ width: "100%", opacity: 0.8, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {/* Map Section */}
                        <motion.div
                            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                        >
                            <MapContainer center={centerCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                                <LayersControl position="topright">
                                    <LayersControl.BaseLayer checked name="Street Map">
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Satellite">
                                        <TileLayer
                                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                            attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Terrain">
                                        <TileLayer
                                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                            attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                        />
                                    </LayersControl.BaseLayer>
                                    <LayersControl.BaseLayer name="Grayscale">
                                        <TileLayer
                                            url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                            attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                    </LayersControl.BaseLayer>
                                </LayersControl>
                                {roads.map((road) => (
                                    <Polyline key={road.id} positions={road.coords} pathOptions={getRoadStyle(road.color)}>
                                        <Popup>
                                            <div className="p-2">
                                                <h3 className="font-semibold">{road.title}</h3>
                                                <p>
                                                    <strong>Status:</strong> {road.type}
                                                </p>
                                                <p className="mt-2">{road.description}</p>
                                                <div className="mt-3 flex gap-2">
                                                    <motion.button
                                                        onClick={() => handleEditRoad(road.id)}
                                                        className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaHeading />
                                                        Edit
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => handleDeleteRoad(road.id)}
                                                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <FaTrash />
                                                        Delete
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Polyline>
                                ))}
                                {newRoadCoords.length > 0 && (
                                    <Polyline
                                        positions={newRoadCoords}
                                        pathOptions={{
                                            color: "orange",
                                            weight: 4,
                                        }}
                                    />
                                )}
                                {isAdding &&
                                    newRoadCoords.map((coord, index) => (
                                        <CircleMarker
                                            key={`new-${index}`}
                                            center={coord}
                                            radius={6}
                                            pathOptions={{
                                                color: "orange",
                                                fillColor: "orange",
                                                fillOpacity: 1,
                                            }}
                                            eventHandlers={{
                                                mousedown: (e) => {
                                                    if (e.originalEvent.button === 2) {
                                                        L.DomEvent.preventDefault(e);
                                                        setDraggingVertexIndex(index);
                                                        setDragStartCoord(coord);
                                                    }
                                                },
                                            }}
                                        />
                                    ))}
                                <MapClickHandler />
                            </MapContainer>
                        </motion.div>

                        {/* Legends Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                    <FaMapMarkedAlt className="text-blue-600" />
                                    Keyboard Shortcuts
                                </h3>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Left Click:</strong> Add point
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Right Click:</strong> Move point
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaUndo className="text-gray-500" /> <strong>Ctrl + Z:</strong> Undo last action
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaRedo className="text-gray-500" /> <strong>Ctrl + Y:</strong> Redo last action
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaTrash className="text-gray-500" /> <strong>Ctrl + X:</strong> Remove last point (new roads only)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <FaMap className="text-gray-500" /> <strong>Middle Mouse:</strong> Drag map
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                    <FaTag className="text-blue-600" />
                                    Road Statuses
                                </h3>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-500 rounded-full"></div> Concrete
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div> Improvement
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Widening
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Right Section: Input Form */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            key="form-section"
                            className="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-lg"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FaMapMarkedAlt className="text-blue-600" />
                                {editingRoadId ? "Edit Road Marking" : "New Road Marking"}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaHeading className="text-gray-500" />
                                        Road Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter road title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaAlignLeft className="text-gray-500" />
                                        Description
                                    </label>
                                    <textarea
                                        placeholder="Enter road description"
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows园藝 rows="4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaTag className="text-gray-500" />
                                        Road Status
                                    </label>
                                    <select
                                        value={newType}
                                        onChange={(e) => {
                                            setNewType(e.target.value);
                                            const colors = {
                                                Concrete: "gray",
                                                Improvement: "yellow",
                                                Widening: "blue",
                                            };
                                            setNewColor(colors[e.target.value] || "blue");
                                        }}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Concrete">Concrete (Gray)</option>
                                        <option value="Improvement">Improvement (Yellow)</option>
                                        <option value="Widening">Widening (Blue)</option>
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <motion.button
                                        onClick={editingRoadId ? handleSaveEdit : handleAddRoad}
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaSave />
                                        {editingRoadId ? "Save Changes" : "Save Road"}
                                    </motion.button>
                                    <motion.button
                                        onClick={resetForm}
                                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaBan />
                                        Cancel
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaMap className="text-blue-600" />
                                    All Marked Roads
                                </h2>
                                <motion.button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {roads.length === 0 ? (
                                    <p className="text-gray-500 text-center">No roads marked yet.</p>
                                ) : (
                                    roads.map((road) => (
                                        <motion.div
                                            key={road.id}
                                            className="mb-6 p-4 bg-gray-50 rounded-lg shadow"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <h3 className="text-lg font-semibold">{road.title}</h3>
                                            <p className="text-sm text-gray-600">
                                                <strong>Status:</strong> {road.type}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-2">{road.description}</p>
                                            <div className="mt-4 h-64 rounded-lg overflow-hidden">
                                                <MapContainer
                                                    center={getRoadCenter(road.coords)}
                                                    zoom={16}
                                                    style={{ height: "100%", width: "100%" }}
                                                    scrollWheelZoom={false}
                                                >
                                                    <LayersControl position="topright">
                                                        <LayersControl.BaseLayer checked name="Street Map">
                                                            <TileLayer
                                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Satellite">
                                                            <TileLayer
                                                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                                attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Terrain">
                                                            <TileLayer
                                                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                                                attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Grayscale">
                                                            <TileLayer
                                                                url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                                                attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                            />
                                                        </LayersControl.BaseLayer>
                                                    </LayersControl>
                                                    <Polyline positions={road.coords} pathOptions={getRoadStyle(road.color)} />
                                                </MapContainer>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <motion.button
                                                    onClick={() => {
                                                        handleEditRoad(road.id);
                                                        setIsModalOpen(false);
                                                    }}
                                                    className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaHeading />
                                                    Edit
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleDeleteRoad(road.id)}
                                                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaTrash />
                                                    Delete
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminStrategicRoadmap;
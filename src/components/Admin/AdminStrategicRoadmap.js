import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../../index.css";
import bonbonLogo from "../../img/Logo/bonbon-logo.png";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaAlignLeft, FaTag, FaMap } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

// Custom DivIcon for Animation
const customIcon = L.divIcon({
    className: "animated-marker",
    html: `<div class="pin-icon">
                <img src="https://cdn-icons-png.flaticon.com/512/447/447031.png" alt="Pin" />
           </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
});

const AdminStrategicRoadmap = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [polygons, setPolygons] = useState([
        {
            id: 1,
            title: "Initial Strategic Plan",
            description: "This area is designated for community development initiatives.",
            type: "Community Development",
            color: "green",
            coords: [
                [8.5105, 124.6480],
                [8.5110, 124.6500],
                [8.5090, 124.6510],
                [8.5080, 124.6490],
                [8.5105, 124.6480],
            ],
        },
    ]);
    const [newPolygonCoords, setNewPolygonCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPolygonId, setEditingPolygonId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newType, setNewType] = useState("Infrastructure");
    const [newColor, setNewColor] = useState("blue");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndex === null) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewPolygonCoords((prev) => {
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
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[draggingVertexIndex] = [latlng.lat, latlng.lng];
                        return updatedCoords;
                    });
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    const endCoord = newPolygonCoords[draggingVertexIndex];
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
                    setNewPolygonCoords((prev) => prev.filter((_, i) => i !== lastAction.index));
                } else if (lastAction.type === "drag") {
                    setNewPolygonCoords((prev) => {
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
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords.splice(lastRedo.index, 0, lastRedo.coord);
                        return updatedCoords;
                    });
                } else if (lastRedo.type === "drag") {
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[lastRedo.index] = lastRedo.endCoord;
                        return updatedCoords;
                    });
                }
            } else if (e.ctrlKey && e.key === "x" && newPolygonCoords.length > 0 && !editingPolygonId) {
                e.preventDefault();
                setNewPolygonCoords((prev) => {
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
        [actionHistory, redoHistory, isAdding, newPolygonCoords, editingPolygonId]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const handleAddPolygon = () => {
        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A strategic area must have at least 3 points!",
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
        const newPolygon = {
            id: polygons.length + 1,
            title: newTitle,
            description: newDescription,
            type: newType,
            color: newColor,
            coords: [...newPolygonCoords, newPolygonCoords[0]],
        };
        setPolygons([...polygons, newPolygon]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Strategic area added successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    const handleDeletePolygon = (id) => {
        setPolygons(polygons.filter((polygon) => polygon.id !== id));
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Strategic area deleted successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    const handleEditPolygon = (id) => {
        setEditingPolygonId(id);
        const polygonToEdit = polygons.find((p) => p.id === id);
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1));
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(polygonToEdit.title);
        setNewDescription(polygonToEdit.description);
        setNewType(polygonToEdit.type);
        setNewColor(polygonToEdit.color);
        setIsAdding(true);
    };

    const handleSaveEdit = () => {
        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A strategic area must have at least 3 points!",
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
        const updatedPolygons = polygons.map((polygon) =>
            polygon.id === editingPolygonId
                ? {
                    ...polygon,
                    title: newTitle,
                    description: newDescription,
                    type: newType,
                    color: newColor,
                    coords: [...newPolygonCoords, newPolygonCoords[0]],
                }
                : polygon
        );
        setPolygons(updatedPolygons);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Strategic area updated successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    const resetForm = () => {
        setNewPolygonCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle("");
        setNewDescription("");
        setNewType("Infrastructure");
        setNewColor("blue");
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null);
        setDragStartCoord(null);
    };

    const getPolygonStyle = (color) => {
        const styles = {
            blue: { fillColor: "rgba(59, 130, 246, 0.5)", color: "blue", weight: 2 },
            green: { fillColor: "rgba(34, 197, 94, 0.5)", color: "green", weight: 2 },
            red: { fillColor: "rgba(239, 68, 68, 0.5)", color: "red", weight: 2 },
            purple: { fillColor: "rgba(147, 51, 234, 0.5)", color: "purple", weight: 2 },
            yellow: { fillColor: "rgba(234, 179, 8, 0.5)", color: "yellow", weight: 2 },
        };
        return styles[color] || styles.blue;
    };

    const getPolygonCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold bg-[#dee5f8] p-4 flex items-center gap-2">
                <FaMap className="text-[#172554]" size={30} />
                Strategic Roadmap
            </h1>
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
                        Create Strategic Area
                    </motion.button>
                    <motion.button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaMap />
                        View All Strategic Areas
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
                                <MapContainer center={bonbonCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <Marker position={bonbonCoords} icon={customIcon}>
                                        <Popup>
                                            <div className="flex flex-col items-center text-center">
                                                <img
                                                    src={bonbonLogo}
                                                    alt="Bonbon Barangay Hall Logo"
                                                    className="w-24 h-auto mb-2 rounded"
                                                />
                                                <strong>Bonbon Barangay Hall</strong>
                                                <div>Barangay Bonbon, Cagayan de Oro City</div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                    {polygons.map((polygon) => (
                                        <Polygon key={polygon.id} positions={polygon.coords} pathOptions={getPolygonStyle(polygon.color)}>
                                            <Popup>
                                                <div className="p-2">
                                                    <h3 className="font-semibold">{polygon.title}</h3>
                                                    <p>
                                                        <strong>Type:</strong> {polygon.type}
                                                    </p>
                                                    <p className="mt-2">{polygon.description}</p>
                                                    <div className="mt-3 flex gap-2">
                                                        <motion.button
                                                            onClick={() => handleEditPolygon(polygon.id)}
                                                            className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaHeading />
                                                            Edit
                                                        </motion.button>
                                                        <motion.button
                                                            onClick={() => handleDeletePolygon(polygon.id)}
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
                                        </Polygon>
                                    ))}
                                    {newPolygonCoords.length > 0 && (
                                        <Polygon
                                            positions={newPolygonCoords}
                                            pathOptions={{
                                                fillColor: "rgba(255, 165, 0, 0.5)",
                                                color: "orange",
                                                weight: 2,
                                            }}
                                        />
                                    )}
                                    {isAdding &&
                                        newPolygonCoords.map((coord, index) => (
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
                                            <FaTrash className="text-gray-500" /> <strong>Ctrl + X:</strong> Remove last point (new areas only)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <FaMap className="text-gray-500" /> <strong>Middle Mouse:</strong> Drag map
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow">
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                        <FaTag className="text-blue-600" />
                                        Strategic Area Types
                                    </h3>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Infrastructure
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-green-500 rounded-full"></div> Community Development
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-red-500 rounded-full"></div> Environmental Sustainability
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-purple-500 rounded-full"></div> Disaster Preparedness
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div> Economic Development
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
                                    {editingPolygonId ? "Edit Strategic Area" : "New Strategic Area"}
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaHeading className="text-gray-500" />
                                            Area Title
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter area title"
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
                                            placeholder="Enter area description"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="4"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Strategic Type
                                        </label>
                                        <select
                                            value={newType}
                                            onChange={(e) => {
                                                setNewType(e.target.value);
                                                const colors = {
                                                    Infrastructure: "blue",
                                                    "Community Development": "green",
                                                    "Environmental Sustainability": "red",
                                                    "Disaster Preparedness": "purple",
                                                    "Economic Development": "yellow",
                                                };
                                                setNewColor(colors[e.target.value] || "blue");
                                            }}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Infrastructure">Infrastructure (Blue)</option>
                                            <option value="Community Development">Community Development (Green)</option>
                                            <option value="Environmental Sustainability">Environmental Sustainability (Red)</option>
                                            <option value="Disaster Preparedness">Disaster Preparedness (Purple)</option>
                                            <option value="Economic Development">Economic Development (Yellow)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <motion.button
                                            onClick={editingPolygonId ? handleSaveEdit : handleAddPolygon}
                                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FaSave />
                                            {editingPolygonId ? "Save Changes" : "Save Area"}
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
                                        All Strategic Areas
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
                                    {polygons.length === 0 ? (
                                        <p className="text-gray-500 text-center">No strategic areas created yet.</p>
                                    ) : (
                                        polygons.map((polygon) => (
                                            <motion.div
                                                key={polygon.id}
                                                className="mb-6 p-4 bg-gray-50 rounded-lg shadow"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <h3 className="text-lg font-semibold">{polygon.title}</h3>
                                                <p className="text-sm text-gray-600">
                                                    <strong>Type:</strong> {polygon.type}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-2">{polygon.description}</p>
                                                <div className="mt-4 h-64 rounded-lg overflow-hidden">
                                                    <MapContainer
                                                        center={getPolygonCenter(polygon.coords)}
                                                        zoom={16}
                                                        style={{ height: "100%", width: "100%" }}
                                                        scrollWheelZoom={false}
                                                    >
                                                        <TileLayer
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                        />
                                                        <Polygon positions={polygon.coords} pathOptions={getPolygonStyle(polygon.color)} />
                                                    </MapContainer>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <motion.button
                                                        onClick={() => {
                                                            handleEditPolygon(polygon.id);
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
                                                        onClick={() => handleDeletePolygon(polygon.id)}
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
        </div>
    );
};

export default AdminStrategicRoadmap;
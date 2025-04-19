import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import "../../index.css";
import bonbonLogo from "../../img/Logo/bonbon-logo.png";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaAlignLeft, FaTag, FaMap, FaMoneyBillWave, FaCalendarAlt } from "react-icons/fa";
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

const AdminProMgmt = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [polygons, setPolygons] = useState([]);
    const [newPolygonCoords, setNewPolygonCoords] = useState([]);
    const [actionHistory, setActionHistory] = useState([]);
    const [redoHistory, setRedoHistory] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPolygonId, setEditingPolygonId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newBudget, setNewBudget] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newStatus, setNewStatus] = useState("Planned");
    const [newColor, setNewColor] = useState("blue");
    const [newProjectLead, setNewProjectLead] = useState("John Doe");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mapLayer, setMapLayer] = useState("street");

    // Map layer options
    const layers = {
        street: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
        satellite: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution: "© Esri",
        },
    };

    // Load polygons from local storage on mount
    useEffect(() => {
        const savedPolygons = localStorage.getItem("polygons");
        if (savedPolygons) {
            setPolygons(JSON.parse(savedPolygons));
        }
    }, []);

    // Save polygons to local storage when updated
    useEffect(() => {
        localStorage.setItem("polygons", JSON.stringify(polygons));
    }, [polygons]);

    // Calculate polygon area
    const calculateArea = (coords) => {
        const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
        return turf.area(polygon).toFixed(2); // Area in square meters
    };

    // Validate polygon for self-intersections
    const isPolygonValid = (coords) => {
        if (coords.length < 3) return true; // Allow incomplete polygons during editing
        const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
        const issues = kinks(polygon);
        return issues.features.length === 0;
    };

    // MapClickHandler component
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
                    const newCoord = [latlng.lat, latlng.lng];
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[draggingVertexIndex] = newCoord;
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
        }, [map, draggingVertexIndex, newPolygonCoords]);

        return null;
    };

    // Keyboard shortcuts
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

    // Add a new polygon
    const handleAddPolygon = () => {
        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A polygon must have at least 3 points!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newDescription || !newBudget || !newStartDate || !newEndDate || !newProjectLead) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide all required fields!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid polygon: The shape cannot have self-intersections!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        const newPolygon = {
            id: polygons.length + 1,
            title: newTitle,
            description: newDescription,
            budget: newBudget,
            startDate: newStartDate,
            endDate: newEndDate,
            status: newStatus,
            color: newColor,
            projectLead: newProjectLead,
            area: calculateArea(newPolygonCoords),
            coords: [...newPolygonCoords, newPolygonCoords[0]],
        };
        setPolygons([...polygons, newPolygon]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Polygon added successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    // Delete a polygon
    const handleDeletePolygon = (id) => {
        setPolygons(polygons.filter((polygon) => polygon.id !== id));
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Polygon deleted successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    // Start editing a polygon
    const handleEditPolygon = (id) => {
        setEditingPolygonId(id);
        const polygonToEdit = polygons.find((p) => p.id === id);
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1));
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(polygonToEdit.title);
        setNewDescription(polygonToEdit.description);
        setNewBudget(polygonToEdit.budget);
        setNewStartDate(polygonToEdit.startDate);
        setNewEndDate(polygonToEdit.endDate);
        setNewStatus(polygonToEdit.status);
        setNewColor(polygonToEdit.color);
        setNewProjectLead(polygonToEdit.projectLead);
        setIsAdding(true);
    };

    // Save edited polygon
    const handleSaveEdit = () => {
        if (newPolygonCoords.length < 3) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A polygon must have at least 3 points!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newDescription || !newBudget || !newStartDate || !newEndDate || !newProjectLead) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide all required fields!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Invalid polygon: The shape cannot have self-intersections!",
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
                      budget: newBudget,
                      startDate: newStartDate,
                      endDate: newEndDate,
                      status: newStatus,
                      color: newColor,
                      projectLead: newProjectLead,
                      area: calculateArea(newPolygonCoords),
                      coords: [...newPolygonCoords, newPolygonCoords[0]],
                  }
                : polygon
        );
        setPolygons(updatedPolygons);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Polygon updated successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    // Reset form
    const resetForm = () => {
        setNewPolygonCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle("");
        setNewDescription("");
        setNewBudget("");
        setNewStartDate("");
        setNewEndDate("");
        setNewStatus("Planned");
        setNewColor("blue");
        setNewProjectLead("John Doe");
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null);
        setDragStartCoord(null);
    };

    // Polygon styling
    const getPolygonStyle = (color, status) => {
        const baseStyle = {
            blue: { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 },
            green: { fillColor: "rgba(0, 255, 0, 0.5)", color: "green", weight: 2 },
            red: { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 },
        }[color] || { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };

        return {
            ...baseStyle,
            dashArray: status === "Completed" ? "5, 5" : status === "In Progress" ? "10, 10" : null,
        };
    };

    // Calculate polygon center for mini-map
    const getPolygonCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold bg-[#dee5f8] p-4 flex items-center gap-2">
                <FaMap className="text-[#172554]" size={30} />
                Project Management
            </h1>
            <div className="p-4 mx-auto">
                {/* Buttons Section */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <motion.button
                        onClick={() => !isAdding && setIsAdding(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${isAdding ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                        disabled={isAdding}
                        whileHover={{ scale: isAdding ? 1 : 1.05 }}
                        whileTap={{ scale: isAdding ? 1 : 0.95 }}
                    >
                        <FaMapMarkedAlt />
                        Create Project Area
                    </motion.button>
                    <motion.button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaMap />
                        View All Projects
                    </motion.button>
                    <select
                        value={mapLayer}
                        onChange={(e) => setMapLayer(e.target.value)}
                        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="street">Street Map</option>
                        <option value="satellite">Satellite</option>
                    </select>
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
                                        url={layers[mapLayer].url}
                                        attribution={layers[mapLayer].attribution}
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
                                        <Polygon
                                            key={polygon.id}
                                            positions={polygon.coords}
                                            pathOptions={getPolygonStyle(polygon.color, polygon.status)}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <h3 className="font-semibold">{polygon.title}</h3>
                                                    <p><strong>Status:</strong> {polygon.status}</p>
                                                    <p><strong>Budget:</strong> {polygon.budget}</p>
                                                    <p><strong>Timeline:</strong> {polygon.startDate} to {polygon.endDate}</p>
                                                    <p><strong>Project Lead:</strong> {polygon.projectLead}</p>
                                                    <p><strong>Area:</strong> {polygon.area} sqm</p>
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
                                            <FaTrash className="text-gray-500" /> <strong>Ctrl + X:</strong> Remove last point (new polygons only)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <FaMap className="text-gray-500" /> <strong>Middle Mouse:</strong> Drag map
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow">
                                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                                        <FaTag className="text-blue-600" />
                                        Project Statuses & Types
                                    </h3>
                                    <ul className="text-sm text-gray-600 space-y-2">
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Small Projects
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-green-500 rounded-full"></div> Eco-Friendly Projects
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-red-500 rounded-full"></div> Big/Heavy Projects
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500"></div> Planned
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-dashed"></div> In Progress
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-dotted"></div> Completed
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
                                    {editingPolygonId ? "Edit Project Area" : "New Project Area"}
                                </h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaHeading className="text-gray-500" />
                                            Project Title
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter project title"
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
                                            placeholder="Enter project description"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="4"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaMoneyBillWave className="text-gray-500" />
                                            Budget
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., PHP 1,000,000"
                                            value={newBudget}
                                            onChange={(e) => setNewBudget(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaCalendarAlt className="text-gray-500" />
                                            Timeline
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={newStartDate}
                                                onChange={(e) => setNewStartDate(e.target.value)}
                                                className="mt-1 w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="date"
                                                value={newEndDate}
                                                onChange={(e) => setNewEndDate(e.target.value)}
                                                className="mt-1 w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Project Lead
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter project lead"
                                            value={newProjectLead}
                                            onChange={(e) => setNewProjectLead(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Status
                                        </label>
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Planned">Planned</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Project Type
                                        </label>
                                        <select
                                            value={newColor}
                                            onChange={(e) => setNewColor(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="blue">Small Projects (Blue)</option>
                                            <option value="green">Eco-Friendly Projects (Green)</option>
                                            <option value="red">Big/Heavy Projects (Red)</option>
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
                                            {editingPolygonId ? "Save Changes" : "Save Project"}
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
                                        All Project Areas
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
                                        <p className="text-gray-500 text-center">No projects marked yet.</p>
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
                                                <p className="text-sm text-gray-600"><strong>Status:</strong> {polygon.status}</p>
                                                <p className="text-sm text-gray-600"><strong>Budget:</strong> {"Php"}{polygon.budget}{".00"}</p>
                                                <p className="text-sm text-gray-600"><strong>Timeline:</strong> {polygon.startDate} to {polygon.status === "Completed" ? polygon.endDate : "Pending"}</p>
                                                <p className="text-sm text-gray-600"><strong>Project Lead:</strong> {polygon.projectLead}</p>
                                                <p className="text-sm text-gray-600"><strong>Area:</strong> {polygon.area} sqm</p>
                                                <p className="text-sm text-gray-600 mt-2">{polygon.description}</p>
                                                <div className="mt-4 h-64 rounded-lg overflow-hidden">
                                                    <MapContainer
                                                        center={getPolygonCenter(polygon.coords)}
                                                        zoom={16}
                                                        style={{ height: "100%", width: "100%" }}
                                                        scrollWheelZoom={false}
                                                    >
                                                        <TileLayer
                                                            url={layers[mapLayer].url}
                                                            attribution={layers[mapLayer].attribution}
                                                        />
                                                        <Polygon positions={polygon.coords} pathOptions={getPolygonStyle(polygon.color, polygon.status)} />
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

export default AdminProMgmt;
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import "../../index.css";
import bonbonLogo from "../../img/Logo/bonbon-logo.png";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaTag, FaMap, FaMoneyBillWave, FaCalendarAlt, FaUser, FaExclamationCircle, FaImage, FaInfoCircle } from "react-icons/fa";
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
    const [newLocation, setNewLocation] = useState("");
    const [newContractor, setNewContractor] = useState("");
    const [newContractPayment, setNewContractPayment] = useState("");
    const [newUpdateStatus, setNewUpdateStatus] = useState("Satisfactory");
    const [newDateMonitoringStart, setNewDateMonitoringStart] = useState("");
    const [newDateMonitoringEnd, setNewDateMonitoringEnd] = useState("");
    const [newIssues, setNewIssues] = useState("");
    const [newProjectEngineer, setNewProjectEngineer] = useState("");
    const [newColor, setNewColor] = useState("Satisfactory");
    const [newImage, setNewImage] = useState(null);
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [dragStartCoord, setDragStartCoord] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
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

    // Calculate polygon center for location lookup
    const getPolygonCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    // Simulate reverse geocoding to get address from polygon center
    const fetchLocationFromCoords = async (lat, lng) => {
        // Placeholder for reverse geocoding API call (e.g., using Nominatim)
        // In a real app, you'd use something like:
        // const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        // const data = await response.json();
        // return data.display_name || "Unknown Location";

        // For now, simulate the location (since I can't make API calls)
        return `Simulated Address near (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    };

    // Update location whenever newPolygonCoords changes
    useEffect(() => {
        if (newPolygonCoords.length >= 3) {
            const [centerLat, centerLng] = getPolygonCenter(newPolygonCoords);
            fetchLocationFromCoords(centerLat, centerLng).then((address) => {
                setNewLocation(address);
            });
        } else {
            setNewLocation("");
        }
    }, [newPolygonCoords]);

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

        // Middle mouse dragging (unchanged)
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

        // Disable default right-click (unchanged)
        useEffect(() => {
            const mapContainer = map.getContainer();
            const handleContextMenu = (e) => e.preventDefault();
            mapContainer.addEventListener("contextmenu", handleContextMenu);
            return () => mapContainer.removeEventListener("contextmenu", handleContextMenu);
        }, [map]);

        // Vertex dragging (removed dependency array to fix warning)
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
        }); // Removed dependency array

        return null;
    };

    // Keyboard shortcuts (unchanged)
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

    // Add a new polygon (unchanged)
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
        if (!newTitle || !newLocation || !newContractor || !newContractPayment || !newDateMonitoringStart || !newDateMonitoringEnd || !newProjectEngineer) {
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
            location: newLocation,
            contractor: newContractor,
            contractPayment: newContractPayment,
            updateStatus: newUpdateStatus,
            dateMonitoringStart: newDateMonitoringStart,
            dateMonitoringEnd: newDateMonitoringEnd,
            issues: newIssues,
            projectEngineer: newProjectEngineer,
            color: newColor,
            image: newImage ? URL.createObjectURL(newImage) : null,
            area: calculateArea(newPolygonCoords),
            coords: [...newPolygonCoords, newPolygonCoords[0]],
        };
        setPolygons([...polygons, newPolygon]);
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Project added successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    // Delete a polygon (unchanged)
    const handleDeletePolygon = (id) => {
        setPolygons(polygons.filter((polygon) => polygon.id !== id));
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Project deleted successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
    };

    // Start editing a polygon (unchanged)
    const handleEditPolygon = (id) => {
        setEditingPolygonId(id);
        const polygonToEdit = polygons.find((p) => p.id === id);
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1));
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(polygonToEdit.title);
        setNewLocation(polygonToEdit.location);
        setNewContractor(polygonToEdit.contractor);
        setNewContractPayment(polygonToEdit.contractPayment);
        setNewUpdateStatus(polygonToEdit.updateStatus);
        setNewDateMonitoringStart(polygonToEdit.dateMonitoringStart);
        setNewDateMonitoringEnd(polygonToEdit.dateMonitoringEnd);
        setNewIssues(polygonToEdit.issues);
        setNewProjectEngineer(polygonToEdit.projectEngineer);
        setNewColor(polygonToEdit.color);
        setNewImage(null); // Image reset on edit (can be modified to retain if needed)
        setIsAdding(true);
    };

    // Save edited polygon (unchanged)
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
        if (!newTitle || !newLocation || !newContractor || !newContractPayment || !newDateMonitoringStart || !newDateMonitoringEnd || !newProjectEngineer) {
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
                      location: newLocation,
                      contractor: newContractor,
                      contractPayment: newContractPayment,
                      updateStatus: newUpdateStatus,
                      dateMonitoringStart: newDateMonitoringStart,
                      dateMonitoringEnd: newDateMonitoringEnd,
                      issues: newIssues,
                      projectEngineer: newProjectEngineer,
                      color: newColor,
                      image: newImage ? URL.createObjectURL(newImage) : polygon.image,
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
            title: "Project updated successfully!",
            showConfirmButton: false,
            timer: 1500,
        });
        resetForm();
    };

    // Reset form (unchanged)
    const resetForm = () => {
        setNewPolygonCoords([]);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle("");
        setNewLocation("");
        setNewContractor("");
        setNewContractPayment("");
        setNewUpdateStatus("Satisfactory");
        setNewDateMonitoringStart("");
        setNewDateMonitoringEnd("");
        setNewIssues("");
        setNewProjectEngineer("");
        setNewColor("Satisfactory");
        setNewImage(null);
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null);
        setDragStartCoord(null);
    };

    // Polygon styling (unchanged)
    const getPolygonStyle = (color, status) => {
        const baseStyle = {
            "Satisfactory": { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 },
            "With Serious Deficiencies": { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 },
            "With Minor Deficiencies": { fillColor: "rgba(255, 165, 0, 0.5)", color: "orange", weight: 2 },
        }[color] || { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };

        return {
            ...baseStyle,
            dashArray: status === "Completed" ? "5, 5" : status === "In Progress" ? "10, 10" : null,
        };
    };

    // Handle image upload (unchanged)
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewImage(file);
        }
    };

    // Handle "See more..." click (unchanged)
    const handleSeeMore = (polygon) => {
        setSelectedPolygon(polygon);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-4 mx-auto">
                {/* Buttons Section (unchanged) */}
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
                                            pathOptions={getPolygonStyle(polygon.color, polygon.updateStatus)}
                                        >
                                            <Popup>
                                                <div className="p-2 w-64">
                                                    <h3 className="font-semibold">{polygon.title}</h3>
                                                    <p><strong>Location:</strong> {polygon.location}</p>
                                                    <p><strong>Contractor:</strong> {polygon.contractor}</p>
                                                    <p><strong>Contract Payment:</strong> {polygon.contractPayment}</p>
                                                    <p><strong>Update Status:</strong> {polygon.updateStatus}</p>
                                                    <p><strong>Date Monitoring:</strong> {polygon.dateMonitoringStart} to {polygon.dateMonitoringEnd}</p>
                                                    <p><strong>Issues:</strong> {polygon.issues || "None"}</p>
                                                    <p><strong>Project Engineer:</strong> {polygon.projectEngineer}</p>
                                                    <p><strong>Area:</strong> {polygon.area} sqm</p>
                                                    <button
                                                        onClick={() => handleSeeMore(polygon)}
                                                        className="text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                                    >
                                                        <FaInfoCircle /> See more...
                                                    </button>
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

                            {/* Legends Section (unchanged) */}
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
                                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Satisfactory
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-orange-500 rounded-full"></div> With Minor Deficiencies
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-4 h-4 bg-red-500 rounded-full"></div> With Serious Deficiencies
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

                    {/* Right Section: Input Form (unchanged) */}
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
                                    {editingPolygonId ? "Edit Project" : "Add Project"}
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
                                            <FaMap className="text-gray-500" />
                                            Project Location
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Location will be auto-filled"
                                            value={newLocation}
                                            onChange={(e) => setNewLocation(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaUser className="text-gray-500" />
                                            Contractor
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter contractor name"
                                            value={newContractor}
                                            onChange={(e) => setNewContractor(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaMoneyBillWave className="text-gray-500" />
                                            Contract Payment
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g., PHP 1,000,000"
                                            value={newContractPayment}
                                            onChange={(e) => setNewContractPayment(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Update Status
                                        </label>
                                        <select
                                            value={newUpdateStatus}
                                            onChange={(e) => setNewUpdateStatus(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Planned">Planned</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaCalendarAlt className="text-gray-500" />
                                            Date Monitoring
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={newDateMonitoringStart}
                                                onChange={(e) => setNewDateMonitoringStart(e.target.value)}
                                                className="mt-1 w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="date"
                                                value={newDateMonitoringEnd}
                                                onChange={(e) => setNewDateMonitoringEnd(e.target.value)}
                                                className="mt-1 w-1/2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaExclamationCircle className="text-gray-500" />
                                            Issues
                                        </label>
                                        <textarea
                                            placeholder="Enter any issues"
                                            value={newIssues}
                                            onChange={(e) => setNewIssues(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="4"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaUser className="text-gray-500" />
                                            Project Engineer
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter project engineer name"
                                            value={newProjectEngineer}
                                            onChange={(e) => setNewProjectEngineer(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaTag className="text-gray-500" />
                                            Project Color
                                        </label>
                                        <div className="flex gap-4 mt-2">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    value="Satisfactory"
                                                    checked={newColor === "Satisfactory"}
                                                    onChange={(e) => setNewColor(e.target.value)}
                                                    className="form-radio text-blue-600"
                                                />
                                                Satisfactory
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    value="With Serious Deficiencies"
                                                    checked={newColor === "With Serious Deficiencies"}
                                                    onChange={(e) => setNewColor(e.target.value)}
                                                    className="form-radio text-red-600"
                                                />
                                                With Serious Deficiencies
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    value="With Minor Deficiencies"
                                                    checked={newColor === "With Minor Deficiencies"}
                                                    onChange={(e) => setNewColor(e.target.value)}
                                                    className="form-radio text-orange-600"
                                                />
                                                With Minor Deficiencies
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FaImage className="text-gray-500" />
                                            Add Image
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {newImage && (
                                            <div className="mt-2">
                                                <img
                                                    src={URL.createObjectURL(newImage)}
                                                    alt="Preview"
                                                    className="w-full h-32 object-cover rounded"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <motion.button
                                            onClick={editingPolygonId ? handleSaveEdit : handleAddPolygon}
                                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FaSave />
                                            {editingPolygonId ? "Save Changes" : "Create Project"}
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

                {/* Modal for All Projects (unchanged) */}
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
                                        All Projects
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
                                                <p className="text-sm text-gray-600"><strong>Location:</strong> {polygon.location}</p>
                                                <p className="text-sm text-gray-600"><strong>Contractor:</strong> {polygon.contractor}</p>
                                                <p className="text-sm text-gray-600"><strong>Contract Payment:</strong> {polygon.contractPayment}</p>
                                                <p className="text-sm text-gray-600"><strong>Update Status:</strong> {polygon.updateStatus}</p>
                                                <p className="text-sm text-gray-600"><strong>Date Monitoring:</strong> {polygon.dateMonitoringStart} to {polygon.dateMonitoringEnd}</p>
                                                <p className="text-sm text-gray-600"><strong>Issues:</strong> {polygon.issues || "None"}</p>
                                                <p className="text-sm text-gray-600"><strong>Project Engineer:</strong> {polygon.projectEngineer}</p>
                                                <p className="text-sm text-gray-600"><strong>Area:</strong> {polygon.area} sqm</p>
                                                {polygon.image && (
                                                    <img src={polygon.image} alt="Project" className="mt-2 w-full h-32 object-cover rounded" />
                                                )}
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
                                                        <Polygon positions={polygon.coords} pathOptions={getPolygonStyle(polygon.color, polygon.updateStatus)} />
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

                {/* Modal for Detailed View (unchanged) */}
                <AnimatePresence>
                    {isDetailModalOpen && selectedPolygon && (
                        <motion.div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <motion.div
                                className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col"
                                initial={{ scale: 0.8, y: 50 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.8, y: 50 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="flex justify-between items-center p-4 border-b">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <FaInfoCircle className="text-blue-600" />
                                        Project Details
                                    </h2>
                                    <motion.button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="text-gray-600 hover:text-gray-800"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FaTimes size={24} />
                                    </motion.button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <h3 className="text-lg font-semibold mb-2">{selectedPolygon.title}</h3>
                                    <div className="mb-4">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Image:</p>
                                        {selectedPolygon.image ? (
                                            <img
                                                src={selectedPolygon.image}
                                                alt="Project"
                                                className="w-full h-48 object-cover rounded"
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No image sample</p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-1">Full Description (Issues):</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.issues || "No issues reported"}</p>
                                    </div>
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
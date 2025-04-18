import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as turf from "@turf/turf";
import kinks from "@turf/kinks";
import "../../index.css";
import bonbonLogo from "../../img/Logo/bonbon-logo.png";

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
    const bonbonCoords = [8.509057124770594, 124.6491339822436];
    const [polygons, setPolygons] = useState([]);
    const [newPolygonCoords, setNewPolygonCoords] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingPolygonId, setEditingPolygonId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newBudget, setNewBudget] = useState("");
    const [newStartDate, setNewStartDate] = useState("");
    const [newEndDate, setNewEndDate] = useState("");
    const [newColor, setNewColor] = useState("blue");
    const [newStatus, setNewStatus] = useState("Planned");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
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
        const polygon = turf.polygon([[...coords, coords[0]].map(([lat, lng]) => [lng, lat])]);
        const issues = kinks(polygon);
        return issues.features.length === 0;
    };

    // Add coordinates to history for undo/redo
    const addToHistory = (coords) => {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, coords]);
        setHistoryIndex(newHistory.length);
    };

    // Undo coordinate change
    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setNewPolygonCoords(history[historyIndex - 1]);
        }
    };

    // Redo coordinate change
    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setNewPolygonCoords(history[historyIndex + 1]);
        }
    };

    // Component to handle map clicks for adding new points
    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && !editingPolygonId) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    const updatedCoords = [...newPolygonCoords, newCoord];
                    setNewPolygonCoords(updatedCoords);
                    addToHistory(updatedCoords);
                    console.log("Added new coordinate:", newCoord);
                }
            },
        });

        // Disable map dragging and zooming during editing or adding mode
        useEffect(() => {
            if (isAdding || editingPolygonId) {
                map.dragging.disable();
                map.scrollWheelZoom.disable();
                map.touchZoom.disable();
                console.log("Disabled map interactions");
            } else {
                map.dragging.enable();
                map.scrollWheelZoom.enable();
                map.touchZoom.enable();
                console.log("Enabled map interactions");
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [map, isAdding, editingPolygonId]);

        // Handle mouse move and mouse up for right-click dragging
        useEffect(() => {
            const handleMouseMove = (e) => {
                if (draggingVertexIndex !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    const updatedCoords = [...newPolygonCoords];
                    updatedCoords[draggingVertexIndex] = [latlng.lat, latlng.lng];
                    setNewPolygonCoords(updatedCoords);
                    addToHistory(updatedCoords);
                    console.log(`Dragging vertex ${draggingVertexIndex} to:`, [latlng.lat, latlng.lng]);
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    console.log(`Finished dragging vertex ${draggingVertexIndex}`);
                    setDraggingVertexIndex(null);
                }
            };

            if (editingPolygonId) {
                const mapContainer = map.getContainer();
                mapContainer.addEventListener("mousemove", handleMouseMove);
                mapContainer.addEventListener("mouseup", handleMouseUp);
                mapContainer.addEventListener("mouseleave", handleMouseUp);

                return () => {
                    mapContainer.removeEventListener("mousemove", handleMouseMove);
                    mapContainer.removeEventListener("mouseup", handleMouseUp);
                    mapContainer.removeEventListener("mouseleave", handleMouseUp);
                };
            }
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [map, draggingVertexIndex, editingPolygonId]);

        return null;
    };

    // Add a new polygon
    const handleAddPolygon = () => {
        if (newPolygonCoords.length < 3) {
            alert("A polygon must have at least 3 points!");
            return;
        }
        if (!newTitle || !newDescription || !newBudget || !newStartDate || !newEndDate) {
            alert("Please provide a title, description, budget, start date, and end date for the planned area!");
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            alert("Invalid polygon: The shape cannot have self-intersections!");
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
            area: calculateArea(newPolygonCoords),
            coords: [...newPolygonCoords, newPolygonCoords[0]],
        };
        setPolygons([...polygons, newPolygon]);
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewBudget("");
        setNewStartDate("");
        setNewEndDate("");
        setNewStatus("Planned");
        setNewColor("blue");
        setIsAdding(false);
        setHistory([]);
        setHistoryIndex(-1);
        console.log("Added new polygon:", newPolygon);
    };

    // Delete a polygon
    const handleDeletePolygon = (id) => {
        setPolygons(polygons.filter((polygon) => polygon.id !== id));
        console.log("Deleted polygon with id:", id);
    };

    // Start editing a polygon
    const handleEditPolygon = (id) => {
        setEditingPolygonId(id);
        const polygonToEdit = polygons.find((p) => p.id === id);
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1));
        setNewTitle(polygonToEdit.title);
        setNewDescription(polygonToEdit.description);
        setNewBudget(polygonToEdit.budget);
        setNewStartDate(polygonToEdit.startDate);
        setNewEndDate(polygonToEdit.endDate);
        setNewStatus(polygonToEdit.status);
        setNewColor(polygonToEdit.color);
        setIsAdding(true);
        setHistory([polygonToEdit.coords.slice(0, -1)]);
        setHistoryIndex(0);
        console.log("Entered edit mode for polygon id:", id);
    };

    // Save edited polygon
    const handleSaveEdit = () => {
        if (newPolygonCoords.length < 3) {
            alert("A polygon must have at least 3 points!");
            return;
        }
        if (!newTitle || !newDescription || !newBudget || !newStartDate || !newEndDate) {
            alert("Please provide a title, description, budget, start date, and end date for the planned area!");
            return;
        }
        if (!isPolygonValid(newPolygonCoords)) {
            alert("Invalid polygon: The shape cannot have self-intersections!");
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
                      area: calculateArea(newPolygonCoords),
                      coords: [...newPolygonCoords, newPolygonCoords[0]],
                  }
                : polygon
        );
        setPolygons(updatedPolygons);
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewBudget("");
        setNewStartDate("");
        setNewEndDate("");
        setNewStatus("Planned");
        setNewColor("blue");
        setIsAdding(false);
        setEditingPolygonId(null);
        setHistory([]);
        setHistoryIndex(-1);
        console.log("Saved edited polygon with id:", editingPolygonId);
    };

    // Cancel adding/editing
    const handleCancel = () => {
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewBudget("");
        setNewStartDate("");
        setNewEndDate("");
        setNewStatus("Planned");
        setNewColor("blue");
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null);
        setHistory([]);
        setHistoryIndex(-1);
        console.log("Canceled editing mode");
    };

    // Color and status styling for polygons
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

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Admin Strategic Mapping</h1>
            <p className="text-lg text-gray-700 mb-4 text-center">
                Manage planned areas for strategic road projects in Barangay Bonbon.
            </p>

            {/* Map Layer Toggle */}
            <div className="flex justify-center mb-4">
                <select
                    value={mapLayer}
                    onChange={(e) => setMapLayer(e.target.value)}
                    className="px-3 py-2 border rounded"
                >
                    <option value="street">Street Map</option>
                    <option value="satellite">Satellite</option>
                </select>
            </div>

            {/* Map Section */}
            <div className="w-full h-96">
                <MapContainer center={bonbonCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        url={layers[mapLayer].url}
                        attribution={layers[mapLayer].attribution}
                    />

                    {/* Interactive Marker for Bonbon Barangay Hall */}
                    <Marker position={bonbonCoords} icon={customIcon}>
                        <Popup>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                                <img
                                    src={bonbonLogo}
                                    alt="Bonbon Barangay Hall Logo"
                                    style={{ width: "100px", height: "auto", marginBottom: "5px", borderRadius: "5px" }}
                                />
                                <strong>Bonbon Barangay Hall</strong>
                                <br />
                                Barangay Bonbon, Cagayan de Oro City
                            </div>
                        </Popup>
                    </Marker>

                    {/* Render Existing Polygons */}
                    {polygons.map((polygon) => (
                        <Polygon
                            key={polygon.id}
                            positions={polygon.coords}
                            pathOptions={getPolygonStyle(polygon.color, polygon.status)}
                        >
                            <Popup>
                                <div>
                                    <strong>{polygon.title}</strong>
                                    <br />
                                    {polygon.description}
                                    <br />
                                    <strong>Budget:</strong> {polygon.budget}
                                    <br />
                                    <strong>Timeline:</strong> {polygon.startDate} to {polygon.endDate}
                                    <br />
                                    <strong>Status:</strong> {polygon.status}
                                    <br />
                                    <strong>Area:</strong> {polygon.area} sqm
                                    <div className="mt-2">
                                        <button
                                            onClick={() => handleEditPolygon(polygon.id)}
                                            className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeletePolygon(polygon.id)}
                                            className="bg-red-500 text-white px-2 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Polygon>
                    ))}

                    {/* Render New/Editing Polygon Preview */}
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

                    {/* Render Circle Markers for New/Editing Polygon Vertices */}
                    {editingPolygonId &&
                        newPolygonCoords.map((coord, index) => (
                            <CircleMarker
                                key={`new-${index}`}
                                center={coord}
                                radius={5}
                                pathOptions={{
                                    color: "orange",
                                    fillColor: "orange",
                                    fillOpacity: 1,
                                }}
                                draggable={false}
                                eventHandlers={{
                                    contextmenu: (e) => {
                                        L.DomEvent.preventDefault(e);
                                        setDraggingVertexIndex(index);
                                        console.log(`Started right-click dragging vertex ${index}`);
                                    },
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e);
                                        console.log(`Clicked vertex ${index}`);
                                    },
                                }}
                            />
                        ))}

                    {/* Map Click Handler for Adding Points */}
                    <MapClickHandler />
                </MapContainer>
            </div>

            {/* Controls for CRUD - Centered */}
            <div className="mb-4 flex justify-center mt-4">
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
                    >
                        Add New Polygon
                    </button>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="mb-4 w-full max-w-md">
                            <input
                                type="text"
                                placeholder="Title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border rounded"
                            />
                            <textarea
                                placeholder="Description"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border rounded"
                                rows="3"
                            />
                            <input
                                type="text"
                                placeholder="Budget (e.g., PHP 1,000,000)"
                                value={newBudget}
                                onChange={(e) => setNewBudget(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border rounded"
                            />
                            <div className="flex space-x-2 mb-2">
                                <input
                                    type="date"
                                    placeholder="Start Date"
                                    value={newStartDate}
                                    onChange={(e) => setNewStartDate(e.target.value)}
                                    className="w-1/2 px-3 py-2 border rounded"
                                />
                                <input
                                    type="date"
                                    placeholder="End Date"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                    className="w-1/2 px-3 py-2 border rounded"
                                />
                            </div>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border rounded"
                            >
                                <option value="Planned">Planned</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>
                            <select
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-full px-3 py-2 mb-2 border rounded"
                            >
                                <option value="blue">Blue (Small Projects)</option>
                                <option value="green">Green (Eco-Friendly Projects)</option>
                                <option value="red">Red (Big/Heavy Projects)</option>
                            </select>
                        </div>
                        <div className="flex space-x-2 mb-2">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                Undo
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                Redo
                            </button>
                        </div>
                        <div className="flex">
                            <button
                                onClick={editingPolygonId ? handleSaveEdit : handleAddPolygon}
                                className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                            >
                                {editingPolygonId ? "Save Edit" : "Save Polygon"}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-red-500 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Color Legend */}
            <div className="flex flex-col items-center mt-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
                        <span>Small Projects</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-green-500 rounded-full mr-2"></div>
                        <span>Eco-Friendly Projects</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 bg-red-500 rounded-full mr-2"></div>
                        <span>Big/Heavy Projects</span>
                    </div>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-blue-500 mr-2"></div>
                        <span>Planned</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-dashed mr-2"></div>
                        <span>In Progress</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-blue-500 border-dotted mr-2"></div>
                        <span>Completed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProMgmt;
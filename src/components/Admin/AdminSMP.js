import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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

const AdminSMP = () => {
    const bonbonCoords = [8.509057124770594, 124.6491339822436];
    const [polygons, setPolygons] = useState([
        {
            id: 1,
            title: "Initial Project",
            description: "This area is part of the strategic road project.",
            color: "blue",
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
    const [isAdding, setIsAdding] = useState(false);
    const [editingPolygonId, setEditingPolygonId] = useState(null);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newColor, setNewColor] = useState("blue");
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null); // Track which vertex is being dragged

    // Component to handle map clicks for adding new points
    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && !editingPolygonId) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewPolygonCoords([...newPolygonCoords, newCoord]);
                    console.log("Added new coordinate:", newCoord);
                }
            },
        });

        // Disable map dragging and zooming during editing or adding mode
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        }, [map, isAdding, editingPolygonId]); // Dependencies needed for effect to re-run

        // Handle mouse move and mouse up for right-click dragging
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => {
            const handleMouseMove = (e) => {
                if (draggingVertexIndex !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    const updatedCoords = [...newPolygonCoords];
                    updatedCoords[draggingVertexIndex] = [latlng.lat, latlng.lng];
                    setNewPolygonCoords(updatedCoords);
                    console.log(`Dragging vertex ${draggingVertexIndex} to:`, [latlng.lat, latlng.lng]);
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    console.log(`Finished dragging vertex ${draggingVertexIndex}`);
                    setDraggingVertexIndex(null); // Stop dragging
                }
            };

            if (editingPolygonId) {
                // Add event listeners to the map's container (Leaflet's DOM element)
                const mapContainer = map.getContainer();
                mapContainer.addEventListener("mousemove", handleMouseMove);
                mapContainer.addEventListener("mouseup", handleMouseUp);
                mapContainer.addEventListener("mouseleave", handleMouseUp); // Stop dragging if mouse leaves map

                return () => {
                    mapContainer.removeEventListener("mousemove", handleMouseMove);
                    mapContainer.removeEventListener("mouseup", handleMouseUp);
                    mapContainer.removeEventListener("mouseleave", handleMouseUp);
                };
            }
        }, [map, draggingVertexIndex, editingPolygonId]); // Dependencies needed for effect to re-run

        return null;
    };

    // Add a new polygon
    const handleAddPolygon = () => {
        if (newPolygonCoords.length < 3) {
            alert("A polygon must have at least 3 points!");
            return;
        }
        if (!newTitle || !newDescription) {
            alert("Please provide a title and description for the planned area!");
            return;
        }
        const newPolygon = {
            id: polygons.length + 1,
            title: newTitle,
            description: newDescription,
            color: newColor,
            coords: [...newPolygonCoords, newPolygonCoords[0]], // Close the polygon
        };
        setPolygons([...polygons, newPolygon]);
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewColor("blue");
        setIsAdding(false);
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
        setNewPolygonCoords(polygonToEdit.coords.slice(0, -1)); // Exclude the closing point
        setNewTitle(polygonToEdit.title);
        setNewDescription(polygonToEdit.description);
        setNewColor(polygonToEdit.color);
        setIsAdding(true);
        console.log("Entered edit mode for polygon id:", id);
    };

    // Save edited polygon
    const handleSaveEdit = () => {
        if (newPolygonCoords.length < 3) {
            alert("A polygon must have at least 3 points!");
            return;
        }
        if (!newTitle || !newDescription) {
            alert("Please provide a title and description for the planned area!");
            return;
        }
        const updatedPolygons = polygons.map((polygon) =>
            polygon.id === editingPolygonId
                ? {
                      ...polygon,
                      title: newTitle,
                      description: newDescription,
                      color: newColor,
                      coords: [...newPolygonCoords, newPolygonCoords[0]],
                  }
                : polygon
        );
        setPolygons(updatedPolygons);
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewColor("blue");
        setIsAdding(false);
        setEditingPolygonId(null);
        console.log("Saved edited polygon with id:", editingPolygonId);
    };

    // Cancel adding/editing
    const handleCancel = () => {
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewColor("blue");
        setIsAdding(false);
        setEditingPolygonId(null);
        setDraggingVertexIndex(null); // Reset dragging state
        console.log("Canceled editing mode");
    };

    // Color mapping for polygons
    const getPolygonStyle = (color) => {
        switch (color) {
            case "blue":
                return { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };
            case "green":
                return { fillColor: "rgba(0, 255, 0, 0.5)", color: "green", weight: 2 };
            case "red":
                return { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 };
            default:
                return { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Admin Strategic Mapping</h1>
            <p className="text-lg text-gray-700 mb-4 text-center">
                Manage planned areas for strategic road projects in Barangay Bonbon.
            </p>

            {/* Map Section */}
            <div className="w-full h-96">
                <MapContainer center={bonbonCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                            pathOptions={getPolygonStyle(polygon.color)}
                        >
                            <Popup>
                                <div>
                                    <strong>{polygon.title}</strong>
                                    <br />
                                    {polygon.description}
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
                                fillColor: "rgba(255, 165, 0, 0.5)", // Orange for preview
                                color: "orange",
                                weight: 2,
                            }}
                        />
                    )}

                    {/* Render Circle Markers for New/Editing Polygon Vertices (only in editing mode) */}
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
                                draggable={false} // Disable default left-click dragging
                                eventHandlers={{
                                    contextmenu: (e) => {
                                        // Start right-click dragging
                                        L.DomEvent.preventDefault(e); // Prevent default context menu
                                        setDraggingVertexIndex(index);
                                        console.log(`Started right-click dragging vertex ${index}`);
                                    },
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e); // Prevent click events from bubbling
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
            <div className="flex justify-center mt-4">
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
            </div>
        </div>
    );
};

export default AdminSMP;
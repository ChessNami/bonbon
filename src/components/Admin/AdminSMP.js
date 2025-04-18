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
    const [draggingVertexIndex, setDraggingVertexIndex] = useState(null);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Component to handle map clicks for adding new points
    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndex === null) {
                    const newCoord = [e.latlng.lat, e.latlng.lng];
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev, newCoord];
                        setUndoStack((stack) => [...stack, [...prev]]);
                        setRedoStack([]);
                        return updatedCoords;
                    });
                    console.log("Added new coordinate:", newCoord);
                }
            },
            mousedown(e) {
                if (e.originalEvent.button === 1) {
                    map.dragging.enable();
                    console.log("Middle mouse dragging enabled");
                }
            },
            mouseup(e) {
                if (e.originalEvent.button === 1) {
                    map.dragging.disable();
                    console.log("Middle mouse dragging disabled");
                }
            },
            mousewheel(e) {
                const delta = e.deltaY;
                if (delta > 0) {
                    map.zoomOut();
                    console.log("Zoomed out with middle mouse scroll");
                } else {
                    map.zoomIn();
                    console.log("Zoomed in with middle mouse scroll");
                }
            },
        });

        // Disable default right-click context menu
        useEffect(() => {
            const mapContainer = map.getContainer();
            mapContainer.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            });
            return () => {
                mapContainer.removeEventListener("contextmenu", (e) => {
                    e.preventDefault();
                });
            };
        }, [map]);

        // Handle mouse move and mouse up for right-click dragging
        useEffect(() => {
            const handleMouseMove = (e) => {
                if (draggingVertexIndex !== null) {
                    const latlng = map.mouseEventToLatLng(e);
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = [...prev];
                        updatedCoords[draggingVertexIndex] = [latlng.lat, latlng.lng];
                        return updatedCoords;
                    });
                    console.log(`Dragging vertex ${draggingVertexIndex} to:`, [latlng.lat, latlng.lng]);
                }
            };

            const handleMouseUp = () => {
                if (draggingVertexIndex !== null) {
                    console.log(`Finished dragging vertex ${draggingVertexIndex}`);
                    setDraggingVertexIndex(null);
                }
            };

            const mapContainer = map.getContainer();
            mapContainer.addEventListener("mousemove", handleMouseMove);
            mapContainer.addEventListener("mouseup", handleMouseUp);
            mapContainer.addEventListener("mouseleave", handleMouseUp);

            return () => {
                mapContainer.removeEventListener("mousemove", handleMouseMove);
                mapContainer.removeEventListener("mouseup", handleMouseUp);
                mapContainer.removeEventListener("mouseleave", handleMouseUp);
            };
        }, [map]); // Removed draggingVertexIndex from dependencies

        // Handle keyboard shortcuts for undo/redo and delete
        useEffect(() => {
            const handleKeyDown = (e) => {
                if (e.ctrlKey && e.key === "z" && isAdding) {
                    e.preventDefault();
                    setUndoStack((stack) => {
                        if (stack.length === 0) return stack;
                        const lastState = stack[stack.length - 1];
                        setRedoStack((redo) => [...redo, newPolygonCoords]);
                        setNewPolygonCoords(lastState);
                        return stack.slice(0, -1);
                    });
                    console.log("Undo last point");
                } else if (e.ctrlKey && e.key === "y" && isAdding) {
                    e.preventDefault();
                    setRedoStack((stack) => {
                        if (stack.length === 0) return stack;
                        const lastState = stack[stack.length - 1];
                        setUndoStack((undo) => [...undo, newPolygonCoords]);
                        setNewPolygonCoords(lastState);
                        return stack.slice(0, -1);
                    });
                    console.log("Redo last point");
                } else if (e.ctrlKey && e.key === "x" && isAdding && newPolygonCoords.length > 0) {
                    e.preventDefault();
                    setNewPolygonCoords((prev) => {
                        const updatedCoords = prev.slice(0, -1);
                        setUndoStack((stack) => [...stack, prev]);
                        setRedoStack([]);
                        return updatedCoords;
                    });
                    console.log("Deleted last point with Ctrl+X");
                }
            };

            window.addEventListener("keydown", handleKeyDown);
            return () => {
                window.removeEventListener("keydown", handleKeyDown);
            };
        }, []); // Removed isAdding and newPolygonCoords from dependencies

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
            coords: [...newPolygonCoords, newPolygonCoords[0]],
        };
        setPolygons([...polygons, newPolygon]);
        setNewPolygonCoords([]);
        setNewTitle("");
        setNewDescription("");
        setNewColor("blue");
        setIsAdding(false);
        setUndoStack([]);
        setRedoStack([]);
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
        setNewColor(polygonToEdit.color);
        setIsAdding(true);
        setUndoStack([]);
        setRedoStack([]);
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
        setUndoStack([]);
        setRedoStack([]);
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
        setDraggingVertexIndex(null);
        setUndoStack([]);
        setRedoStack([]);
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
        <div className="p-4">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">Admin Strategic Road Mapping</h1>
            <p className="text-base md:text-lg text-gray-700 mb-4 text-center">
                Plan and manage strategic road projects in Barangay Bonbon.
            </p>

            {/* Create Strategic Mapping Button */}
            <div className="flex justify-center mb-4">
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                    >
                        Create Strategic Mapping
                    </button>
                )}
            </div>

            {/* Map and Input Form Section */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
                {/* Map Section */}
                <div className="w-full lg:w-3/4 h-96 lg:h-[500px]">
                    <MapContainer center={bonbonCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
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
                                                className="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeletePolygon(polygon.id)}
                                                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                            >
                                                Delete
                                            </button>
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
                                    radius={5}
                                    pathOptions={{
                                        color: "orange",
                                        fillColor: "orange",
                                        fillOpacity: 1,
                                    }}
                                    draggable={false}
                                    eventHandlers={{
                                        mousedown: (e) => {
                                            if (e.originalEvent.button === 2) {
                                                L.DomEvent.preventDefault(e);
                                                setDraggingVertexIndex(index);
                                                console.log(`Started right-click dragging vertex ${index}`);
                                            }
                                        },
                                    }}
                                />
                            ))}
                        <MapClickHandler />
                    </MapContainer>
                </div>

                {/* Input Form Section */}
                {isAdding && (
                    <div className="w-full lg:w-1/4 bg-gray-100 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingPolygonId ? "Edit Road Project" : "New Road Project"}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Project Title</label>
                                <input
                                    type="text"
                                    placeholder="Enter project title"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    placeholder="Enter project description"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Project Type</label>
                                <select
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="blue">Small Project (Blue)</option>
                                    <option value="green">Eco-Friendly Project (Green)</option>
                                    <option value="red">Big/Heavy Project (Red)</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={editingPolygonId ? handleSaveEdit : handleAddPolygon}
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                                >
                                    {editingPolygonId ? "Save Changes" : "Save Project"}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legends Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Shortcut Legends */}
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2">Keyboard Shortcuts</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li><strong>Left Click:</strong> Add a new point</li>
                        <li><strong>Right Click:</strong> Move a point</li>
                        <li><strong>Ctrl + Z:</strong> Undo last point</li>
                        <li><strong>Ctrl + Y:</strong> Redo last point</li>
                        <li><strong>Ctrl + X:</strong> Delete last point</li>
                        <li><strong>Middle Mouse Scroll:</strong> Zoom in/out</li>
                        <li><strong>Middle Mouse Hold:</strong> Drag map</li>
                    </ul>
                </div>

                {/* Color Legends */}
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold mb-2">Color Legends</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                        <li className="flex items-center">
                            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                            Small Projects
                        </li>
                        <li className="flex items-center">
                            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                            Eco-Friendly Projects
                        </li>
                        <li className="flex items-center">
                            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                            Big/Heavy Projects
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminSMP;
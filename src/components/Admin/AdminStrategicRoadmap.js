import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Popup, Polyline, useMapEvents, CircleMarker, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../../index.css";
import { FaTimes, FaMapMarkedAlt, FaUndo, FaRedo, FaTrash, FaSave, FaBan, FaHeading, FaAlignLeft, FaTag, FaMap } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../supabaseClient";

const AdminStrategicRoadmap = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [roads, setRoads] = useState([]);
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
    const [isAdmin, setIsAdmin] = useState(false);
    const maxDistance = 0.001; // ~100 meters in lat/lng degrees
    const modalRef = useRef(null);

    const [filterTitle, setFilterTitle] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterColor, setFilterColor] = useState("");
    const fullDetailsModalRef = useRef(null);
    const [isFullDetailsModalOpen, setIsFullDetailsModalOpen] = useState(false);
    const [selectedFullDetailsRoad, setSelectedFullDetailsRoad] = useState(null);



    // Check if user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from("user_roles")
                    .select("role_id")
                    .eq("user_id", user.id)
                    .single();
                if (error) {
                    console.error("Error checking user_roles:", error);
                    return;
                }
                if (data) {
                    const { data: roleData, error: roleError } = await supabase
                        .from("roles")
                        .select("name")
                        .eq("id", data.role_id)
                        .eq("name", "admin")
                        .single();
                    if (roleError) {
                        console.error("Error checking roles:", roleError);
                        return;
                    }
                    setIsAdmin(!!roleData);
                }
            }
        };
        checkAdmin();
    }, []);

    // Close modal on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (fullDetailsModalRef.current && fullDetailsModalRef.current.contains(event.target)) {
                return;
            }
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
                setIsFullDetailsModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch roads from Supabase and set up real-time subscriptions
    useEffect(() => {
        // Initial fetch
        const fetchRoads = async () => {
            const { data, error } = await supabase.from("roads").select("*");
            if (error) {
                console.error("Error fetching roads:", error);
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to load roads!",
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                });
            } else {
                setRoads(data);
            }
        };
        fetchRoads();

        // Real-time subscriptions
        const subscription = supabase
            .channel("roads")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "roads" },
                (payload) => {
                    setRoads((prev) => [...prev, payload.new]);
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "roads" },
                (payload) => {
                    setRoads((prev) =>
                        prev.map((road) => (road.id === payload.new.id ? payload.new : road))
                    );
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "roads" },
                (payload) => {
                    setRoads((prev) => prev.filter((road) => road.id !== payload.old.id));
                }
            )
            .subscribe((status, error) => {
                if (status === "SUBSCRIBED") {
                    console.log("Subscribed to roads channel");
                } else if (error) {
                    console.error("Subscription error:", error);
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "error",
                        title: "Failed to subscribe to updates!",
                        showConfirmButton: false,
                        timer: 1500,
                        scrollbarPadding: false,
                    });
                }
            });

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(subscription).then(() => {
                console.log("Unsubscribed from roads channel");
            });
        };
    }, []);

    // Fetch address from Nominatim
    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        "User-Agent": "StrategicRoadmapApp/1.0 (contact: example@example.com)",
                    },
                }
            );
            const data = await response.json();
            return data.display_name || "Address not found";
        } catch (error) {
            console.error("Error fetching address:", error);
            return "Failed to fetch address";
        }
    };

    const filteredRoads = useMemo(() => {
        return roads.filter((road) => {
            const matchesTitle = road.title.toLowerCase().includes(filterTitle.toLowerCase());
            const matchesType = filterType ? road.type === filterType : true;
            const matchesColor = filterColor ? road.color === filterColor : true;
            return matchesTitle && matchesType && matchesColor;
        });
    }, [roads, filterTitle, filterType, filterColor]);

    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding && draggingVertexIndex === null && isAdmin) {
                    const clickedCoord = [e.latlng.lat, e.latlng.lng];
                    const newCoord = clickedCoord;
                    if (newRoadCoords.length > 0) {
                        const lastCoord = newRoadCoords[newRoadCoords.length - 1];
                        const distance = L.latLng(lastCoord).distanceTo(L.latLng(newCoord)) / 1000;
                        if (distance > maxDistance * 500) {
                            Swal.fire({
                                toast: true,
                                position: "top-end",
                                icon: "error",
                                title: `Point too far! Max distance is ~${maxDistance * 500000} meters.`,
                                showConfirmButton: false,
                                scrollbarPadding: false,
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
            if (!isAdding || !isAdmin) return;

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
        [actionHistory, redoHistory, isAdding, newRoadCoords, editingRoadId, isAdmin]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Add to useEffect for modal open/close handling in AdminStrategicRoadmap.js
    useEffect(() => {
        if (isModalOpen || isFullDetailsModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isModalOpen, isFullDetailsModalOpen]);

    const handleAddRoad = async () => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can add roads!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (newRoadCoords.length < 2) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A road must have at least 2 points!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newType) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide a title and type!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Saving Road...",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const startCoord = newRoadCoords[0];
            const endCoord = newRoadCoords[newRoadCoords.length - 1];
            const [startAddress, endAddress] = await Promise.all([
                fetchAddress(startCoord[0], startCoord[1]),
                fetchAddress(endCoord[0], endCoord[1]),
            ]);
            const { data, error } = await supabase
                .from("roads")
                .insert({
                    title: newTitle,
                    description: newDescription || null,
                    type: newType,
                    color: newColor,
                    coords: newRoadCoords,
                    start_address: startAddress,
                    end_address: endAddress,
                })
                .select()
                .single();
            if (error) throw error;
            setRoads([...roads, data]);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Road added successfully!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            resetForm();
        } catch (error) {
            console.error("Error adding road:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to save road!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
    };

    const handleDeleteRoad = async (id) => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can delete roads!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        // Show confirmation dialog
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to delete this road? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
            scrollbarPadding: false,
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase.from("roads").delete().eq("id", id);
                if (error) throw error;
                setRoads(roads.filter((road) => road.id !== id));
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Road deleted successfully!",
                    showConfirmButton: false,
                    scrollbarPadding: false,
                    timer: 1500,
                });
            } catch (error) {
                console.error("Error deleting road:", error);
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to delete road!",
                    showConfirmButton: false,
                    scrollbarPadding: false,
                    timer: 1500,
                });
            }
        }
    };

    const handleEditRoad = (id) => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can edit roads!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        setEditingRoadId(id);
        const roadToEdit = roads.find((r) => r.id === id);
        setNewRoadCoords(roadToEdit.coords);
        setActionHistory([]);
        setRedoHistory([]);
        setNewTitle(roadToEdit.title);
        setNewDescription(roadToEdit.description || "");
        setNewType(roadToEdit.type);
        setNewColor(roadToEdit.color);
        setIsAdding(true);
    };

    const handleSaveEdit = async () => {
        if (!isAdmin) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Only admins can edit roads!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (newRoadCoords.length < 2) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "A road must have at least 2 points!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }
        if (!newTitle || !newType) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide a title and type!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            return;
        }

        Swal.fire({
            title: "Saving Road...",
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            const startCoord = newRoadCoords[0];
            const endCoord = newRoadCoords[newRoadCoords.length - 1];
            const [startAddress, endAddress] = await Promise.all([
                fetchAddress(startCoord[0], startCoord[1]),
                fetchAddress(endCoord[0], endCoord[1]),
            ]);
            const { data, error } = await supabase
                .from("roads")
                .update({
                    title: newTitle,
                    description: newDescription || null,
                    type: newType,
                    color: newColor,
                    coords: newRoadCoords,
                    start_address: startAddress,
                    end_address: endAddress,
                })
                .eq("id", editingRoadId)
                .select()
                .single();
            if (error) throw error;
            setRoads(roads.map((road) => (road.id === editingRoadId ? data : road)));
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Road updated successfully!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
            resetForm();
        } catch (error) {
            console.error("Error updating road:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to update road!",
                showConfirmButton: false,
                scrollbarPadding: false,
                timer: 1500,
            });
        }
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
            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => !isAdding && isAdmin && setIsAdding(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${isAdding || !isAdmin ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    disabled={isAdding || !isAdmin}
                    whileHover={{ scale: isAdding || !isAdmin ? 1 : 1.05 }}
                    whileTap={{ scale: isAdding || !isAdmin ? 1 : 0.95 }}
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

            <div className="flex flex-col lg:flex-row gap-6">
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
                            <MapContainer
                                center={centerCoords}
                                zoom={17} // Increased zoom level for closer focus
                                style={{ height: "100%", width: "100%" }}
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
                                </LayersControl>
                                {roads.map((road) => (
                                    <Polyline key={road.id} positions={road.coords} pathOptions={getRoadStyle(road.color)}>
                                        <Popup>
                                            <div className="p-2">
                                                <h3 className="font-semibold">{road.title}</h3>
                                                <p>
                                                    <strong>Status:</strong> {road.type}
                                                </p>
                                                <p className="mt-2">{road.description || "No description provided"}</p>
                                                {isAdmin && (
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
                                                )}
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
                                                    if (e.originalEvent.button === 2 && isAdmin) {
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

                <AnimatePresence>
                    {isAdding && isAdmin && (
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
                            <form
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        editingRoadId ? handleSaveEdit() : handleAddRoad();
                                    }
                                }}
                            >
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
                                            placeholder="Enter road description (optional)"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            rows="4"
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
                                            type="button"
                                            onClick={editingRoadId ? handleSaveEdit : handleAddRoad}
                                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FaSave />
                                            {editingRoadId ? "Save Changes" : "Save Road"}
                                        </motion.button>
                                        <motion.button
                                            type="button"
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
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

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
                            ref={modalRef}
                            className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col"
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
                            {/* Filter Section */}
                            <div className="p-4 border-b">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
                                        <input
                                            type="text"
                                            placeholder="Enter road title"
                                            value={filterTitle}
                                            onChange={(e) => setFilterTitle(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Road Type</label>
                                        <select
                                            value={filterType}
                                            onChange={(e) => setFilterType(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">All Types</option>
                                            <option value="Concrete">Concrete</option>
                                            <option value="Improvement">Improvement</option>
                                            <option value="Widening">Widening</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                        <select
                                            value={filterColor}
                                            onChange={(e) => setFilterColor(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                            <option value="">All Colors</option>
                                            <option value="gray">Gray</option>
                                            <option value="yellow">Yellow</option>
                                            <option value="blue">Blue</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <motion.button
                                            onClick={() => {
                                                setFilterTitle("");
                                                setFilterType("");
                                                setFilterColor("");
                                            }}
                                            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <FaBan />
                                            Clear Filters
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                            {/* Roads Grid */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredRoads.length === 0 ? (
                                    <p className="text-gray-500 text-center">No roads match the filters.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredRoads.map((road) => (
                                            <motion.div
                                                key={road.id}
                                                className="bg-gray-50 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <div className="h-48 rounded-t-lg overflow-hidden">
                                                    <MapContainer
                                                        center={getRoadCenter(road.coords)}
                                                        zoom={15}
                                                        style={{ height: "100%", width: "100%" }}
                                                        scrollWheelZoom={false}
                                                        dragging={false}
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
                                                        </LayersControl>
                                                        <Polyline positions={road.coords} pathOptions={getRoadStyle(road.color)} />
                                                    </MapContainer>
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="text-lg font-semibold truncate">{road.title}</h3>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        <strong>Type:</strong> {road.type}
                                                    </p>
                                                    <div className="mt-3 flex gap-2 flex-wrap">
                                                        <motion.button
                                                            onClick={() => {
                                                                setSelectedFullDetailsRoad(road);
                                                                setIsFullDetailsModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaMap />
                                                            View Details
                                                        </motion.button>
                                                        {isAdmin && (
                                                            <>
                                                                <motion.button
                                                                    onClick={() => {
                                                                        handleEditRoad(road.id);
                                                                        setIsModalOpen(false);
                                                                    }}
                                                                    className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 text-sm"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <FaHeading />
                                                                    Edit
                                                                </motion.button>
                                                                <motion.button
                                                                    onClick={() => handleDeleteRoad(road.id)}
                                                                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <FaTrash />
                                                                    Delete
                                                                </motion.button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isFullDetailsModalOpen && selectedFullDetailsRoad && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={fullDetailsModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[60]"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaMap className="text-blue-600" />
                                    {selectedFullDetailsRoad.title}
                                </h2>
                                <motion.button
                                    onClick={() => setIsFullDetailsModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold mb-2">Road Map</h3>
                                    <div className="h-64 rounded-lg overflow-hidden">
                                        <MapContainer
                                            center={getRoadCenter(selectedFullDetailsRoad.coords)}
                                            zoom={15}
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
                                            </LayersControl>
                                            <Polyline positions={selectedFullDetailsRoad.coords} pathOptions={getRoadStyle(selectedFullDetailsRoad.color)} />
                                        </MapContainer>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Start Address:</p>
                                        <p className="text-sm text-gray-600">{selectedFullDetailsRoad.start_address || "Fetching address..."}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">End Address:</p>
                                        <p className="text-sm text-gray-600">{selectedFullDetailsRoad.end_address || "Fetching address..."}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Type:</p>
                                        <p className="text-sm text-gray-600">{selectedFullDetailsRoad.type}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                                    <p className="text-sm text-gray-600">{selectedFullDetailsRoad.description || "No description provided"}</p>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="p-4 border-t flex gap-2 flex-wrap">
                                    <motion.button
                                        onClick={() => {
                                            handleEditRoad(selectedFullDetailsRoad.id);
                                            setIsModalOpen(false);
                                            setIsFullDetailsModalOpen(false);
                                        }}
                                        className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaHeading />
                                        Edit
                                    </motion.button>
                                    <motion.button
                                        onClick={() => handleDeleteRoad(selectedFullDetailsRoad.id)}
                                        className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaTrash />
                                        Delete
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminStrategicRoadmap;
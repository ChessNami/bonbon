import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Popup, Polyline, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaTimes, FaMap, FaTag, FaInfoCircle, FaBan } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const StrategicRoadMapView = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [roads, setRoads] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRoad, setSelectedRoad] = useState(null);
    const [filterTitle, setFilterTitle] = useState("");
    const [filterType, setFilterType] = useState("");
    const [filterColor, setFilterColor] = useState("");
    const modalRef = useRef(null);
    const detailModalRef = useRef(null);

    // Fetch roads from Supabase and set up real-time subscriptions
    useEffect(() => {
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
                });
            } else {
                setRoads(data);
            }
        };
        fetchRoads();

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
                    });
                }
            });

        return () => {
            supabase.removeChannel(subscription).then(() => {
                console.log("Unsubscribed from roads channel");
            });
        };
    }, []);

    // Close modals on outside click with proper nesting
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close Details Modal (higher level)
            if (
                detailModalRef.current &&
                !detailModalRef.current.contains(event.target) &&
                isDetailModalOpen
            ) {
                setIsDetailModalOpen(false);
                return;
            }
            // Close All Roads Modal (base level)
            if (
                modalRef.current &&
                !modalRef.current.contains(event.target) &&
                isModalOpen &&
                !isDetailModalOpen
            ) {
                setIsModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isModalOpen, isDetailModalOpen]);

    // Modal open/close scroll lock
    useEffect(() => {
        if (isModalOpen || isDetailModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isModalOpen, isDetailModalOpen]);

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

    // Handle "View Details" click
    const handleViewDetails = (road) => {
        setSelectedRoad(road);
        setIsDetailModalOpen(true);
    };

    // Filtered roads based on filter inputs
    const filteredRoads = useMemo(() => {
        return roads.filter((road) => {
            const matchesTitle = road.title.toLowerCase().includes(filterTitle.toLowerCase());
            const matchesType = filterType ? road.type === filterType : true;
            const matchesColor = filterColor ? road.color === filterColor : true;
            return matchesTitle && matchesType && matchesColor;
        });
    }, [roads, filterTitle, filterType, filterColor]);

    return (
        <div className="p-4 mx-auto">
            <div className="flex flex-wrap gap-3 mb-6">
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

            <div className="flex flex-col gap-6">
                <motion.div
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden relative z-0"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <MapContainer center={centerCoords} zoom={16} style={{ height: "100%", width: "100%", zIndex: 0 }}>
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
                                    <div className="p-2 w-64">
                                        <h3 className="font-semibold">{road.title}</h3>
                                        <p>
                                            <strong>Status:</strong> {road.type}
                                        </p>
                                        <p>
                                            <strong>Start Address:</strong> {road.start_address || "Fetching address..."}
                                        </p>
                                        <p>
                                            <strong>End Address:</strong> {road.end_address || "Fetching address..."}
                                        </p>
                                        <p className="mt-2">{road.description || "No description provided"}</p>
                                        <button
                                            onClick={() => handleViewDetails(road)}
                                            className="text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                        >
                                            <FaInfoCircle /> View Details
                                        </button>
                                    </div>
                                </Popup>
                            </Polyline>
                        ))}
                    </MapContainer>
                </motion.div>

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

            {/* Modal for All Roads */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col z-[100]"
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
                                    <div className="flex-1 flex items-end min-w-[150px]">
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
                                                        style={{ height: "100%", width: "100%", zIndex: 0 }}
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
                                                    <div className="mt-3">
                                                        <motion.button
                                                            onClick={() => handleViewDetails(road)}
                                                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <FaInfoCircle />
                                                            View Details
                                                        </motion.button>
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

            {/* Modal for Road Details */}
            <AnimatePresence>
                {isDetailModalOpen && selectedRoad && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={detailModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[200]"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaInfoCircle className="text-blue-600" />
                                    {selectedRoad.title}
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
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold mb-2">Road Map</h3>
                                    <div className="h-64 rounded-lg overflow-hidden">
                                        <MapContainer
                                            center={getRoadCenter(selectedRoad.coords)}
                                            zoom={15}
                                            style={{ height: "100%", width: "100%", zIndex: 0 }}
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
                                            <Polyline positions={selectedRoad.coords} pathOptions={getRoadStyle(selectedRoad.color)} />
                                        </MapContainer>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Start Address:</p>
                                        <p className="text-sm text-gray-600">{selectedRoad.start_address || "Fetching address..."}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">End Address:</p>
                                        <p className="text-sm text-gray-600">{selectedRoad.end_address || "Fetching address..."}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Type:</p>
                                        <p className="text-sm text-gray-600">{selectedRoad.type}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                                    <p className="text-sm text-gray-600">{selectedRoad.description || "No description provided"}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default StrategicRoadMapView;
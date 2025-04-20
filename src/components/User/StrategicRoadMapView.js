import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Popup, Polyline, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaTimes, FaMap, FaTag } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../supabaseClient";

const StrategicRoadMapView = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [roads, setRoads] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                                        <p className="mt-2">{road.description || "No description provided"}</p>
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
                                            <p className="text-sm text-gray-600 mt-2">
                                                <strong>Description:</strong> {road.description || "No description provided"}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-2">
                                                <strong>Start Address:</strong> {road.start_address || "Fetching address..."}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-2">
                                                <strong>End Address:</strong> {road.end_address || "Fetching address..."}
                                            </p>
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

export default StrategicRoadMapView;
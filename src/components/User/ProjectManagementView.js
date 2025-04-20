import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Popup, Polygon, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaTimes, FaMap, FaTag, FaInfoCircle, FaImage } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../supabaseClient";

const ProjectManagementView = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [polygons, setPolygons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
    const [expandedImages, setExpandedImages] = useState({});
    const modalRef = useRef(null);
    const imageModalRef = useRef(null);

    // Number formatting utility
    const formatNumberWithCommas = (number) => {
        if (!number) return "";
        return Number(number.replace(/[^0-9.-]+/g, "")).toLocaleString("en-PH");
    };

    // Fetch projects from Supabase
    useEffect(() => {
        const fetchProjects = async () => {
            const { data, error } = await supabase.from("projects").select("*");
            if (error) {
                console.error("Error fetching projects:", error);
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to fetch projects!",
                    showConfirmButton: false,
                    scrollbarPadding: false,
                    timer: 1500,
                });
                return;
            }
            setPolygons(data);
        };
        fetchProjects();
    }, []);

    // Close modals on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (imageModalRef.current && imageModalRef.current.contains(event.target)) {
                return;
            }
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
                setIsImageModalOpen(false);
                setIsDetailModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate polygon center for map centering
    const getPolygonCenter = (coords) => {
        const lat = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
        const lng = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
        return [lat, lng];
    };

    // Tile error handler component
    const TileErrorHandler = () => {
        const map = useMap();

        useEffect(() => {
            map.invalidateSize();
            map.on("tileerror", (e) => {
                console.error("Tile loading error:", e);
                const tileUrl = e.tile.src.split("?")[0];
                e.tile.src = `${tileUrl}?retry=${Date.now()}`;
            });
            return () => {
                map.off("tileerror");
            };
        }, [map]);
        return null;
    };

    // Polygon styling
    const getPolygonStyle = (color, status) => {
        const baseStyle =
            {
                Satisfactory: { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 },
                "With Serious Deficiencies": { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 },
                "With Minor Deficiencies": { fillColor: "rgba(255, 165, 0, 0.5)", color: "orange", weight: 2 },
            }[color] || { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };

        return {
            ...baseStyle,
            dashArray: status === "Completed" ? "5, 5" : status === "In Progress" ? "10, 10" : null,
        };
    };

    // Handle "See more..." click
    const handleSeeMore = (polygon) => {
        setSelectedPolygon(polygon);
        setIsDetailModalOpen(true);
    };

    // Handle image click for larger view
    const handleImageClick = (image) => {
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    // Toggle images expansion
    const toggleImages = (polygonId) => {
        setExpandedImages((prev) => ({
            ...prev,
            [polygonId]: !prev[polygonId],
        }));
    };

    return (
        <div className="p-4 mx-auto">
            {/* Buttons Section */}
            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaMap />
                    View All Projects
                </motion.button>
            </div>

            {/* Main Content Section */}
            <div className="flex flex-col gap-6">
                {/* Map Section */}
                <motion.div
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden relative z-10"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <MapContainer
                        center={bonbonCoords}
                        zoom={15}
                        maxZoom={19}
                        style={{ height: "100%", width: "100%", zIndex: 10 }}
                    >
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="Street Map">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    maxZoom={19}
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite">
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                    maxZoom={20}
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Terrain">
                                <TileLayer
                                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                    attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                    maxZoom={17}
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Grayscale">
                                <TileLayer
                                    url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                    attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    maxZoom={20}
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>
                        {polygons.map((polygon) => (
                            <Polygon
                                key={polygon.id}
                                positions={polygon.coords}
                                pathOptions={getPolygonStyle(polygon.color, polygon.update_status)}
                            >
                                <Popup>
                                    <div className="p-2 w-64">
                                        <h3 className="font-semibold">{polygon.title}</h3>
                                        <p>
                                            <strong>Location:</strong> {polygon.location}
                                        </p>
                                        <p>
                                            <strong>Contractor:</strong> {polygon.contractor}
                                        </p>
                                        <p>
                                            <strong>Contract Payment:</strong> ₱
                                            {formatNumberWithCommas(polygon.contract_payment)}
                                        </p>
                                        <p>
                                            <strong>Update Status:</strong> {polygon.update_status}
                                        </p>
                                        <p>
                                            <strong>Completion:</strong> {polygon.completion_rate || 0}%
                                        </p>
                                        <p>
                                            <strong>Date Monitoring:</strong> {polygon.date_monitoring_start} to{" "}
                                            {polygon.date_monitoring_end}
                                        </p>
                                        <p>
                                            <strong>Issues:</strong> {polygon.issues || "None"}
                                        </p>
                                        <p>
                                            <strong>Project Engineer:</strong> {polygon.project_engineer}
                                        </p>
                                        <button
                                            onClick={() => handleSeeMore(polygon)}
                                            className="text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                        >
                                            <FaInfoCircle /> See more...
                                        </button>
                                    </div>
                                </Popup>
                            </Polygon>
                        ))}
                        <TileErrorHandler />
                    </MapContainer>
                </motion.div>

                {/* Legends Section */}
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

            {/* Modal for All Projects */}
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
                            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col z-50"
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
                                    <p className="text-gray-500 text-center">No projects available.</p>
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
                                                <strong>Location:</strong> {polygon.location}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Contractor:</strong> {polygon.contractor}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Contract Payment:</strong> ₱
                                                {formatNumberWithCommas(polygon.contract_payment)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Update Status:</strong> {polygon.update_status}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Completion:</strong> {polygon.completion_rate || 0}%
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Date Monitoring:</strong> {polygon.date_monitoring_start} to{" "}
                                                {polygon.date_monitoring_end}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Issues:</strong> {polygon.issues || "None"}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <strong>Project Engineer:</strong> {polygon.project_engineer}
                                            </p>
                                            <div className="mt-2">
                                                <motion.button
                                                    onClick={() => toggleImages(polygon.id)}
                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <FaImage />
                                                    {expandedImages[polygon.id]
                                                        ? "Hide Images"
                                                        : `Show Images (${polygon.images?.length || 0})`}
                                                </motion.button>
                                                <AnimatePresence>
                                                    {expandedImages[polygon.id] && polygon.images?.length > 0 && (
                                                        <motion.div
                                                            className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            {polygon.images.map((image, index) => (
                                                                <img
                                                                    key={index}
                                                                    src={image}
                                                                    alt={`Project ${index}`}
                                                                    className="w-full h-32 object-cover rounded cursor-pointer"
                                                                    onClick={() => handleImageClick(image)}
                                                                />
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="mt-4 h-64 rounded-lg overflow-hidden relative z-10">
                                                <MapContainer
                                                    center={getPolygonCenter(polygon.coords)}
                                                    zoom={16}
                                                    maxZoom={19}
                                                    style={{ height: "100%", width: "100%", zIndex: 10 }}
                                                    scrollWheelZoom={false}
                                                >
                                                    <LayersControl position="topright">
                                                        <LayersControl.BaseLayer checked name="Street Map">
                                                            <TileLayer
                                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                                maxZoom={19}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Satellite">
                                                            <TileLayer
                                                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                                attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                                                                maxZoom={20}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Terrain">
                                                            <TileLayer
                                                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                                                attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                                                maxZoom={17}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                        <LayersControl.BaseLayer name="Grayscale">
                                                            <TileLayer
                                                                url="https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png"
                                                                attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                                maxZoom={20}
                                                            />
                                                        </LayersControl.BaseLayer>
                                                    </LayersControl>
                                                    <Polygon
                                                        positions={polygon.coords}
                                                        pathOptions={getPolygonStyle(polygon.color, polygon.update_status)}
                                                    />
                                                    <TileErrorHandler />
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

            {/* Modal for Detailed View */}
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
                            className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col z-50"
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
                                    <p className="text-sm font-medium text-gray-700 mb-1">Images:</p>
                                    {selectedPolygon.images?.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {selectedPolygon.images.map((image, index) => (
                                                <img
                                                    key={index}
                                                    src={image}
                                                    alt={`Project ${index}`}
                                                    className="w-full h-24 object-cover rounded cursor-pointer"
                                                    onClick={() => handleImageClick(image)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No images available</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        Full Description (Issues):
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {selectedPolygon.issues || "No issues reported"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Larger Image View */}
            <AnimatePresence>
                {isImageModalOpen && selectedImage && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={imageModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[1000]"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaImage className="text-blue-600" />
                                    Image Preview
                                </h2>
                                <motion.button
                                    onClick={() => setIsImageModalOpen(false)}
                                    className="text-gray-600 hover:text-gray-800"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={24} />
                                </motion.button>
                            </div>
                            <div className="flex-1 p-4 flex items-center justify-center">
                                <img
                                    src={selectedImage}
                                    alt="Large Preview"
                                    className="max-w-full max-h-[70vh] object-contain rounded"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectManagementView;
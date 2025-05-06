import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Popup, Polygon, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FaTimes, FaMap, FaTag, FaInfoCircle, FaImage } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import { supabase } from "../../../../supabaseClient";
import PhoneFilters from "./PhoneFilters";
import FullFilters from "./FullFilters";

const ProjectManagementView = () => {
    const bonbonCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [polygons, setPolygons] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPolygon, setSelectedPolygon] = useState(null);
    const [filterTitle, setFilterTitle] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterColor, setFilterColor] = useState("");
    const [filterCompletionMin, setFilterCompletionMin] = useState("");
    const [filterCompletionMax, setFilterCompletionMax] = useState("");
    const [filterDateStart, setFilterDateStart] = useState("");
    const [filterDateEnd, setFilterDateEnd] = useState("");
    const modalRef = useRef(null);
    const fullDetailsModalRef = useRef(null);
    const imageModalRef = useRef(null);

    // Number formatting utility
    const formatNumberWithCommas = (number) => {
        if (!number) return "";
        return Number(number.replace(/[^0-9.-]+/g, "")).toLocaleString("en-PH");
    };

    // Fetch projects from Supabase and prefetch signed image URLs
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

            // Prefetch signed URLs for images
            const updatedProjects = await Promise.all(
                data.map(async (project) => {
                    let signedImageUrls = [];
                    if (project.images && project.images.length > 0) {
                        signedImageUrls = await Promise.all(
                            project.images.map(async (imageUrl) => {
                                const filePath = imageUrl.split("/project-images/")[1];
                                const { data: signedData, error: signedError } = await supabase.storage
                                    .from("project-images")
                                    .createSignedUrl(filePath, 7200);
                                if (signedError) {
                                    console.error("Error creating signed URL:", signedError);
                                    return imageUrl;
                                }
                                return signedData.signedUrl;
                            })
                        );
                    }
                    return { ...project, images: signedImageUrls };
                })
            );

            setPolygons(updatedProjects);
        };
        fetchProjects();
    }, []);

    // Close modals on outside click with proper nesting
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close Image Modal (highest level)
            if (imageModalRef.current && !imageModalRef.current.contains(event.target) && isImageModalOpen) {
                setIsImageModalOpen(false);
                return;
            }
            // Close Details Modal (middle level)
            if (
                fullDetailsModalRef.current &&
                !fullDetailsModalRef.current.contains(event.target) &&
                isDetailModalOpen &&
                !isImageModalOpen
            ) {
                setIsDetailModalOpen(false);
                return;
            }
            // Close All Projects Modal (base level)
            if (
                modalRef.current &&
                !modalRef.current.contains(event.target) &&
                isModalOpen &&
                !isDetailModalOpen &&
                !isImageModalOpen
            ) {
                setIsModalOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isModalOpen, isDetailModalOpen, isImageModalOpen]);

    // Disable page scroll when any modal is open
    useEffect(() => {
        if (isModalOpen || isDetailModalOpen || isImageModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        };
    }, [isModalOpen, isDetailModalOpen, isImageModalOpen]);

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
                "With Minor Deficiencies": { fillColor: "rgba(255, 165, 0, 0.5)", color: "orange", weight: 2 },
                "With Serious Deficiencies": { fillColor: "rgba(255, 0, 0, 0.5)", color: "red", weight: 2 },
            }[color] || { fillColor: "rgba(0, 123, 255, 0.5)", color: "blue", weight: 2 };

        const statusStyle = {
            Planned: { color: "blue", dashArray: null },
            "In Progress": { color: "orange", dashArray: "10, 10" },
            Completed: { color: "green", dashArray: "5, 5" },
            Terminated: { color: "red", dashArray: "3, 10" },
            Cancelled: { color: "gray", dashArray: "15, 5" },
        }[status] || { color: "blue", dashArray: null };

        return { ...baseStyle, color: statusStyle.color, dashArray: statusStyle.dashArray };
    };

    // Handle "View Details" click
    const handleViewDetails = (polygon) => {
        setSelectedPolygon(polygon);
        setIsDetailModalOpen(true);
    };

    // Handle image click for larger view
    const handleImageClick = (image) => {
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    // Filtered polygons based on filter inputs
    const filteredPolygons = useMemo(() => {
        return polygons.filter((polygon) => {
            const matchesTitle = polygon.title.toLowerCase().includes(filterTitle.toLowerCase());
            const matchesStatus = filterStatus ? polygon.update_status === filterStatus : true;
            const matchesColor = filterColor ? polygon.color === filterColor : true;
            const matchesCompletion =
                (filterCompletionMin === "" || (polygon.completion_rate || 0) >= Number(filterCompletionMin)) &&
                (filterCompletionMax === "" || (polygon.completion_rate || 0) <= Number(filterCompletionMax));
            const matchesDate =
                (filterDateStart === "" || polygon.date_monitoring_start >= filterDateStart) &&
                (filterDateEnd === "" || polygon.date_monitoring_end <= filterDateEnd);
            return matchesTitle && matchesStatus && matchesColor && matchesCompletion && matchesDate;
        });
    }, [
        polygons,
        filterTitle,
        filterStatus,
        filterColor,
        filterCompletionMin,
        filterCompletionMax,
        filterDateStart,
        filterDateEnd,
    ]);

    return (
        <div className="p-6 mx-auto container max-w-7xl">
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
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden relative z-0"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <MapContainer
                        center={bonbonCoords}
                        zoom={17}
                        maxZoom={19}
                        style={{ height: "100%", width: "100%", zIndex: 0 }}
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
                                            onClick={() => handleViewDetails(polygon)}
                                            className="text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                        >
                                            <FaInfoCircle /> View Details
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
                    <h3 className="text-base font-semibold mb-3 flex items-center gap redefine-2">
                        <FaTag className="text-blue-600 mr-2" />
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
                            <div className="w-4 h-4 border-2 border-orange-500 border-dashed"></div> In Progress
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-green-500 border-dotted"></div> Completed
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-red-500" style={{ borderStyle: "dashed", borderDashOffset: "3, 10" }}></div> Terminated
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-gray-500" style={{ borderStyle: "dashed", borderDashOffset: "15, 5" }}></div> Cancelled
                        </li>
                    </ul>
                </div>
            </div>

            {/* Modal for All Projects */}
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
                            className="bg-white rounded-lg w-full h-full max-w-6xl flex flex-col z-[100] overflow-hidden"
                            initial={{ scale: 0.95, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* Header */}
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

                            {/* Scrollable Content Area */}
                            {/* Filters */}
                            <PhoneFilters
                                filterTitle={filterTitle}
                                setFilterTitle={setFilterTitle}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                filterColor={filterColor}
                                setFilterColor={setFilterColor}
                                filterCompletionMin={filterCompletionMin}
                                setFilterCompletionMin={setFilterCompletionMin}
                                filterCompletionMax={filterCompletionMax}
                                setFilterCompletionMax={setFilterCompletionMax}
                                filterDateStart={filterDateStart}
                                setFilterDateStart={setFilterDateStart}
                                filterDateEnd={filterDateEnd}
                                setFilterDateEnd={setFilterDateEnd}
                            />
                            <FullFilters
                                filterTitle={filterTitle}
                                setFilterTitle={setFilterTitle}
                                filterStatus={filterStatus}
                                setFilterStatus={setFilterStatus}
                                filterColor={filterColor}
                                setFilterColor={setFilterColor}
                                filterCompletionMin={filterCompletionMin}
                                setFilterCompletionMin={setFilterCompletionMin}
                                filterCompletionMax={filterCompletionMax}
                                setFilterCompletionMax={setFilterCompletionMax}
                                filterDateStart={filterDateStart}
                                setFilterDateStart={setFilterDateStart}
                                filterDateEnd={filterDateEnd}
                                setFilterDateEnd={setFilterDateEnd}
                            />

                            <div className="flex-1 overflow-y-auto p-4">

                                {/* Projects Grid */}
                                {filteredPolygons.length === 0 ? (
                                    <p className="text-gray-500 text-center">No projects match the filters.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredPolygons.map((polygon) => (
                                            <motion.div
                                                key={polygon.id}
                                                className="bg-gray-50 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <div className="h-48 rounded-t-lg overflow-hidden">
                                                    <MapContainer
                                                        center={getPolygonCenter(polygon.coords)}
                                                        zoom={17}
                                                        maxZoom={19}
                                                        style={{ height: "100%", width: "100%", zIndex: 0 }}
                                                        scrollWheelZoom={false}
                                                    >
                                                        <LayersControl position="topright">
                                                            <LayersControl.BaseLayer checked name="Street Map">
                                                                <TileLayer
                                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                                    maxZoom={19}
                                                                />
                                                            </LayersControl.BaseLayer>
                                                            <LayersControl.BaseLayer name="Satellite">
                                                                <TileLayer
                                                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                                                    attribution='Tiles © Esri, USGS, etc.'
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
                                                <div className="p-4">
                                                    <h3 className="text-lg font-semibold truncate">{polygon.title}</h3>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        <strong>Status:</strong> {polygon.update_status}
                                                    </p>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        <strong>Completion:</strong> {polygon.completion_rate || 0}%
                                                    </p>
                                                    <div className="mt-3">
                                                        <motion.button
                                                            onClick={() => handleViewDetails(polygon)}
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

            {/* Modal for Full Details */}
            <AnimatePresence>
                {isDetailModalOpen && selectedPolygon && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={fullDetailsModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[200]"
                            initial={{ scale: 0.8, y: 50 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 50 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <FaInfoCircle className="text-blue-600" />
                                    {selectedPolygon.title}
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
                                    <h3 className="text-lg font-semibold mb-2">Project Map</h3>
                                    <div className="h-64 rounded-lg overflow-hidden">
                                        <MapContainer
                                            center={getPolygonCenter(selectedPolygon.coords)}
                                            zoom={17}
                                            maxZoom={19}
                                            style={{ height: "100%", width: "100%", zIndex: 0 }}
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
                                            </LayersControl>
                                            <Polygon
                                                positions={selectedPolygon.coords}
                                                pathOptions={getPolygonStyle(selectedPolygon.color, selectedPolygon.update_status)}
                                            />
                                            <TileErrorHandler />
                                        </MapContainer>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Location:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.location}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Contractor:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.contractor}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Contract Payment:</p>
                                        <p className="text-sm text-gray-600">₱{formatNumberWithCommas(selectedPolygon.contract_payment)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Update Status:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.update_status}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Completion:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.completion_rate || 0}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Date Monitoring:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.date_monitoring_start} to {selectedPolygon.date_monitoring_end}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Project Engineer:</p>
                                        <p className="text-sm text-gray-600">{selectedPolygon.project_engineer}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Issues:</p>
                                    <p className="text-sm text-gray-600">{selectedPolygon.issues || "None"}</p>
                                </div>
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
                                        <p className="text-sm text-gray-600 italic">No images available</p>
                                    )}
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
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[300]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            ref={imageModalRef}
                            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col z-[300]"
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
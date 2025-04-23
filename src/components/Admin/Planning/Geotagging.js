import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    FaMapMarkerAlt, FaSave, FaBan, FaBuilding, FaStore, FaSchool, FaHospital, FaHotel, FaHeading, FaTrash,
    FaChurch, FaShoppingBasket, FaClinicMedical
} from "react-icons/fa";
import { MdAccountBalance, MdSportsBasketball, MdDirectionsBus } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import ReactDOMServer from "react-dom/server";
import { supabase } from "../../../supabaseClient";

// Custom DivIcon for Markers with Name Label
const getCustomIcon = (icon, name) => {
    return L.divIcon({
        className: "custom-marker",
        html: `
            <div class="marker-container">
                <div class="marker-icon" style="font-size: 24px; color: #e53e3e;">${icon}</div>
                <div class="marker-label">${name}</div>
            </div>
        `,
        iconSize: [100, 50],
        iconAnchor: [50, 50],
        popupAnchor: [0, -40],
    });
};

const establishmentTypes = [
    { type: "Office", icon: '<FaBuilding />', color: "#3182ce", description: "Business or corporate office" },
    { type: "Shop", icon: '<FaStore />', color: "#38a169", description: "Retail or small business shop" },
    { type: "School", icon: '<FaSchool />', color: "#d69e2e", description: "Educational institution" },
    { type: "Hospital", icon: '<FaHospital />', color: "#e53e3e", description: "Medical facility" },
    { type: "Hotel", icon: '<FaHotel />', color: "#805ad5", description: "Lodging or accommodation" },
    { type: "Barangay Hall", icon: '<MdAccountBalance />', color: "#2c5282", description: "Local barangay government office" },
    { type: "Church", icon: '<FaChurch />', color: "#9f7aea", description: "Place of worship" },
    { type: "Public Market", icon: '<FaShoppingBasket />', color: "#ed8936", description: "Community trading hub" },
    { type: "Public Transport Hub", icon: '<MdDirectionsBus />', color: "#4a5568", description: "Terminal for jeepneys, buses, tricycles" },
    { type: "Municipal Hall", icon: '<MdAccountBalance />', color: "#2d3748", description: "Town or city government center" },
    { type: "Basketball Court", icon: '<MdSportsBasketball />', color: "#f56565", description: "Community sports facility" },
    { type: "Health Center", icon: '<FaClinicMedical />', color: "#48bb78", description: "Barangay-level clinic" },
];

const Geotagging = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [markers, setMarkers] = useState([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newMarkerCoord, setNewMarkerCoord] = useState(null);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("Office");

    // Fetch markers from Supabase
    useEffect(() => {
        const fetchMarkers = async () => {
            const { data, error } = await supabase
                .from("markers")
                .select("*");
            if (error) {
                console.error("Error fetching markers:", error);
            } else {
                setMarkers(data);
            }
        };
        fetchMarkers();
    }, []);

    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        "User-Agent": "GeotaggingApp/1.0 (contact: your-email@example.com)",
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

    const MapClickHandler = () => {
        const map = useMapEvents({
            click(e) {
                if (isAdding) {
                    const clickedCoord = [e.latlng.lat, e.latlng.lng];
                    setNewMarkerCoord(clickedCoord);
                    map.panTo(clickedCoord, { animate: true, duration: 0.5 });
                }
            },
        });
        return null;
    };

    const handleAddMarker = async () => {
        if (!newMarkerCoord) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please select a location on the map!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        if (!newName) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please provide the establishment name!",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }
        const address = await fetchAddress(newMarkerCoord[0], newMarkerCoord[1]);
        const newMarker = {
            coord: newMarkerCoord,
            name: newName,
            type: newType,
            address,
        };
        const { data, error } = await supabase
            .from("markers")
            .insert([newMarker])
            .select();
        if (error) {
            console.error("Error adding marker:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to add marker!",
                showConfirmButton: false,
                timer: 1500,
            });
        } else {
            setMarkers([...markers, data[0]]);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Marker added successfully!",
                showConfirmButton: false,
                timer: 1500,
            });
            resetForm();
        }
    };

    const handleDeleteMarker = async (id) => {
        const { error } = await supabase
            .from("markers")
            .delete()
            .eq("id", id);
        if (error) {
            console.error("Error deleting marker:", error);
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to delete marker!",
                showConfirmButton: false,
                timer: 1500,
            });
        } else {
            setMarkers(markers.filter((marker) => marker.id !== id));
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Marker deleted successfully!",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    };

    const resetForm = () => {
        setNewMarkerCoord(null);
        setNewName("");
        setNewType("Office");
        setIsAdding(false);
    };

    return (
        <div className="p-4 mx-auto">
            <div className="flex flex-wrap gap-3 mb-6">
                <motion.button
                    onClick={() => !isAdding && setIsAdding(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${isAdding ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    disabled={isAdding}
                    whileHover={{ scale: isAdding ? 1 : 1.05 }}
                    whileTap={{ scale: isAdding ? 1 : 0.95 }}
                >
                    <FaMapMarkerAlt />
                    Add Establishment Marker
                </motion.button>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
                <motion.div
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
                            </LayersControl>
                            {markers.map((marker) => (
                                <Marker
                                    key={marker.id}
                                    position={marker.coord}
                                    icon={getCustomIcon(ReactDOMServer.renderToString(getIconByType(marker.type)), marker.name)}
                                >
                                    <Popup>
                                        <MarkerPopup marker={marker} handleDeleteMarker={handleDeleteMarker} />
                                    </Popup>
                                </Marker>
                            ))}
                            {newMarkerCoord && isAdding && (
                                <Marker
                                    position={newMarkerCoord}
                                    icon={getCustomIcon(ReactDOMServer.renderToString(getIconByType(newType)), newName || "New Marker")}
                                />
                            )}
                            <MapClickHandler />
                        </MapContainer>
                    </motion.div>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-blue-600" />
                            Map Legend
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {establishmentTypes.map((est) => (
                                <div key={est.type} className="flex items-center gap-2">
                                    <div className="text-2xl">{React.createElement(getIconByType(est.type).type, { style: { color: est.color } })}</div>
                                    <div>
                                        <p className="font-medium">{est.type}</p>
                                        <p className="text-sm text-gray-600">{est.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            className="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-lg"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-blue-600" />
                                New Establishment Marker
                            </h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddMarker(); }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaHeading className="text-gray-500" />
                                        Establishment Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter establishment name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <FaBuilding className="text-gray-500" />
                                        Establishment Type
                                    </label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {establishmentTypes.map((est) => (
                                            <option key={est.type} value={est.type}>
                                                {est.type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <motion.button
                                        type="submit"
                                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaSave />
                                        Save Marker
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
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// Popup component to display pre-fetched address
const MarkerPopup = ({ marker, handleDeleteMarker }) => {
    return (
        <div className="p-2">
            <h3 className="font-semibold flex items-center gap-2">
                {React.createElement(getIconByType(marker.type).type, { style: { color: establishmentTypes.find(est => est.type === marker.type).color } })}
                {marker.name}
            </h3>
            <p className="mt-2">
                <strong>Type:</strong> {marker.type}
            </p>
            <p className="mt-2">
                <strong>Address:</strong> {marker.address}
            </p>
            <motion.button
                onClick={() => handleDeleteMarker(marker.id)}
                className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 mt-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <FaTrash />
                Delete
            </motion.button>
        </div>
    );
};

const getIconByType = (type) => {
    const establishment = establishmentTypes.find((est) => est.type === type);
    switch (type) {
        case "Office":
            return <FaBuilding style={{ color: establishment.color }} />;
        case "Shop":
            return <FaStore style={{ color: establishment.color }} />;
        case "School":
            return <FaSchool style={{ color: establishment.color }} />;
        case "Hospital":
            return <FaHospital style={{ color: establishment.color }} />;
        case "Hotel":
            return <FaHotel style={{ color: establishment.color }} />;
        case "Barangay Hall":
            return <MdAccountBalance style={{ color: establishment.color }} />;
        case "Church":
            return <FaChurch style={{ color: establishment.color }} />;
        case "Public Market":
            return <FaShoppingBasket style={{ color: establishment.color }} />;
        case "Public Transport Hub":
            return <MdDirectionsBus style={{ color: establishment.color }} />;
        case "Municipal Hall":
            return <MdAccountBalance style={{ color: establishment.color }} />;
        case "Basketball Court":
            return <MdSportsBasketball style={{ color: establishment.color }} />;
        case "Health Center":
            return <FaClinicMedical style={{ color: establishment.color }} />;
        default:
            return <FaBuilding style={{ color: establishment.color }} />;
    }
};

export default Geotagging;
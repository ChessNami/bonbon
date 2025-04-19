import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaMapMarkerAlt } from "react-icons/fa";
import ReactDOMServer from "react-dom/server";
import { supabase } from "../../supabaseClient";
import {
    FaBuilding, FaStore, FaSchool, FaHospital, FaHotel, FaChurch, FaShoppingBasket, FaClinicMedical
} from "react-icons/fa";
import { MdAccountBalance, MdSportsBasketball, MdDirectionsBus } from "react-icons/md";

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

const GeotaggingView = () => {
    const centerCoords = useMemo(() => [8.509057124770594, 124.6491339822436], []);
    const [markers, setMarkers] = useState([]);

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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-4 mx-auto">
                <div className="flex flex-col gap-6">
                    <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg shadow-lg overflow-hidden">
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
                            {markers.map((marker) => (
                                <Marker
                                    key={marker.id}
                                    position={marker.coord}
                                    icon={getCustomIcon(ReactDOMServer.renderToString(getIconByType(marker.type)), marker.name)}
                                >
                                    <Popup>
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
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
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
                </div>
            </div>
        </div>
    );
};

export default GeotaggingView;
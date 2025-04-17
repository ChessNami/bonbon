import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
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

// Coordinates for the Barangay Bonbon area (example polygon)
const plannedAreaCoords = [
    [8.5105, 124.6480], // Point 1
    [8.5110, 124.6500], // Point 2
    [8.5090, 124.6510], // Point 3
    [8.5080, 124.6490], // Point 4
    [8.5105, 124.6480], // Closing the polygon
];

const StrategicRoad = () => {
    const bonbonCoords = [8.509057124770594, 124.6491339822436];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Strategic Road</h1>
            <p className="text-lg text-gray-700 mb-4">
                Information about strategic roads in Barangay Bonbon.
            </p>

            {/* Map Section */}
            <div className="w-full h-96">
                <MapContainer center={bonbonCoords} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

                    {/* Planned Area Overlay */}
                    <Polygon
                        positions={plannedAreaCoords}
                        pathOptions={{
                            fillColor: "rgba(0, 123, 255, 0.5)", // Semi-transparent blue
                            color: "blue", // Border color
                            weight: 2, // Border thickness
                        }}
                    >
                        <Popup>
                            <strong>Planned Area</strong>
                            <br />
                            This area is part of the strategic road project.
                        </Popup>
                    </Polygon>
                </MapContainer>
            </div>
        </div>
    );
};

export default StrategicRoad;
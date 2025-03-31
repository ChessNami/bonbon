import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom marker icon (optional)
const customIcon = new L.Icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    shadowSize: [41, 41],
});

// Sample project data (simulating admin-added projects)
const projectData = [
    {
        id: 1,
        name: "Road Repair Project",
        description: "Repairing damaged roads in Zone 1.",
        coordinates: [8.4772, 124.6459], // Example coordinates (latitude, longitude)
    },
    {
        id: 2,
        name: "Community Center Construction",
        description: "Building a new community center in Zone 2.",
        coordinates: [8.4785, 124.6475],
    },
    {
        id: 3,
        name: "Flood Control Project",
        description: "Installing flood barriers in Zone 3.",
        coordinates: [8.4798, 124.6490],
    },
];

const ProjectManagement = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Project Management</h1>
            <p className="text-lg text-gray-700 mb-4 text-center">
                Explore ongoing and upcoming projects in Barangay Bonbon.
            </p>

            {/* Interactive Map */}
            <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
                <MapContainer
                    center={[8.4772, 124.6459]} // Initial map center (latitude, longitude)
                    zoom={15}
                    scrollWheelZoom={true}
                    className="h-full w-full"
                >
                    {/* Map tiles */}
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Project markers */}
                    {projectData.map((project) => (
                        <Marker
                            key={project.id}
                            position={project.coordinates}
                            icon={customIcon}
                        >
                            <Popup>
                                <h3 className="font-bold">{project.name}</h3>
                                <p>{project.description}</p>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};

export default ProjectManagement;
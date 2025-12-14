import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProjectManagementView from "./ProjectManagement/ProjectManagementView";
import StrategicRoadMapView from "./StrategicRoad/StrategicRoadMapView";
import GeotaggingView from "./Geotagging/GeotaggingView";
import ZoneViewer from "./ZoneViewer/ZoneViewer";

const MapViewsMainComponent = () => {
    const [activeTab, setActiveTab] = useState("Project Management");

    const renderContent = () => {
        switch (activeTab) {
            case "Project Management":
                return <ProjectManagementView />;
            case "Strategic Road Map":
                return <StrategicRoadMapView />;
            case "Geotagging":
                return <GeotaggingView />;
            case "Zone Map":
                return <ZoneViewer />
            default:
                return <ProjectManagementView />;
        }
    };

    // Animation variants for the content
    const contentVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
    };

    // Animation variants for the tab
    const tabVariants = {
        active: { scale: 1, opacity: 1 },
        inactive: { scale: 0.95, opacity: 0.7 },
    };

    return (
        <div className="p-4">
            <div className="flex space-x-2 select-none">
                <motion.button
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${activeTab === "Project Management"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Project Management")}
                    variants={tabVariants}
                    animate={activeTab === "Project Management" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Project Management
                </motion.button>

                <motion.button
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${activeTab === "Strategic Road Map"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Strategic Road Map")}
                    variants={tabVariants}
                    animate={activeTab === "Strategic Road Map" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Strategic Road Map
                </motion.button>

                
                <motion.button
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${
                        activeTab === "Geotagging"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("Geotagging")}
                    variants={tabVariants}
                    animate={activeTab === "Geotagging" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Geotagging
                </motion.button>
               

                {/* New Zone Map tab */}
                <motion.button
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ${activeTab === "Zone Map"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Zone Map")}
                    variants={tabVariants}
                    animate={activeTab === "Zone Map" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Zone Map
                </motion.button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    variants={contentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default MapViewsMainComponent;
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ResidentLocationMap from "./ResidentLocationMap";
import AdminStrategicRoadmap from "./AdminStrategicRoadmap";
import AdminProMgmt from "./AdminProMgmt";
import ZoneMapper from "./ZoneMapper";
import Geotagging from "./Geotagging";

const PlanningMainComponent = () => {
    const [activeTab, setActiveTab] = useState("ResidentLocationMap");

    const renderContent = () => {
        switch (activeTab) {
            case "ResidentLocationMap":
                return <ResidentLocationMap />;
            case "Geotagging":
                return <Geotagging />;
            case "Strategic Road Map":
                return <AdminStrategicRoadmap />;
            case "Project Management":
                return <AdminProMgmt />;
            case "Zone Mapper":
                return <ZoneMapper />;
            default:
                return <ResidentLocationMap />;
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
            <div className="flex border-b border-gray-200 select-none">
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "ResidentLocationMap"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("ResidentLocationMap")}
                    variants={tabVariants}
                    animate={activeTab === "ResidentLocationMap" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Residents' Location
                    {activeTab === "ResidentLocationMap" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Zone Mapper"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Zone Mapper")}
                    variants={tabVariants}
                    animate={activeTab === "Zone Mapper" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Zone Mapper
                    {activeTab === "Zone Mapper" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Geotagging"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Geotagging")}
                    variants={tabVariants}
                    animate={activeTab === "Geotagging" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Landmarks
                    {activeTab === "Geotagging" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Strategic Road Map"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Strategic Road Map")}
                    variants={tabVariants}
                    animate={activeTab === "Strategic Road Map" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Strategic Road Map
                    {activeTab === "Strategic Road Map" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Project Management"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Project Management")}
                    variants={tabVariants}
                    animate={activeTab === "Project Management" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Project Management
                    {activeTab === "Project Management" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
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

export default PlanningMainComponent;
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminImplementationReports from "./AdminImplementationReports";
import AdminBudgetReports from "./AdminBudgetReports";
import AdminBidsProjects from "./AdminBidsProjects";

const TransparencyMainComponent = () => {
    const [activeTab, setActiveTab] = useState("Implementation");

    const renderContent = () => {
        switch (activeTab) {
            case "Implementation":
                return <AdminImplementationReports />;
            case "Budget":
                return <AdminBudgetReports />;
            case "Bids":
                return <AdminBidsProjects />;
            default:
                return <AdminImplementationReports />;
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
            <div className="flex border-b border-gray-200">
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Implementation"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Implementation")}
                    variants={tabVariants}
                    animate={activeTab === "Implementation" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Implementation Reports
                    {activeTab === "Implementation" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Budget"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Budget")}
                    variants={tabVariants}
                    animate={activeTab === "Budget" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Budget & Financial Reports
                    {activeTab === "Budget" && (
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"
                            layout
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                </motion.button>
                <motion.button
                    className={`py-2 px-4 text-sm font-medium relative ${activeTab === "Bids"
                        ? "text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                    onClick={() => setActiveTab("Bids")}
                    variants={tabVariants}
                    animate={activeTab === "Bids" ? "active" : "inactive"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Bids and Projects
                    {activeTab === "Bids" && (
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
        </div >
    );
};

export default TransparencyMainComponent;
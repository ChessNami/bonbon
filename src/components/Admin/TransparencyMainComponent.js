import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BarangayOfficials from "./BarangayOfficials";
import SKOfficials from "./SKOfficials";
import AdminImplementationReports from "./AdminImplementationReports";
import AdminBudgetReports from "./AdminBudgetReports";
import AdminBidsProjects from "./AdminBidsProjects";

const TransparencyMainComponent = () => {
    const [activeTab, setActiveTab] = useState("BarangayOfficials");

    const tabs = [
        { key: "BarangayOfficials", label: "Barangay Officials" },
        { key: "SKOfficials", label: "SK Officials" },
        { key: "Bids", label: "Bids and Projects" },
        { key: "Budget", label: "Budget & Financial Reports" },
        { key: "Implementation", label: "Implementation Reports" },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "BarangayOfficials":
                return <BarangayOfficials />;
            case "SKOfficials":
                return <SKOfficials />;
            case "Implementation":
                return <AdminImplementationReports />;
            case "Budget":
                return <AdminBudgetReports />;
            case "Bids":
                return <AdminBidsProjects />;
            default:
                return <BarangayOfficials />;
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
        <div className="flex flex-col w-full overflow-hidden p-4">
            <div className="w-full">
                <div className="border-b bg-gray-100 flex flex-wrap">
                    {tabs.map((tab) => (
                        <motion.div
                            key={tab.key}
                            className={`cursor-pointer px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex-shrink-0 relative ${activeTab === tab.key
                                ? "border-b border-blue-700 text-blue-700"
                                : "text-gray-600 hover:text-blue-700"
                                }`}
                            onClick={() => setActiveTab(tab.key)}
                            variants={tabVariants}
                            animate={activeTab === tab.key ? "active" : "inactive"}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {tab.label}
                            {activeTab === tab.key && (
                                <motion.div
                                    className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-700"
                                    layout
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </motion.div>
                    ))}
                </div>
                <div className="p-2 sm:p-4">
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
            </div>
        </div>
    );
};

export default TransparencyMainComponent;
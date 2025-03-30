import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HouseholdForm from "./HouseholdForm";
import SpouseForm from "./SpouseForm";
import HouseholdComposition from "./HouseholdComposition";

const ResidentProfiling = () => {
    const [activeTab, setActiveTab] = useState("householdForm");

    const tabs = [
        { key: "householdForm", label: "Household Head Form" },
        { key: "spouseForm", label: "Spouse Information" },
        { key: "householdComposition", label: "Household Composition" },
    ];

    const renderActiveTab = () => {
        switch (activeTab) {
            case "householdForm":
                return <HouseholdForm />;
            case "spouseForm":
                return <SpouseForm />;
            case "householdComposition":
                return <HouseholdComposition />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row overflow-hidden">
            <div className="w-full">
                <h2 className="text-3xl font-bold">Resident Profiling</h2>
                <div className="border-b bg-gray-100 flex mt-2">
                    {tabs.map((tab) => (
                        <div
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`cursor-pointer px-6 py-3 text-sm font-medium ${activeTab === tab.key
                                    ? "border-b-2 border-blue-700 text-blue-700"
                                    : "text-gray-600 hover:text-blue-700"
                                }`}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>
                <div className="p-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderActiveTab()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ResidentProfiling;
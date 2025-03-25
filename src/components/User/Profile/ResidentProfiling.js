import React, { useState } from "react";
import HouseholdForm from "./HouseholdForm";
import SpouseForm from "./SpouseForm";
import HouseholdComposition from "./HouseholdComposition";

const SampleTab3 = () => <div>Content for Sample Tab 3</div>;

const ResidentProfiling = () => {
    const [activeTab, setActiveTab] = useState("householdForm");

    return (

        <div className="flex flex-col lg:flex-row bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="w-full p-4">
                <h2 className="text-2xl font-bold">Resident Profiling</h2>

                <div className="border-b bg-gray-100 flex mt-2">
                    {[
                        { key: "householdForm", label: "Household Head Form" },
                        { key: "spouseForm", label: "Spouse Information" },
                        { key: "householdComposition", label: "Household Composition" },
                        { key: "sampleTab3", label: "Sample Tab 3" },
                    ].map((tab) => (
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
                    {activeTab === "householdForm" && <HouseholdForm />}
                    {activeTab === "spouseForm" && <SpouseForm />}
                    {activeTab === "householdComposition" && <HouseholdComposition />}
                    {activeTab === "sampleTab3" && <SampleTab3 />}
                </div>
            </div>
        </div>
    );
};

export default ResidentProfiling;

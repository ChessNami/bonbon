import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HouseholdForm from "./HouseholdForm";
import SpouseForm from "./SpouseForm";
import HouseholdComposition from "./HouseholdComposition";

const ResidentProfiling = () => {
    const [activeTab, setActiveTab] = useState("householdForm");
    const [formData, setFormData] = useState({
        household: {
            firstName: "",
            lastName: "",
            middleName: "",
            middleInitial: "",
            extension: "",
            address: "",
            region: "",
            province: "",
            city: "",
            barangay: "",
            zone: "",
            zipCode: "",
            dob: "",
            age: "",
            gender: "",
            customGender: "",
            civilStatus: "",
            religion: "",
            idType: "",
            idNo: "",
            phoneNumber: "",
            occupation: "",
            skills: "",
            companyAddress: "",
            education: "",
            employmentType: ""
        },
        spouse: {
            firstName: "",
            lastName: "",
            middleName: "",
            middleInitial: "",
            extension: "",
            address: "",
            region: "",
            province: "",
            city: "",
            barangay: "",
            zone: "",
            zipCode: "",
            dob: "",
            age: "",
            gender: "",
            customGender: "",
            civilStatus: "",
            religion: "",
            idType: "",
            idNo: "",
            phoneNumber: "",
            occupation: "",
            skills: "",
            companyAddress: "",
            education: "",
            employmentType: ""
        },
        householdComposition: [],
        childrenCount: "",
        numberOfhouseholdMembers: ""
    });

    const tabs = [
        { key: "householdForm", label: "Household Head Form" },
        { key: "spouseForm", label: "Spouse Information" },
        { key: "householdComposition", label: "Household Composition" },
        { key: "confirmation", label: "Confirmation" },
    ];

    const handleNext = (currentTab, data) => {
        setFormData((prevData) => ({
            ...prevData,
            [currentTab]: data,
        }));

        const currentIndex = tabs.findIndex((tab) => tab.key === currentTab);
        if (currentIndex < tabs.length - 1) {
            setActiveTab(tabs[currentIndex + 1].key);
        }
    };

    const handleBack = () => {
        const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
        if (currentIndex > 0) {
            setActiveTab(tabs[currentIndex - 1].key);
        }
    };

    const handleSubmit = () => {
        console.log("Final Data Submitted:", formData);
        alert("Form submitted successfully!");
    };

    const renderActiveTab = () => {
        const currentIndex = tabs.findIndex((tab) => tab.key === activeTab); // Define currentIndex here

        switch (activeTab) {
            case "householdForm":
                return (
                    <HouseholdForm
                        data={formData.household}
                        onNext={(data) => handleNext("household", data)}
                        onBack={currentIndex === 0 ? null : handleBack} // Use currentIndex here
                    />
                );
            case "spouseForm":
                return (
                    <SpouseForm
                        data={formData.spouse}
                        onNext={(data) => handleNext("spouse", data)}
                        onBack={handleBack}
                    />
                );
            case "householdComposition":
                return (
                    <HouseholdComposition
                        data={formData.householdComposition}
                        childrenCount={formData.childrenCount}
                        numberOfhouseholdMembers={formData.numberOfhouseholdMembers}
                        onNext={(data, childrenCount, numberOfhouseholdMembers) => {
                            setFormData((prev) => ({
                                ...prev,
                                householdComposition: data,
                                childrenCount: childrenCount,
                                numberOfhouseholdMembers: numberOfhouseholdMembers
                            }));
                            handleNext("householdComposition", data);
                        }}
                        onBack={handleBack}
                    />
                );
            case "confirmation":
                return (
                    <div className="p-4">
                        <h2 className="text-2xl font-bold mb-4">Confirmation</h2>
                        <pre className="bg-gray-100 p-4 rounded-lg">
                            {JSON.stringify(formData, null, 2)}
                        </pre>
                        <div className="flex justify-between mt-4">
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                                onClick={handleBack}
                            >
                                Back
                            </button>
                            <button
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                onClick={handleSubmit}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                );
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
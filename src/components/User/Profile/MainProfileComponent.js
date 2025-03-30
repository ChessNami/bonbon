import React, { useState, useCallback } from "react"; // Import useCallback
import { motion } from "framer-motion";
import UserProfile from "./UserProfile";
import MyAccount from "./MyAccount";
import AccountSettings from "./AccountSettings";
import ResidentProfiling from "./ResidentProfiling";
import Help from "./Help";
import Loader from "../../Loader"; // Assuming you have a Loader component

const MainProfileComponent = () => {
    const [activeTab, setActiveTab] = useState("myAccount");
    const [loading, setLoading] = useState(true);

    // Wrap handleLoadingComplete in useCallback to ensure a stable reference
    const handleLoadingComplete = useCallback((isLoaded) => {
        setLoading(!isLoaded); // Set loading to false when UserProfile finishes loading
    }, []);

    const renderContent = () => {
        const variants = {
            hidden: { opacity: 0, y: -50 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
            exit: { opacity: 0, y: -50, transition: { duration: 0.2 } }
        };

        let Component;
        switch (activeTab) {
            case "myAccount":
                Component = MyAccount;
                break;
            case "accountSettings":
                Component = AccountSettings;
                break;
            case "residentProfiling":
                Component = ResidentProfiling;
                break;
            case "help":
                Component = Help;
                break;
            default:
                Component = MyAccount;
        }

        return (
            <motion.div
                key={activeTab}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={variants}
                className="w-full bg-white p-4 rounded-md shadow-md"
            >
                <Component />
            </motion.div>
        );
    };

    return (
        <div className="relative flex flex-col lg:flex-row p-4 space-y-4 lg:space-y-0 lg:space-x-4 min-h-screen">
            {/* Loader */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <Loader />
                </div>
            )}

            {/* User Profile on the Left */}
            <div className="w-full lg:max-w-1/3 bg-primary p-4 rounded-md shadow-md flex flex-col">
                <UserProfile
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onLoadingComplete={handleLoadingComplete} // Pass the stable function
                />
            </div>

            {/* Separator (hidden on small screens) */}
            <div className="hidden lg:block w-px bg-gray-300"></div>

            {/* Content Section on the Right */}
            {renderContent()}
        </div>
    );
};

export default MainProfileComponent;
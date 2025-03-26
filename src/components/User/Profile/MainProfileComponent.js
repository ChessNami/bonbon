import React, { useState } from "react";
import UserProfile from "./UserProfile";
import MyAccount from "./MyAccount";
import AccountSettings from "./AccountSettings";
import ResidentProfiling from "./ResidentProfiling";
import Help from "./Help";
import Loader from "../../Loader"; // Assuming you have a Loader component

const MainProfileComponent = () => {
    const [activeTab, setActiveTab] = useState("myAccount");
    const [loading, setLoading] = useState(true);

    const handleLoadingComplete = (isLoaded) => {
        setLoading(!isLoaded); // Set loading to false when UserProfile finishes loading
    };

    const renderContent = () => {
        switch (activeTab) {
            case "myAccount":
                return <MyAccount />;
            case "accountSettings":
                return <AccountSettings />;
            case "residentProfiling":
                return <ResidentProfiling />;
            case "help":
                return <Help />;
            default:
                return <MyAccount />;
        }
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
                    onLoadingComplete={handleLoadingComplete}
                />
            </div>

            {/* Separator (hidden on small screens) */}
            <div className="hidden lg:block w-px bg-gray-300"></div>

            {/* Content Section on the Right */}
            <div className="w-full bg-white p-4 rounded-md shadow-md">
                {renderContent()}
            </div>
        </div>
    );
};

export default MainProfileComponent;
import React, { useState } from "react";
import UserProfile from "./UserProfile";
import MyAccount from "./MyAccount";
import AccountSettings from "./AccountSettings";
import ResidentProfiling from "./ResidentProfiling";
import Help from "./Help";

const MainProfileComponent = () => {
    const [activeTab, setActiveTab] = useState("myAccount");

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
        <div className="flex p-4 rounded-md">
            <div className="max-w-3xl bg-gray-100 p-4">
                <UserProfile activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
            <div className="w-full mx-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default MainProfileComponent;
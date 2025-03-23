import React, { useState } from "react";
import Profile from "./Profile";
import Users from "./Users";
import About from "./About";

const Menu = () => {
    const [activeTab, setActiveTab] = useState("Profile");

    const renderContent = () => {
        switch (activeTab) {
            case "Profile":
                return <Profile />;
            case "Users":
                return <Users />;
            case "About":
                return <About />;
            default:
                return <Profile />;
        }
    };

    return (
        <div className="flex min-h-screen p-4">
            {/* Sidebar Navigation */}
            <nav className="w-1/4 bg-[#172554] text-white p-4 space-y-4">
                {["Profile", "Users", "About"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`block w-full text-left px-4 py-2 rounded-md hover:bg-blue-700 transition ${activeTab === tab ? "bg-blue-800" : ""
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {/* Main Content */}
            <main className="w-full p-6 bg-gray-100">
                {renderContent()}
            </main>
        </div>
    );
};

export default Menu;

import React, { useState, useEffect } from "react";
import { FaBars, FaHome, FaUsers, FaCog, FaUserTie } from "react-icons/fa"; // Added FaClipboardList for Resident Management
import logo from "../../img/Logo/bonbon-logo.png";

const AdminSidebar = ({ isSidebarOpen, toggleSidebar, currentPage, setCurrentPage }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsCollapsed(window.innerWidth < 768);
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const sidebarOpen = isSidebarOpen && !isCollapsed;

    const navItems = [
        { label: "Home", icon: FaHome },
        { label: "Barangay Officials", icon: FaUserTie },
        { label: "Resident Management", icon: FaUsers }, // Added Resident Management
        { label: "Settings", icon: FaCog },
    ];

    return (
        <aside
            className="bg-[#172554] text-textDark transition-all duration-200 min-h-screen flex flex-col"
            style={{
                width: sidebarOpen ? "16rem" : "4rem",
                minWidth: sidebarOpen ? "16rem" : "4rem",
                maxWidth: sidebarOpen ? "16rem" : "4rem",
            }}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-highlight">
                <div className={`flex items-center transition-all ${sidebarOpen ? "opacity-100" : "opacity-0 hidden"}`}>
                    <img src={logo} alt="Bonbon Logo" className="w-14 h-auto select-none" draggable="false" />
                    <span className="ml-2 text-lg font-bold text-background">Barangay Bonbon</span>
                </div>
                <button onClick={toggleSidebar} className="text-background p-2 rounded-md hover:bg-secondary">
                    <FaBars />
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 mt-2">
                {navItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentPage(item.label)}
                        className={`flex items-center w-full py-3 px-4 my-2 text-left text-background hover:bg-secondary transition-all ${sidebarOpen ? "justify-start" : "justify-center"} ${currentPage === item.label ? "bg-secondary" : ""}`}
                    >
                        <item.icon className="text-xl" />
                        <span className={`ml-3 transition-all ${sidebarOpen ? "block" : "hidden"}`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default AdminSidebar;
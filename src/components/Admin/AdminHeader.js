import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../contexts/UserContext";
import { FaCalendarAlt, FaCog, FaCommentDots, FaSignOutAlt, FaSun, FaMoon, FaBell } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";

const AdminHeader = ({ onLogout }) => {
    const { displayName, profilePicture } = useUser(); // Use profilePicture from UserContext
    const [currentTime, setCurrentTime] = useState(new Date());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [isCompact, setIsCompact] = useState(window.innerWidth < 1272);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        let animationFrame;
        const updateClock = () => {
            setCurrentTime(new Date());
            animationFrame = requestAnimationFrame(updateClock);
        };
        animationFrame = requestAnimationFrame(updateClock);
        return () => cancelAnimationFrame(animationFrame);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsCompact(window.innerWidth < 1272);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatDate = (date) =>
        window.innerWidth < 1135
            ? date.toLocaleDateString("en-PH")
            : date.toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });

    const formatTime = (date) =>
        date.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
        });

    const getTimeIcon = () => {
        const hours = currentTime.getHours();
        return hours >= 6 && hours < 18 ? (
            <FaSun className="mr-2 text-yellow-400" aria-label="Daytime" />
        ) : (
            <FaMoon className="mr-2 text-blue-400" aria-label="Nighttime" />
        );
    };

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);
    const toggleNotif = () => setNotifOpen((prev) => !prev);

    const dropdownItems = [
        { icon: <FaCog className="mr-2 text-gray-700" />, label: "Settings", action: () => console.log("Settings Clicked") },
        { icon: <FaCommentDots className="mr-2 text-gray-700" />, label: "Give Feedback", action: () => console.log("Feedback Clicked") },
        { icon: <FaSignOutAlt className="mr-2 text-red-600" />, label: "Logout", action: onLogout, textColor: "text-red-600" },
    ];

    const notifications = [
        "New order received",
        "System update available",
        "Reminder: Inventory check due",
    ];

    return (
        <header className="bg-primary text-white py-3 flex select-none shadow-md">
            <div className="mx-4 flex justify-between items-center w-full">
                <div className="text-lg flex-1 text-left flex items-center">
                    <FaCalendarAlt className="mr-2 text-highlight" />
                    {formatDate(currentTime)}
                </div>
                <div className="text-lg flex-1 text-center flex items-center justify-center">
                    {getTimeIcon()}
                    {formatTime(currentTime)}
                </div>
                <div className="text-lg flex-1 text-right flex items-center justify-end relative space-x-4">
                    <div
                        className="flex items-center p-2 cursor-pointer rounded-md hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
                        onClick={toggleDropdown}
                        ref={profileRef}
                        aria-label="User Profile"
                        tabIndex={0}
                    >
                        {!isCompact && <span className="mr-2">{displayName}</span>}
                        <img
                            src={profilePicture || placeholderImg} // Use profilePicture from UserContext
                            alt="User Profile"
                            className="w-10 h-10 rounded-full select-none object-cover"
                            draggable="false"
                        />
                    </div>
                    {dropdownOpen && (
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 mt-4 w-96 bg-white text-gray-900 rounded-md shadow-lg z-20 transition-opacity duration-200 opacity-100"
                            style={{ top: "100%" }}
                        >
                            <ul className="p-2 space-y-2">
                                <li
                                    className="flex items-center p-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200 rounded-md transition"
                                    onClick={() => console.log("Profile clicked:", displayName)}
                                    tabIndex={0}
                                >
                                    <img src={profilePicture || placeholderImg} alt="Profile" className="w-12 h-12 rounded-full object-cover mr-2" />
                                    <span className="font-semibold text-left">{displayName}</span>
                                </li>

                                <hr className="border-t border-gray-300 my-2" />

                                {dropdownItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`px-4 py-2 flex items-center hover:bg-blue-100 active:bg-blue-200 cursor-pointer rounded-md transition ${item.textColor || ""}`}
                                        onClick={item.action}
                                        tabIndex={0}
                                    >
                                        {item.icon} {item.label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div
                        className="p-2 cursor-pointer rounded-md hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
                        onClick={toggleNotif}
                        ref={notifRef}
                        aria-label="Notifications"
                        tabIndex={0}
                    >
                        <FaBell className="text-white" size={25} />
                    </div>
                    {notifOpen && (
                        <div
                            ref={notifRef}
                            className="absolute right-0 mt-3 w-64 bg-white text-gray-900 rounded-md shadow-lg z-20 transition-opacity duration-200 opacity-100"
                            style={{ top: "100%" }}
                        >
                            <ul className="p-2 space-y-2">
                                {notifications.map((notif, index) => (
                                    <li key={index} className="px-4 py-2 hover:bg-gray-100 cursor-pointer rounded-md transition">
                                        {notif}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
import React, { useEffect, useState, useRef } from "react";
import { useUser } from "./contexts/UserContext";
import { FaCalendarAlt, FaClock } from "react-icons/fa";
import placeholderImg from "../img/Placeholder/placeholder.png";

const Header = ({ onLogout }) => {
    const { displayName } = useUser();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 768);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            clearInterval(interval);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                profileRef.current && !profileRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const formatDate = (date) => {
        return isSmallScreen
            ? date.toLocaleDateString("en-US")
            : date.toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const toggleDropdown = () => {
        setDropdownOpen((prev) => !prev);
    };

    return (
        <header className="bg-gray-800 text-white py-4 hidden lg:flex select-none">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="text-lg flex-1 text-left flex items-center">
                    <FaCalendarAlt className="mr-2" />
                    {formatDate(currentTime)}
                </div>
                <div className="text-lg flex-1 text-center flex items-center justify-center">
                    <FaClock className="mr-2" />
                    {formatTime(currentTime)}
                </div>
                <div className="text-lg flex-1 text-right flex items-center justify-end relative">
                    {displayName}
                    <img
                        src={placeholderImg}
                        alt="User Profile"
                        ref={profileRef}
                        className="ml-2 w-8 h-8 rounded-full cursor-pointer border border-gray-300"
                        onClick={toggleDropdown}
                    />
                    {dropdownOpen && (
                        <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-white text-black rounded-md shadow-lg z-20" style={{ top: '100%' }}>
                            <ul>
                                <li className="px-4 py-2 hover:bg-gray-200 rounded-tr-md rounded-tl-md cursor-pointer" onClick={() => console.log('Profile clicked')}>Profile</li>
                                <li className="px-4 py-2 hover:bg-gray-200 cursor-pointer" onClick={() => console.log('Settings clicked')}>Settings</li>
                                <li className="px-4 py-2 hover:bg-gray-200 rounded-br-md rounded-bl-md cursor-pointer" onClick={onLogout}>Logout</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
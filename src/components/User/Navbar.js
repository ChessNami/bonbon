import React, { useEffect, useState, useRef } from "react";
import logo from "../../img/Logo/bonbon-logo.png";
import DropdownNav from "./DropdownNav";
import FullNav from "./FullNav";
import { useUser } from "../contexts/UserContext";
import { FaSignOutAlt, FaCog, FaCommentDots } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";

const Navbar = ({ setCurrentPage, currentPage, onLogout }) => {
    const { displayName } = useUser();
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1160);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 1160);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    return (
        <nav className="bg-white shadow-md sticky top-0 z-10 select-none">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                {/* Left Side - Logo and Navigation */}
                <div className="flex items-center">
                    <DropdownNav handleNavClick={setCurrentPage} currentPage={currentPage} />
                    <button onClick={() => setCurrentPage('Home')} className="ml-4">
                        <img src={logo} alt="Bonbon Logo" className="w-20 h-auto select-none" draggable="false" />
                    </button>
                    <div className="ml-2">
                        <div className="uppercase text-xl text-gray-700 font-bold">Barangay Bonbon</div>
                        <div className="capitalize text-gray-500">Cagayan de Oro City</div>
                    </div>
                </div>

                {/* Right Side - Full Navigation OR Profile Section */}
                <div className="flex-1 flex justify-end">
                    {isSmallScreen ? (
                        // Show Profile Section in Navbar when screen width < 1160px
                        <div className="relative">
                            <div
                                className="flex items-center p-1 cursor-pointer rounded-full active:bg-blue-400 hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
                                onClick={() => {
                                    toggleDropdown();
                                    console.log("Profile clicked");
                                }}
                                ref={profileRef}
                                aria-label="User Profile"
                                tabIndex={0}
                            >
                                <img
                                    src={placeholderImg}
                                    alt="User Profile"
                                    className="w-16 h-auto rounded-full select-none"
                                    draggable="false"
                                />
                            </div>

                            {dropdownOpen && (
                                <div ref={dropdownRef} className="absolute right-0 mt-3 min-w-96 bg-white text-gray-900 rounded-md shadow-lg z-20">
                                    <ul className="p-4 space-y-2">
                                        <li
                                            className="px-4 py-2 flex items-center cursor-pointer active:bg-blue-200 hover:bg-blue-100 rounded-md transition"
                                            onClick={() => console.log(`User: ${displayName} clicked`)}
                                        >
                                            <img src={placeholderImg} className="w-14 h-auto rounded-full mr-2" alt="User Profile" />
                                            <span className="text-xl font-semibold">{displayName}</span>
                                        </li>
                                        <li className="px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition">
                                            <FaCog className="mr-2 text-gray-700" /> Settings
                                        </li>
                                        <li className="px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition">
                                            <FaCommentDots className="mr-2 text-gray-700" /> Give Feedback
                                        </li>
                                        <li
                                            className="px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition text-red-600"
                                            onClick={() => {
                                                onLogout();
                                                console.log("User logged out");
                                            }}
                                        >
                                            <FaSignOutAlt className="mr-2 text-red-600" /> Logout
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Show Full Navigation when screen width >= 1160px
                        <FullNav handleNavClick={setCurrentPage} currentPage={currentPage} />
                    )}
                </div>

            </div>
        </nav>
    );
};

export default Navbar;

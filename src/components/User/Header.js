import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../../supabaseClient";
import { FaCalendarAlt, FaCog, FaCommentDots, FaSignOutAlt, FaSun, FaMoon, FaUser } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";

const Header = ({ onLogout, setCurrentPage }) => {
    const { displayName } = useUser();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [profilePic, setProfilePic] = useState(placeholderImg);
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
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                profileRef.current &&
                !profileRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchUserProfilePic = async () => {
            const { data, error } = await supabase.auth.getUser();

            if (error || !data?.user) {
                console.error("Error fetching user:", error?.message || "No user found");
                return;
            }

            const userProfilePicPath = data.user.user_metadata?.profilePic; // File path from metadata
            if (userProfilePicPath) {
                try {
                    // Generate a signed URL for the profile picture
                    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                        .from("user-assets")
                        .createSignedUrl(userProfilePicPath, 3600); // 3600 seconds = 1 hour

                    if (signedUrlError) {
                        console.error("Error generating signed URL for profile picture:", signedUrlError.message);
                        return;
                    }

                    setProfilePic(signedUrlData.signedUrl); // Update state with the signed URL
                } catch (err) {
                    console.error("Error generating signed URL:", err.message);
                }
            }
        };

        fetchUserProfilePic();
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
        setDropdownOpen((prevState) => !prevState);
    };

    const handleDropdownClick = (action) => {
        action();
        setDropdownOpen(false);
    };

    const getTimeIcon = () => {
        const hours = currentTime.getHours();
        return hours >= 6 && hours < 18 ? (
            <FaSun className="mr-2 text-yellow-400" aria-label="Daytime" />
        ) : (
            <FaMoon className="mr-2 text-blue-400" aria-label="Nighttime" />
        );
    };

    const dropdownItems = [
        { icon: <FaUser className="mr-2 text-gray-700" />, label: "Profile", action: () => setCurrentPage("Profile") },
        { icon: <FaCog className="mr-2 text-gray-700" />, label: "Settings", action: () => console.log("Settings Clicked") },
        { icon: <FaCommentDots className="mr-2 text-gray-700" />, label: "Give Feedback", action: () => console.log("Feedback Clicked") },
        { icon: <FaSignOutAlt className="mr-2 text-red-600" />, label: "Logout", action: onLogout, textColor: "text-red-600" },
    ];

    return (
        <header className="bg-[#172554] text-white py-3 hidden lg:flex select-none shadow-md z-30">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="text-lg flex-1 text-left flex items-center">
                    <FaCalendarAlt className="mr-2 text-highlight" />
                    {formatDate(currentTime)}
                </div>

                <div className="text-lg flex-1 text-center flex items-center justify-center">
                    {getTimeIcon()}
                    {formatTime(currentTime)}
                </div>

                <div className="text-lg flex-1 text-right flex items-center justify-end relative">
                    <div
                        className="flex items-center p-2 cursor-pointer rounded-md hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
                        onClick={toggleDropdown}
                        ref={profileRef}
                        aria-label="User Profile"
                        tabIndex={0}
                    >
                        <span className="mr-2">{displayName}</span>
                        <img
                            src={profilePic}
                            alt="User Profile"
                            className="w-10 h-10 rounded-full object-cover select-none"
                            draggable="false"
                        />
                    </div>

                    {dropdownOpen && (
                        <div
                            ref={dropdownRef}
                            className="absolute right-0 mt-4 w-64 bg-white text-gray-900 rounded-md shadow-lg z-30"
                            style={{ top: "100%" }}
                        >
                            <ul className="p-4 space-y-2">
                                {dropdownItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition ${item.textColor || ""
                                            }`}
                                        onClick={() => handleDropdownClick(item.action)}
                                        tabIndex={0}
                                    >
                                        {item.icon} {item.label}
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

export default Header;
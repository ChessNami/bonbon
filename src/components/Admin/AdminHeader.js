import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../supabaseClient";
import { FaCalendarAlt, FaSignOutAlt, FaSun, FaMoon } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../utils/supabaseUtils";

const AdminHeader = ({ onLogout, setCurrentPage }) => {
    const [displayName, setDisplayName] = useState();
    const [profilePicture, setProfilePicture] = useState(placeholderImg);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // New state for loading
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);
    const [isDisplayNameVisible, setIsDisplayNameVisible] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setIsDisplayNameVisible(window.innerWidth > 1273);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        let unsubscribe;
        const fetchUserData = async () => {
            setIsLoading(true); // Set loading to true when fetching starts
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.error("Error fetching user:", error?.message || "No user found");
                setProfilePicture(placeholderImg);
                setDisplayName("Admin");
                setIsLoading(false); // Stop loading when fetch is complete
                return;
            }

            setDisplayName(user.user_metadata?.display_name || "Admin");

            const { profilePic: profilePicUrl } = await fetchUserPhotos(user.id);
            setProfilePicture(profilePicUrl || placeholderImg);
            setIsLoading(false); // Stop loading when fetch is complete

            // Subscribe to photo changes
            unsubscribe = subscribeToUserPhotos(user.id, (newPhotos) => {
                setProfilePicture(newPhotos.profilePic || placeholderImg);
            });
        };

        fetchUserData();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatDate = (date) => {
        const isSmallScreen = window.innerWidth < 920;
        return date.toLocaleDateString("en-PH", {
            weekday: "long",
            ...(isSmallScreen
                ? { month: "2-digit", day: "2-digit", year: "numeric" }
                : { year: "numeric", month: "long", day: "numeric" }),
        });
    };

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

    const handleDropdownClick = (action) => {
        action();
        setDropdownOpen(false);
    };

    const dropdownItems = [
        { icon: <FaSignOutAlt className="mr-2 text-red-600" />, label: "Logout", action: onLogout, textColor: "text-red-600" },
    ];

    // Framer Motion variants for dropdown animation
    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } }
    };

    // Framer Motion variants for profile hover
    const profileVariants = {
        rest: { scale: 1 },
        hover: { scale: 1.05, transition: { duration: 0.2 } }
    };

    // Framer Motion variants for dropdown items
    const itemVariants = {
        rest: { x: 0 },
        hover: { x: 5, transition: { duration: 0.2 } }
    };

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
                    <motion.div
                        className="flex items-center p-2 cursor-pointer rounded-md hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
                        onClick={toggleDropdown}
                        ref={profileRef}
                        aria-label="User Profile"
                        tabIndex={0}
                        variants={profileVariants}
                        initial="rest"
                        whileHover="hover"
                    >
                        {isDisplayNameVisible && <span className="mr-2">{displayName}</span>}
                        <motion.img
                            src={profilePicture}
                            alt="User Profile"
                            className={`w-10 h-10 rounded-full select-none object-cover ${isLoading ? 'animate-pulse' : ''}`}
                            draggable="false"
                        />
                    </motion.div>
                    <AnimatePresence>
                        {dropdownOpen && (
                            <motion.div
                                ref={dropdownRef}
                                className={`absolute right-0 mt-4 w-96 bg-white text-gray-900 rounded-md shadow-lg z-20 ${isLoading ? 'animate-pulse' : ''}`}
                                style={{ top: "100%" }}
                                variants={dropdownVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                            >
                                <ul className="p-2 space-y-2">
                                    <motion.li
                                        className="flex items-center p-2 cursor-pointer hover:bg-gray-100 active:bg-gray-200 rounded-md transition"
                                        onClick={() => handleDropdownClick(() => setCurrentPage("Profile"))}
                                        tabIndex={0}
                                        variants={itemVariants}
                                        initial="rest"
                                        whileHover="hover"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <img src={profilePicture} alt="Profile" className="w-12 h-12 rounded-full object-cover mr-2" />
                                        <span className="font-semibold text-left">{displayName}</span>
                                    </motion.li>
                                    <hr className="border-t border-gray-300 my-2" />
                                    {dropdownItems.map((item, index) => (
                                        <motion.li
                                            key={index}
                                            className={`px-4 py-2 flex items-center hover:bg-blue-100 active:bg-blue-200 cursor-pointer rounded-md transition ${item.textColor || ""}`}
                                            onClick={() => handleDropdownClick(item.action)}
                                            tabIndex={0}
                                            variants={itemVariants}
                                            initial="rest"
                                            whileHover="hover"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {item.icon} {item.label}
                                        </motion.li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
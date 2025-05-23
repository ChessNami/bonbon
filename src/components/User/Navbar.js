import React, { useEffect, useState, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../img/Logo/bonbon-logo.png";
import DropdownNav from "./DropdownNav";
import FullNav from "./FullNav";
import { useUser } from "../contexts/UserContext";
import { FaSignOutAlt, FaCommentDots, FaEye } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";
import { supabase } from "../../supabaseClient";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../utils/supabaseUtils";

// Utility to debounce resize events
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Memoized Dropdown Item to prevent unnecessary re-renders
const DropdownItem = memo(({ icon, label, onClick, textColor, bgColor }) => (
    <motion.li
        className={`px-3 py-2 flex items-center cursor-pointer rounded-md ${textColor || ""}`}
        onClick={onClick}
        whileHover={{ backgroundColor: bgColor || "rgba(219, 234, 254, 0.5)" }}
        transition={{ duration: 0.1 }}
    >
        {icon} <span className="text-base sm:text-lg">{label}</span>
    </motion.li>
));

const Navbar = ({ setCurrentPage, currentPage, onLogout }) => {
    const { displayName, viewMode, toggleViewMode } = useUser();
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1160);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);
    const [profilePic, setProfilePic] = useState(placeholderImg);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const handleResize = debounce(() => {
            setIsSmallScreen(window.innerWidth < 1160);
        }, 100);

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
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let unsubscribe;
        const fetchUserData = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.error("Error fetching user:", error?.message || "No user found");
                setProfilePic(placeholderImg);
                return;
            }

            // Fetch profile picture
            const { profilePic: profilePicUrl } = await fetchUserPhotos(user.id);
            setProfilePic(profilePicUrl || placeholderImg);

            // Fetch user role
            const { data: userRoleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role_id")
                .eq("user_id", user.id)
                .single();

            if (!roleError) {
                setUserRole(userRoleData.role_id);
            }

            unsubscribe = subscribeToUserPhotos(user.id, (newPhotos) => {
                setProfilePic(newPhotos.profilePic || placeholderImg);
            });
        };

        fetchUserData();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    const handleLogoutClick = async () => {
        try {
            console.log("Logout clicked");
            if (onLogout) {
                await onLogout();
                setDropdownOpen(false);
            } else {
                console.error("onLogout function is not defined");
            }
        } catch (error) {
            console.error("Logout error:", error.message);
        }
    };

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.1, ease: "easeIn" } },
    };

    const profileVariants = {
        rest: { scale: 1 },
        hover: { scale: 1.03, transition: { duration: 0.1 } },
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-20 select-none">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                {/* Left Side - Logo and Navigation */}
                <div className="flex items-center">
                    <DropdownNav handleNavClick={setCurrentPage} currentPage={currentPage} />
                    <button onClick={() => setCurrentPage("Home")} className="ml-2 sm:ml-4">
                        <img src={logo} alt="Bonbon Logo" className="w-16 sm:w-20 h-auto select-none" draggable="false" />
                    </button>
                    <div className="ml-2 hidden sm:block">
                        <div className="uppercase text-lg sm:text-xl text-gray-700 font-bold">Barangay Bonbon</div>
                        <div className="capitalize text-sm sm:text-base text-gray-500">Cagayan de Oro City</div>
                    </div>
                </div>

                {/* Right Side - Full Navigation OR Profile Section */}
                <div className="flex-1 flex justify-end items-center">
                    {isSmallScreen ? (
                        <div className="relative">
                            <motion.div
                                className="flex items-center p-1 cursor-pointer rounded-full hover:bg-blue-100 transition-colors duration-100"
                                onClick={toggleDropdown}
                                ref={profileRef}
                                aria-label="User Profile"
                                tabIndex={0}
                                variants={profileVariants}
                                initial="rest"
                                whileHover="hover"
                            >
                                <motion.img
                                    src={profilePic}
                                    alt="User Profile"
                                    className="w-14 sm:w-16 h-14 sm:h-16 rounded-full object-cover select-none"
                                    draggable="false"
                                    loading="lazy"
                                />
                            </motion.div>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        ref={dropdownRef}
                                        className="absolute right-0 mt-4 w-64 sm:w-80 bg-white text-gray-900 rounded-md shadow-lg z-20"
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <ul className="p-3 sm:p-4 space-y-2">
                                            <DropdownItem
                                                icon={<img src={profilePic} className="w-10 sm:w-14 h-10 sm:h-14 rounded-full object-cover mr-2" alt="User Profile" />}
                                                label={displayName}
                                                onClick={() => {
                                                    setCurrentPage("Profile");
                                                    setDropdownOpen(false);
                                                }}
                                            />
                                            <DropdownItem
                                                icon={<FaCommentDots className="mr-2 text-gray-700 text-base sm:text-lg" />}
                                                label="Give Feedback"
                                                onClick={() => {
                                                    setCurrentPage("Feedback");
                                                    setDropdownOpen(false);
                                                }}
                                            />
                                            {(userRole === 1 || userRole === 3) && (
                                                <DropdownItem
                                                    icon={<FaEye className="mr-2 text-gray-700 text-base sm:text-lg" />}
                                                    label={`Switch to ${viewMode === "user" ? "Admin" : "User"} View`}
                                                    onClick={() => {
                                                        toggleViewMode();
                                                        setDropdownOpen(false);
                                                    }}
                                                />
                                            )}
                                            <DropdownItem
                                                icon={<FaSignOutAlt className="mr-2 text-red-600 text-base sm:text-lg" />}
                                                label="Logout"
                                                onClick={handleLogoutClick}
                                                textColor="text-red-600"
                                            />
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <FullNav handleNavClick={setCurrentPage} currentPage={currentPage} />
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../img/Logo/bonbon-logo.png";
import DropdownNav from "./DropdownNav";
import FullNav from "./FullNav";
import { useUser } from "../contexts/UserContext";
import { FaSignOutAlt, FaCommentDots } from "react-icons/fa";
import placeholderImg from "../../img/Placeholder/placeholder.png";
import { supabase } from "../../supabaseClient";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../utils/supabaseUtils";

const Navbar = ({ setCurrentPage, currentPage, onLogout }) => {
    const { displayName } = useUser();
    const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 1160);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const profileRef = useRef(null);
    const [profilePic, setProfilePic] = useState(placeholderImg);

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
        const fetchProfilePic = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.error("Error fetching user:", error?.message || "No user found");
                setProfilePic(placeholderImg);
                return;
            }

            const { profilePic: profilePicUrl } = await fetchUserPhotos(user.id);
            setProfilePic(profilePicUrl || placeholderImg);

            unsubscribe = subscribeToUserPhotos(user.id, (newPhotos) => {
                setProfilePic(newPhotos.profilePic || placeholderImg);
            });
        };

        fetchProfilePic();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const toggleDropdown = () => setDropdownOpen((prev) => !prev);

    // Framer Motion variants for dropdown animation
    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
        exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" } }
    };

    // Framer Motion variants for profile image hover
    const profileVariants = {
        rest: { scale: 1 },
        hover: { scale: 1.05, transition: { duration: 0.2 } }
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-20 select-none">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                {/* Left Side - Logo and Navigation */}
                <div className="flex items-center">
                    <DropdownNav handleNavClick={setCurrentPage} currentPage={currentPage} />
                    <button onClick={() => setCurrentPage("Home")} className="ml-4">
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
                            <motion.div
                                className="flex items-center p-1 cursor-pointer rounded-full active:bg-blue-400 hover:bg-secondary hover:bg-opacity-30 transition-all duration-200"
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
                                    className="w-16 h-16 rounded-full object-cover select-none"
                                    draggable="false"
                                />
                            </motion.div>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        ref={dropdownRef}
                                        className="absolute right-0 mt-4 min-w-96 bg-white text-gray-900 rounded-md shadow-lg z-20"
                                        variants={dropdownVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <ul className="p-4 space-y-2">
                                            <motion.li
                                                className="px-4 py-2 flex items-center cursor-pointer active:bg-blue-200 hover:bg-blue-100 rounded-md transition"
                                                onClick={() => {
                                                    setCurrentPage("Profile");
                                                    setDropdownOpen(false);
                                                }}
                                                whileHover={{ backgroundColor: "rgba(219, 234, 254, 0.5)" }}
                                            >
                                                <img src={profilePic} className="w-14 h-14 rounded-full object-cover mr-2" alt="User Profile" />
                                                <span className="text-xl font-semibold">{displayName}</span>
                                            </motion.li>
                                            <motion.li
                                                className="px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition"
                                                whileHover={{ backgroundColor: "rgba(219, 234, 254, 0.5)" }}
                                            >
                                                <FaCommentDots className="mr-2 text-gray-700" /> Give Feedback
                                            </motion.li>
                                            <motion.li
                                                className="px-4 py-2 flex items-center hover:bg-blue-100 cursor-pointer rounded-md transition text-red-600"
                                                onClick={onLogout}
                                                whileHover={{ backgroundColor: "rgba(219, 234, 254, 0.5)" }}
                                            >
                                                <FaSignOutAlt className="mr-2 text-red-600" /> Logout
                                            </motion.li>
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
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
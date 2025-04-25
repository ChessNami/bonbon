import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBars } from "react-icons/fa";

const DropdownNav = ({ handleNavClick, currentPage }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { name: "Home" },
        { name: "Transparency" },
        { name: "Demographics" },
        { name: "Project Management" },
        { name: "Strategic Road" },
        { name: "Geotagging" },
    ];

    const handleItemClick = (name) => {
        handleNavClick(name);
        setDropdownOpen(false);
    };

    const toggleDropdown = () => {
        setDropdownOpen((prev) => !prev);
    };

    const dropdownVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.2, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            y: -10,
            scale: 0.95,
            transition: { duration: 0.15, ease: "easeIn" }
        }
    };

    const itemVariants = {
        rest: { x: 0 },
        hover: { x: 5, transition: { duration: 0.2 } }
    };

    return (
        <div className="relative block lg:hidden" ref={dropdownRef}>
            <motion.button
                onClick={toggleDropdown}
                ref={buttonRef}
                className={`text-gray-700 focus:outline-none ${dropdownOpen ? "bg-gray-200" : ""} p-2 rounded`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <FaBars className="w-8 sm:w-10 h-auto transition-all duration-200" />
            </motion.button>
            <AnimatePresence>
                {dropdownOpen && (
                    <motion.ul
                        className="absolute left-0 mt-4 p-3 w-56 sm:w-64 bg-white text-black rounded-md shadow-lg z-20"
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {navItems.map((item) => (
                            <motion.li
                                key={item.name}
                                className="px-3 py-2 hover:bg-gray-200 rounded-md cursor-pointer text-sm sm:text-base"
                                onClick={() => handleItemClick(item.name)}
                                variants={itemVariants}
                                initial="rest"
                                whileHover="hover"
                                whileTap={{ scale: 0.98 }}
                            >
                                {item.name}
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DropdownNav;
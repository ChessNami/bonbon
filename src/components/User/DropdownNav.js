import React, { useEffect, useRef, useState } from "react";
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
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
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
        setDropdownOpen(false); // Close the dropdown after selecting a navlink
    };

    const toggleDropdown = () => {
        setDropdownOpen((prev) => !prev);
    };

    return (
        <div className="relative block lg:hidden" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                ref={buttonRef}
                className={`text-gray-700 focus:outline-none ${dropdownOpen ? "bg-gray-200" : ""} p-2 rounded`}
            >
                <FaBars className="w-8 h-auto transition-all duration-200" />
            </button>
            {dropdownOpen && (
                <ul className="absolute left-0 mt-4 p-4 w-72 bg-white text-black rounded-md shadow-lg z-20">
                    {navItems.map((item) => (
                        <li key={item.name} className="px-4 py-2 hover:bg-gray-200 rounded-md cursor-pointer" onClick={() => handleItemClick(item.name)}>
                            {item.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DropdownNav;
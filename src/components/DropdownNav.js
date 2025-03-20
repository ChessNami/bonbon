import React, { useEffect, useRef } from "react";
import { FaBars } from "react-icons/fa";

const DropdownNav = ({ isOpen, toggleMenu, handleNavClick, currentPage }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                if (isOpen) {
                    toggleMenu();
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, toggleMenu]);

    const navItems = [
        { name: "Home" },
        { name: "Transparency" },
        { name: "Demographics" },
        { name: "Project Management" },
        { name: "Strategic Road" },
    ];

    const handleItemClick = (name) => {
        handleNavClick(name);
        toggleMenu(); // Close the dropdown after selecting a navlink
    };

    return (
        <div className="block lg:hidden" ref={dropdownRef}>
            <button
                onClick={toggleMenu}
                className={`text-gray-700 focus:outline-none ${isOpen ? "bg-gray-200" : ""} p-2 rounded`}
            >
                <FaBars className="w-8 h-auto transition-all duration-200" />
            </button>
            <ul
                className={`absolute text-xl bg-white w-full left-0 right-0 top-full mt-2 mx-auto backdrop-blur-md bg-opacity-50 py-4 transition-all duration-200 ease-in-out ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    }`}
            >
                {navItems.map((item) => (
                    <React.Fragment key={item.name}>
                        <li className="text-center">
                            <button
                                onClick={() => handleItemClick(item.name)}
                                className={`text-gray-700 underline-offset-8 ${currentPage === item.name ? "text-blue-900 font-bold underline" : ""
                                    } hover:text-blue-900 hover:border-blue-900 transition-all duration-200 w-full py-4 hover:underline`}
                            >
                                {item.name}
                            </button>
                        </li>
                        <hr className="border-gray-300 w-3/4 mx-auto" />
                    </React.Fragment>
                ))}
            </ul>
        </div>
    );
};

export default DropdownNav;
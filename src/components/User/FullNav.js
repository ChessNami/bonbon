import React from "react";

const FullNav = ({ handleNavClick, currentPage }) => {
    const navItems = [
        { name: "Home" },
        { name: "Transparency" },
        { name: "Demographics" },
        { name: "Geolocations & Projects" },
    ];

    return (
        <ul className="lg:flex lg:space-x-8 hidden lg:ml-auto lg:justify-evenly">
            {navItems.map((item) => (
                <li key={item.name} className="text-center py-2">
                    <button
                        onClick={() => handleNavClick(item.name)}
                        className={`text-gray-700 border-b-2 ${currentPage === item.name ? "border-blue-900 text-blue-900" : "border-transparent"} hover:text-blue-900 hover:border-blue-900 transition duration-200 text-base lg:text-lg w-full`}
                    >
                        {item.name}
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default FullNav;
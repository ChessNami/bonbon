import React, { useState, useEffect } from "react";
import logo from "../img/Logo/bonbon-logo.png";
import DropdownNav from "./DropdownNav";
import FullNav from "./FullNav";

const Navbar = ({ setCurrentPage, currentPage }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleNavClick = (page) => {
        setCurrentPage(page);
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1160) {
                setIsOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                <div className="flex items-center">
                    <button onClick={() => handleNavClick('Home')} className="mr-4">
                        <img src={logo} alt="Bonbon Logo" className="w-20 h-auto" />
                    </button>
                    <div className="ml-2">
                        <div className="uppercase text-xl text-gray-700 font-bold">Barangay Bonbon</div>
                        <div className="capitalize text-gray-500">Cagayan de Oro City</div>
                    </div>
                </div>
                <div className="flex-1 flex justify-end">
                    <DropdownNav isOpen={isOpen} toggleMenu={toggleMenu} handleNavClick={handleNavClick} currentPage={currentPage} />
                    <FullNav handleNavClick={handleNavClick} currentPage={currentPage} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
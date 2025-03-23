import React, { useEffect } from "react";
import AdminFullNav from "./AdminFullNav";

const Navbar = ({ setCurrentPage, currentPage }) => {

    const handleNavClick = (page) => {
        setCurrentPage(page);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1160) {
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);


    return (
        <nav className="bg-white shadow-md sticky top-0 z-10 select-none">
            <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                
                <div className="flex-1 flex justify-end">
                    <AdminFullNav handleNavClick={handleNavClick} currentPage={currentPage} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
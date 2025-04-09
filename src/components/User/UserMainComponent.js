import React, { useState } from "react";
import Header from "./Header";
import Navbar from "./Navbar";
import UserMainPage from "./UserMainPage";
import Footer from "../Footer";

const UserMainComponent = ({ onLogout }) => {
    const [currentPage, setCurrentPage] = useState("Home");

    return (
        <div className="flex flex-col min-h-screen">
            {/* Pass setCurrentPage to Header */}
            <Header setCurrentPage={setCurrentPage} onLogout={onLogout} />
            <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <main className="flex-grow bg-[#dee5f8]">
                <UserMainPage currentPage={currentPage} />
            </main>
            <Footer />
        </div>
    );
};

export default UserMainComponent;
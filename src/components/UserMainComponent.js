import React, { useState } from "react";
import Header from "./Header";
import Navbar from "./Navbar";
import MainPage from "./MainPage";
import Footer from "./Footer";

const UserMainComponent = ({ onLogout }) => {
    const [currentPage, setCurrentPage] = useState("Home");

    return (
        <div className="flex flex-col min-h-screen">
            <Header onLogout={onLogout} />
            <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <main className="flex-grow">
                <MainPage currentPage={currentPage} />
            </main>
            <Footer />
        </div>
    );
};

export default UserMainComponent;
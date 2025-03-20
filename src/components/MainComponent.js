import React, { useState } from "react";
import Navbar from "./Navbar";
import MainPage from "./MainPage";
import Footer from "./Footer";

const MainComponent = () => {
    const [currentPage, setCurrentPage] = useState("Home");

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <main className="flex-grow">
                <MainPage currentPage={currentPage} />
            </main>
            <Footer />
        </div>
    );
};

export default MainComponent;
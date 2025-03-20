import React, { useState } from "react";
import Navbar from "./Navbar";
import MainPage from "./MainPage";

const MainComponent = () => {
    const [currentPage, setCurrentPage] = useState("Home");

    return (
        <div>
            <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />
            <MainPage currentPage={currentPage} />
        </div>
    );
};

export default MainComponent;
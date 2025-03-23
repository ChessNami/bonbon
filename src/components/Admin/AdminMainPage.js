import React from "react";
import AdminHome from "./AdminHome";
import Menu from "./Menu";

const MainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Menu":
                return <Menu />;
            case "Home":
                return <AdminHome />;
            default:
                return <AdminHome />;
        }
    };

    return (
        <div>
            {renderPage()}
        </div>
    );
};

export default MainPage;
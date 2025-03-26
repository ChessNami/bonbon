import React from "react";
import Home from "./Home";
import Transparency from "./Transparency";
import Demographics from "./Demographics";
import ProjectManagement from "./ProjectManagement";
import StrategicRoad from "./StrategicRoad";
import MainProfileComponent from "../User/Profile/MainProfileComponent";

const UserMainPage = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case "Home":
                return <Home />;
            case "Transparency":
                return <Transparency />;
            case "Demographics":
                return <Demographics />;
            case "Project Management":
                return <ProjectManagement />;
            case "Strategic Road":
                return <StrategicRoad />;
            case "Profile":
                return <MainProfileComponent />;
            default:
                return <Home />;
        }
    };

    return (
        <div>
            {renderPage()}
        </div>
    );
};

export default UserMainPage;
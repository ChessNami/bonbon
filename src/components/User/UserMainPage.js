import React from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import Framer Motion
import Home from "./Home";
import Transparency from "./Transparency";
import Demographics from "./Demographics";
import MainProfileComponent from "../User/Profile/MainProfileComponent";
import GeotaggingView from "./GeotaggingView";
import Feedback from "./Feedback";
import StrategicRoadMapView from "./StrategicRoadMapView";
import ProjectManagementView from "./ProjectManagementView";

const pageVariants = {
    initial: { opacity: 0, x: -25 }, // Start with opacity 0 and slide in from the left
    animate: { opacity: 1, x: 0 }, // Fade in and slide to the center
    exit: { opacity: 0, y: 10 }, // Fade out and slide to the right
};

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
                return <ProjectManagementView />;
            case "Strategic Road":
                return <StrategicRoadMapView />;
            case "Geotagging":
                return <GeotaggingView />;
            case "Feedback":
                return <Feedback />;
            case "Profile":
                return <MainProfileComponent />;
            default:
                return <Home />;
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentPage} // Ensure each page has a unique key for animations
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }} // Smooth transition
            >
                {renderPage()}
            </motion.div>
        </AnimatePresence>
    );
};

export default UserMainPage;
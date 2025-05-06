import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Home from "./Home/Home";
import Transparency from "./Transparency/Transparency";
import Demographics from "./Demographics/Demographics";
import MainProfileComponent from "./Profiling/MainProfilingComponent";
import Feedback from "./Transparency/Feedback";
import MapViewsMainComponent from "./MapViews/MapViewsMainComponent";

const pageVariants = {
    initial: { opacity: 0, x: -25 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, y: 10 },
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
            case "Map Views":
                return <MapViewsMainComponent />;
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
                key={currentPage}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
            >
                {renderPage()}
            </motion.div>
        </AnimatePresence>
    );
};

export default UserMainPage;
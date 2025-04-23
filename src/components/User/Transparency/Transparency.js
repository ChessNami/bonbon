// Transparency.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaUsers, FaProjectDiagram, FaMoneyBillWave, FaChartBar, FaUserFriends, FaComment } from "react-icons/fa";
import BarangayCouncil from "./BarangayCouncil";
import SK from "./SK";
import UserBidsProjects from "./UserBidsProjects";
import UserBudgetReports from "./UserBudgetReports";
import UserImplementationReports from "./UserImplementationReports";
import Feedback from "./Feedback";
import sklogo from "../../../img/Logo/sk.png";
import barangaybonbon from "../../../img/Logo/bonbon-logo.png";
import bids from "../../../img/Transparency/bids.jpg";
import budget from "../../../img/Transparency/budget.jpg";
import implementation from "../../../img/Transparency/implementation.jpg";
import feedbackImg from "../../../img/Transparency/feedback.webp";
import Loader from "../../Loader";

const Transparency = () => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const cards = [
        { title: "Barangay Council", image: barangaybonbon, icon: <FaUsers size={20} /> },
        { title: "Sanguniang Kabataan (SK)", image: sklogo, icon: <FaUserFriends size={20} /> },
        { title: "Bids and Projects", image: bids, icon: <FaProjectDiagram size={20} /> },
        { title: "Budget & Financial Reports", image: budget, icon: <FaMoneyBillWave size={20} /> },
        { title: "Implementation Reports", image: implementation, icon: <FaChartBar size={20} /> },
        { title: "Feedback", image: feedbackImg, icon: <FaComment size={20} /> },
    ];

    const handleCardClick = (card) => {
        setSelectedCard(card.title);
    };

    const handleBackClick = () => {
        setSelectedCard(null);
    };

    const renderContent = () => {
        switch (selectedCard) {
            case "Barangay Council":
                return <BarangayCouncil />;
            case "Sanguniang Kabataan (SK)":
                return <SK />;
            case "Bids and Projects":
                return <UserBidsProjects />;
            case "Budget & Financial Reports":
                return <UserBudgetReports />;
            case "Implementation Reports":
                return <UserImplementationReports />;
            case "Feedback":
                return <Feedback />;
            default:
                return null;
        }
    };

    const centerVariants = {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
        exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3, ease: "easeIn" } },
    };

    useEffect(() => {
        const images = [barangaybonbon, sklogo, bids, budget, implementation, feedbackImg];
        let loadedImages = 0;

        const checkAllLoaded = () => {
            loadedImages++;
            if (loadedImages === images.length) {
                setTimeout(() => {
                    setIsLoading(false);
                }, 2000);
            }
        };

        images.forEach((image) => {
            const img = new Image();
            img.src = image;
            img.onload = checkAllLoaded;
            img.onerror = checkAllLoaded;
        });

        return () => {
            images.forEach((image) => {
                const img = new Image();
                img.src = image;
                img.onload = null;
                img.onerror = null;
            });
        };
    }, []);

    return (
        <div className="p-4 min-h-screen select-none">
            <AnimatePresence mode="wait">
                {selectedCard ? (
                    <motion.div
                        key="content"
                        className="bg-white p-4 rounded-lg shadow-lg max-w-5xl mx-auto w-full relative"
                        variants={centerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {isLoading && (
                            <div className="absolute inset-0 z-10">
                                <Loader />
                            </div>
                        )}
                        <div className={`flex items-center mb-4 space-x-2 ${isLoading ? "opacity-0" : "opacity-100"}`}>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleBackClick}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                                >
                                    <FaArrowLeft />
                                    Back
                                </button>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-700">{selectedCard}</h1>
                        </div>
                        <hr className={`border-t border-gray-300 my-2 ${isLoading ? "opacity-0" : "opacity-100"}`} />
                        <div className={isLoading ? "opacity-0" : "opacity-100"}>{renderContent()}</div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="cards"
                        variants={centerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="max-w-6xl mx-auto w-full relative"
                    >
                        {isLoading && (
                            <div className="absolute inset-0 z-10">
                                <Loader />
                            </div>
                        )}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${isLoading ? "opacity-0" : "opacity-100"}`}>
                            {cards.map((card, index) => (
                                <motion.div
                                    key={index}
                                    className="relative aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    onClick={() => handleCardClick(card)}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                    <div
                                        className={`absolute inset-0 bg-cover bg-center transition-all duration-200 ${hoveredIndex !== index ? "opacity-70" : "opacity-100"
                                            }`}
                                        style={{ backgroundImage: `url(${card.image})` }}
                                    ></div>
                                    <div
                                        className={`absolute inset-0 bg-black transition-all duration-200 ${hoveredIndex === index ? "bg-opacity-50" : "bg-opacity-40"
                                            }`}
                                    ></div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
                                        <div className="mb-2">{card.icon}</div>
                                        <h2 className="text-lg font-bold">{card.title}</h2>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Transparency;
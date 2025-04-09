// Transparency.js
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaUsers, FaProjectDiagram, FaMoneyBillWave, FaChartBar, FaUserFriends } from "react-icons/fa";
import BarangayCouncil from "./Transparency/BarangayCouncil";
import SK from "./Transparency/SK";
import BidsProjects from "./Transparency/BidsProjects";
import BudgetReports from "./Transparency/BudgetReports";
import ImplementationReports from "./Transparency/ImplementationReports";
import sklogo from "../../img/Logo/sk.png"; // Adjust the path as necessary
import barangaybonbon from "../../img/Logo/bonbon-logo.png";

const Transparency = () => {
    const [selectedCard, setSelectedCard] = useState(null);
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const cards = [
        { title: "Barangay Council", image: barangaybonbon, icon: <FaUsers size={20} /> },
        { title: "Sanguniang Kabataan (SK)", image: sklogo, icon: <FaUserFriends size={20} /> },
        { title: "Bids and Projects", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg", icon: <FaProjectDiagram size={20} /> },
        { title: "Budget & Financial Reports", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg", icon: <FaMoneyBillWave size={20} /> },
        { title: "Implementation Reports", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg", icon: <FaChartBar size={20} /> },
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
                return <BidsProjects />;
            case "Budget & Financial Reports":
                return <BudgetReports />;
            case "Implementation Reports":
                return <ImplementationReports />;
            default:
                return null;
        }
    };

    const centerVariants = {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
        exit: { opacity: 0, scale: 0.5, transition: { duration: 0.5, ease: "easeIn" } },
    };

    return (
        <div className="p-4 min-h-screen select-none">
            <AnimatePresence mode="wait">
                {selectedCard ? (
                    <motion.div
                        key="content"
                        className="bg-white p-4 rounded-lg shadow-lg max-w-5xl mx-auto w-full"
                        variants={centerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <div className="flex items-center mb-4 space-x-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleBackClick}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                                >
                                    <FaArrowLeft />
                                    Back
                                </button>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-700">
                                {selectedCard}
                            </h1>
                        </div>
                        {/* Add separator here */}
                        <hr className="border-t border-gray-300 my-2" />
                        {renderContent()}
                    </motion.div>
                ) : (
                    <motion.div
                        key="cards"
                        variants={centerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="max-w-6xl mx-auto w-full"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cards.map((card, index) => (
                                <motion.div
                                    key={index}
                                    className="relative aspect-square rounded-lg overflow-hidden shadow-md cursor-pointer"
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    onClick={() => handleCardClick(card)}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                >
                                    <div
                                        className={`absolute inset-0 bg-cover bg-center transition-all duration-300 ${hoveredIndex !== index ? "blur-sm opacity-80" : "opacity-100"}`}
                                        style={{ backgroundImage: `url(${card.image})` }}
                                    ></div>
                                    <div className={`absolute inset-0 bg-black transition-all duration-300 ${hoveredIndex === index ? "bg-opacity-50" : "bg-opacity-40"}`}></div>
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
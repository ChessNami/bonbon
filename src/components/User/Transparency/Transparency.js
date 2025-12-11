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
    const [isLoading, setIsLoading] = useState(true);

    // This controls the former modal from parent
    const [showFormer, setShowFormer] = useState(false);
    const [formerType, setFormerType] = useState(""); // "barangay" or "sk"

    const cards = [
        { title: "Barangay Council", image: barangaybonbon, icon: <FaUsers size={20} /> },
        { title: "Sanguniang Kabataan (SK)", image: sklogo, icon: <FaUserFriends size={20} /> },
        { title: "Bids and Projects", image: bids, icon: <FaProjectDiagram size={20} /> },
        { title: "Budget & Financial Reports", image: budget, icon: <FaMoneyBillWave size={20} /> },
        { title: "Implementation Reports", image: implementation, icon: <FaChartBar size={20} /> },
        { title: "Feedback", image: feedbackImg, icon: <FaComment size={20} /> },
    ];

    const handleCardClick = (card) => setSelectedCard(card.title);
    const handleBackClick = () => setSelectedCard(null);

    const openFormerModal = (type) => {
        setFormerType(type);
        setShowFormer(true);
    };

    const renderContent = () => {
        switch (selectedCard) {
            case "Barangay Council":
                return <BarangayCouncil showFormer={showFormer && formerType === "barangay"} onCloseFormer={() => setShowFormer(false)} />;
            case "Sanguniang Kabataan (SK)":
                return <SK showFormer={showFormer && formerType === "sk"} onCloseFormer={() => setShowFormer(false)} />;
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

    // Image preloading...
    useEffect(() => {
        const images = [barangaybonbon, sklogo, bids, budget, implementation, feedbackImg];
        let loaded = 0;
        const onLoad = () => {
            loaded++;
            if (loaded === images.length) {
                setTimeout(() => setIsLoading(false), 1500);
            }
        };
        images.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onload = img.onerror = onLoad;
        });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <AnimatePresence mode="wait">
                {selectedCard ? (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 sm:p-6 lg:p-8"
                    >
                        {/* Header with Back + Title + Former Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleBackClick}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                >
                                    <FaArrowLeft /> Back
                                </button>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{selectedCard}</h1>
                            </div>

                            {/* Former Buttons – Right Side */}
                            <div className="flex justify-end">
                                {selectedCard === "Barangay Council" && (
                                    <button
                                        onClick={() => openFormerModal("barangay")}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
                                    >
                                        Former Punong Barangay
                                    </button>
                                )}
                                {selectedCard === "Sanguniang Kabataan (SK)" && (
                                    <button
                                        onClick={() => openFormerModal("sk")}
                                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition shadow-lg"
                                    >
                                        Former SK Chairman
                                    </button>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-300 my-4" />
                        <div>{renderContent()}</div>
                    </motion.div>
                ) : (
                    // Cards Grid (unchanged)
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="max-w-6xl mx-auto p-6 relative"
                    >
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/80">
                                <Loader />
                            </div>
                        )}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${isLoading ? "opacity-30" : "opacity-100"} transition-opacity`}>
                            {cards.map((card, i) => (
                                <motion.div
                                    key={i}
                                    className="relative aspect-square rounded-2xl overflow-hidden shadow-lg cursor-pointer group"
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => handleCardClick(card)}
                                >
                                    <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
                                        {card.icon}
                                        <h3 className="mt-4 text-xl font-bold">{card.title}</h3>
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
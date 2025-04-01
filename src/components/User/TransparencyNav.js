import React, { useState } from "react";

const TransparencyNav = ({ cards, onCardClick }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`relative w-full h-64 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 cursor-pointer 
                        ${hoveredIndex === index ? "scale-105 shadow-xl" : "scale-100"}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => onCardClick(card.route)}
                >
                    {/* Background Image */}
                    <div
                        className={`absolute inset-0 bg-cover bg-center transition-all duration-300 
                        ${hoveredIndex !== null && hoveredIndex !== index ? "blur-md opacity-70" : "opacity-100"}`}
                        style={{ backgroundImage: `url(${card.image})` }}
                    ></div>

                    {/* Black Overlay */}
                    <div className={`absolute inset-0 transition-all ${hoveredIndex === index ? "bg-black bg-opacity-50" : "bg-black bg-opacity-40"}`}></div>

                    {/* Title */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <h2 className="text-white text-lg font-bold text-center px-4 drop-shadow-md">
                            {card.title}
                        </h2>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TransparencyNav;

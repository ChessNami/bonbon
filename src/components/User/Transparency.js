import React, { useState } from "react";

const Transparency = () => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const cards = [
        { title: "Barangay Council", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg" },
        { title: "Sanguniang Kabataan (SK)", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg" },
        { title: "Bids and Projects", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg" },
        { title: "Budget & Financial Reports", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg" },
        { title: "Implementation Reports", image: "https://i.ytimg.com/vi/gKK6iynG6os/maxresdefault.jpg" },
    ];

    const handleCardClick = (title) => {
        console.log(`Clicked on: ${title}`);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Transparency Page</h1>
            <p className="text-lg text-gray-700 mb-4 text-center">
                Welcome to the Transparency page of Barangay Bonbon.
            </p>

            {/* Grid for first three items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {cards.slice(0, 3).map((card, index) => (
                    <div
                        key={index}
                        className={`relative w-full h-64 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 cursor-pointer 
                            ${hoveredIndex === index ? "scale-105 shadow-xl" : "scale-100"}`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => handleCardClick(card.title)}
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

            {/* Centered Last Row for 2 Cards */}
            {cards.length % 3 === 2 && (
                <div className="flex justify-center mt-6 gap-6">
                    {cards.slice(-2).map((card, index) => (
                        <div
                            key={index + cards.length - 2} // Ensures unique index reference
                            className={`relative w-full sm:w-[48%] md:w-[30%] h-64 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 cursor-pointer 
                                ${hoveredIndex === index + cards.length - 2 ? "scale-105 shadow-xl" : "scale-100"}`}
                            onMouseEnter={() => setHoveredIndex(index + cards.length - 2)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => handleCardClick(card.title)}
                        >
                            {/* Background Image */}
                            <div
                                className={`absolute inset-0 bg-cover bg-center transition-all duration-300 
                                ${hoveredIndex !== null && hoveredIndex !== index + cards.length - 2 ? "blur-md opacity-70" : "opacity-100"}`}
                                style={{ backgroundImage: `url(${card.image})` }}
                            ></div>

                            {/* Black Overlay */}
                            <div className={`absolute inset-0 transition-all ${hoveredIndex === index + cards.length - 2 ? "bg-black bg-opacity-50" : "bg-black bg-opacity-40"}`}></div>

                            {/* Title */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <h2 className="text-white text-lg font-bold text-center px-4 drop-shadow-md">
                                    {card.title}
                                </h2>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Transparency;

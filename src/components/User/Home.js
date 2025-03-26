import React, { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"; // Icons for navigation

const images = [
    { id: 1, name: "Sample 1", description: "Description for Sample 1", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg" },
    { id: 2, name: "Sample 2", description: "Description for Sample 2", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg" },
    { id: 3, name: "Sample 3", description: "Description for Sample 3", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg" },
    { id: 4, name: "Sample 4", description: "Description for Sample 4", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg" },
    { id: 5, name: "Sample 5", description: "Description for Sample 5", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg" },
    { id: 6, name: "Sample 6", description: "Description for Sample 6", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg" },
];

const itemsPerView = 3; // Number of visible cards
const cardWidth = 320; // Each card width including padding

const CardCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    // Generate the dynamic list of images based on currentIndex
    const visibleImages = Array.from({ length: itemsPerView }, (_, i) =>
        images[(currentIndex + i) % images.length]
    );

    return (
        <div className="relative w-full max-w-[960px] mx-auto overflow-hidden">
            {/* Wrapper */}
            <div className="overflow-hidden">
                {/* Track */}
                <div className="flex transition-transform duration-500 ease-in-out">
                    {visibleImages.map((item) => (
                        <div key={item.id} style={{ width: cardWidth }} className="flex-none p-2">
                            <div className="h-80 w-full rounded-lg overflow-hidden shadow-lg bg-white flex flex-col">
                                {/* Image */}
                                <div className="h-48 w-full">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                {/* Text Content */}
                                <div className="p-4">
                                    <h2 className="text-lg font-bold">{item.name}</h2>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Buttons */}
            <button
                onClick={prevSlide}
                className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800 text-white p-3 rounded-full hover:bg-gray-900 transition"
            >
                <FiChevronLeft size={24} />
            </button>

            <button
                onClick={nextSlide}
                className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800 text-white p-3 rounded-full hover:bg-gray-900 transition"
            >
                <FiChevronRight size={24} />
            </button>
        </div>
    );
};

export default CardCarousel;
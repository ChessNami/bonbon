import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react"; // Icons for navigation and close

const images = [
    { id: 1, name: "Sample 1", description: "Description for Sample 1", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg" },
    { id: 2, name: "Sample 2", description: "Description for Sample 2", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg" },
    { id: 3, name: "Sample 3", description: "Description for Sample 3", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg" },
    { id: 4, name: "Sample 4", description: "Description for Sample 4", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg" },
    { id: 5, name: "Sample 5", description: "Description for Sample 5", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg" },
    { id: 6, name: "Sample 6", description: "Description for Sample 6", image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg" },
];

const itemsPerView = 5; // Number of visible cards
const cardWidth = 320; // Each card width including padding

const Home = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedImage, setSelectedImage] = useState(null);

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            nextSlide();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const visibleImages = Array.from({ length: itemsPerView }, (_, i) =>
        images[(currentIndex + i) % images.length]
    );

    return (
        <div className="relative w-full max-w-[1800px] mx-auto overflow-hidden p-6">
            <div className="overflow-hidden relative flex items-center justify-center">
                <button onClick={prevSlide} className="absolute left-0 z-20 bg-gray-800 text-white p-3 rounded-full hover:bg-gray-900 transition">
                    <ChevronLeft size={24} />
                </button>

                <div className="flex transition-transform duration-500 ease-in-out mx-12">
                    {visibleImages.map((item) => (
                        <div key={item.id} style={{ width: cardWidth }} className="flex-none p-3">
                            <div 
                                className="h-80 w-full rounded-lg overflow-hidden shadow-lg bg-white flex flex-col cursor-pointer"
                                onClick={() => setSelectedImage(item)}
                            >
                                <div className="h-48 w-full">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-4">
                                    <h2 className="text-lg font-bold">{item.name}</h2>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={nextSlide} className="absolute right-0 z-20 bg-gray-800 text-white p-3 rounded-full hover:bg-gray-900 transition">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Additional Cards */}
            <div className="mt-8 flex justify-center gap-6">
                {["Facebook", "Service"].map((title, index) => (
                    <div
                        key={index}
                        className="w-64 bg-white shadow-lg rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setSelectedImage({
                            name: title,
                            image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg",
                            description: `Learn more about our ${title.toLowerCase()}.`
                        })}
                    >
                        <img src="https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg" alt={title} className="w-full h-40 object-cover" />
                        <div className="p-4">
                            <h3 className="text-lg font-bold">{title}</h3>
                            <p className="text-sm text-gray-600">Click to view more details.</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Full Image */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="relative bg-white p-6 rounded-lg max-w-2xl w-full">
                        <button onClick={() => setSelectedImage(null)} className="absolute top-3 right-3 bg-gray-800 text-white p-2 rounded-full">
                            <X size={20} />
                        </button>
                        <img src={selectedImage.image} alt={selectedImage.name} className="w-full h-auto rounded-lg" />
                        <h2 className="mt-4 text-xl font-bold text-center">{selectedImage.name}</h2>
                        <p className="text-center text-gray-600">{selectedImage.description}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;

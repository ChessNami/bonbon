import React from "react";
import { motion } from "framer-motion";

const announcements = [
    {
        id: 1,
        name: "Company Event",
        when: "2023-11-15 10:00 - 12:00",
        where: "Main Conference Room",
        description: "Join us for an exciting company-wide meeting to discuss upcoming projects and strategies.",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg",
        link: "https://example.com/event/1"
    },
    {
        id: 2,
        name: "Product Launch",
        when: "2023-11-20 14:00 - 16:00",
        where: "Online Webinar",
        description: "Launch of our new product line. Register now to get exclusive access!",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg",
        link: "https://example.com/event/2"
    },
    {
        id: 3,
        name: "Team Building",
        when: "2023-12-01 09:00 - 17:00",
        where: "Local Park",
        description: "A fun day out for team bonding and outdoor activities. All employees are encouraged to attend.",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg",
        link: "https://example.com/event/3"
    },
    {
        id: 4,
        name: "Training Session",
        when: "2023-12-10 11:00 - 13:00",
        where: "Training Room A",
        description: "Mandatory training session on new software tools. Bring your laptops.",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/dota-2.jpg",
        link: "https://example.com/event/4"
    },
    {
        id: 5,
        name: "Holiday Party",
        when: "2023-12-20 18:00 - 22:00",
        where: "Company Hall",
        description: "Celebrate the holidays with your colleagues. Food, music, and fun activities included!",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/winter-3.jpg",
        link: "https://example.com/event/5"
    },
    {
        id: 6,
        name: "Annual Review",
        when: "2024-01-05 09:00 - 11:00",
        where: "Board Room",
        description: "Annual performance reviews and goal setting for the upcoming year.",
        image: "https://www.yudiz.com/codepen/expandable-animated-card-slider/rdr-2.jpg",
        link: "https://example.com/event/6"
    },
];

const Home = () => {
    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    return (
        <div className="relative w-full mx-auto p-4 min-h-screen md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row">
                {/* Left: Announcements */}
                <div className="w-full md:w-3/4 bg-white p-4 rounded-md shadow-md">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Announcements and Events</h1>

                    {/* Separator line below title */}
                    <div className="w-full border-b border-gray-300 my-4"></div>

                    <div className="space-y-6 p-4 md:p-6">
                        {announcements.map((item) => (
                            <motion.div
                                key={item.id}
                                className="bg-[#dee5f8] p-4 rounded shadow-md border border-gray-200 flex flex-col lg:flex-row"
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <div className="w-full lg:w-1/3 mb-4 lg:mb-0 lg:mr-4">
                                    <div className="aspect-video w-full rounded overflow-hidden">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="w-full lg:w-2/3">
                                    <h2 className="text-gray-700 mb-2 text-xl font-bold">{item.name}</h2>
                                    <p className="text-lg text-gray-600">
                                        <span className="font-bold">Date:</span> {item.when.split(" ")[0]}<br />
                                        <span className="font-bold">Time:</span> {item.when.split(" ").slice(1).join(" ")}<br />
                                        <span className="font-bold">Where:</span> {item.where}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block border-l border-gray-300 mx-4"></div>

                {/* Right: Vertical Mini Cards */}
                <div className="w-full md:w-1/4 flex flex-col gap-4">
                    {announcements.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition"
                        >
                            <div className="overflow-hidden rounded-t-lg aspect-video w-full">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="p-2 text-center">
                                <h3 className="text-sm font-bold text-gray-700">{item.name}</h3>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;
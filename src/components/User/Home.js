// src/components/User/Home.js
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";
import Loader from "../Loader";
import MiniCalendar from "./MiniCalendar";

const Home = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const eventsWithImages = await Promise.all(
                data.map(async (event) => {
                    let imageUrl = null;
                    if (event.image_url) {
                        const { data: urlData, error: urlError } = await supabase.storage
                            .from("event-photos")
                            .createSignedUrl(event.image_url, 120);

                        if (urlError) throw urlError;
                        imageUrl = urlData.signedUrl;
                    }
                    return { ...event, image: imageUrl };
                })
            );

            setAnnouncements(eventsWithImages);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to load events: " + error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatDates = (dates) => {
        if (!dates || dates.length === 0) return "No dates";

        const sortedDates = dates
            .map((date) => new Date(date))
            .sort((a, b) => a - b)
            .map((date) => date.toISOString().split("T")[0]);

        if (sortedDates.length === 1) {
            const date = new Date(sortedDates[0]);
            return date.toLocaleString("default", {
                month: "long",
                day: "numeric",
                year: "numeric",
            });
        }

        const result = [];
        let start = new Date(sortedDates[0]);
        let end = start;

        for (let i = 1; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const prev = new Date(sortedDates[i - 1]);
            const nextDay = new Date(prev);
            nextDay.setDate(prev.getDate() + 1);

            if (
                current.toISOString().split("T")[0] ===
                nextDay.toISOString().split("T")[0]
            ) {
                end = current;
            } else {
                if (start.toDateString() === end.toDateString()) {
                    result.push(
                        start.toLocaleString("default", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })
                    );
                } else {
                    const startMonth = start.toLocaleString("default", { month: "long" });
                    const startDay = start.toLocaleString("default", { day: "numeric" });
                    const endDay = end.toLocaleString("default", { day: "numeric" });
                    const year = end.toLocaleString("default", { year: "numeric" });
                    result.push(`${startMonth} ${startDay}-${endDay}, ${year}`);
                }
                start = current;
                end = current;
            }

            if (i === sortedDates.length - 1) {
                if (start.toDateString() === end.toDateString()) {
                    result.push(
                        start.toLocaleString("default", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })
                    );
                } else {
                    const startMonth = start.toLocaleString("default", { month: "long" });
                    const startDay = start.toLocaleString("default", { day: "numeric" });
                    const endDay = end.toLocaleString("default", { day: "numeric" });
                    const year = end.toLocaleString("default", { year: "numeric" });
                    result.push(`${startMonth} ${startDay}-${endDay}, ${year}`);
                }
            }
        }

        return result.join(", ");
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isModalOpen]);

    return (
        <div className="relative w-full mx-auto p-2 sm:p-4 md:p-6 lg:p-8 min-h-screen">
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:space-x-4">
                {/* Left: Announcements */}
                <div className="w-full bg-white p-2 sm:p-4 rounded-md shadow-md">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-4">
                        Announcements and Events
                    </h1>
                    <div className="w-full border-b border-gray-300 my-2 sm:my-4"></div>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader />
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
                            {announcements.map((item) => (
                                <motion.div
                                    key={item.id}
                                    className="bg-[#dee5f8] p-2 sm:p-4 rounded shadow-md border border-gray-200 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4"
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
                                        <div className="aspect-video w-full rounded overflow-hidden">
                                            <img
                                                src={
                                                    item.image ||
                                                    "https://via.placeholder.com/300x200"
                                                }
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-2/3">
                                        <h2 className="text-gray-700 mb-1 sm:mb-2 text-lg sm:text-xl font-bold">
                                            {item.title}
                                        </h2>
                                        <p className="text-sm sm:text-lg text-gray-600">
                                            <span className="font-bold">Date:</span>{" "}
                                            {formatDates(item.dates)}
                                            <br />
                                            <span className="font-bold">Time:</span>{" "}
                                            {item.whole_day
                                                ? "Whole Day"
                                                : `${item.start_time} - ${item.end_time}`}
                                            <br />
                                            <span className="font-bold">Where:</span>{" "}
                                            {item.location}
                                        </p>
                                        <p className="mt-1 sm:mt-2 text-gray-500 text-xs sm:text-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Mini Calendar and Mini Cards */}
                <div className="w-full md:w-1/4 flex flex-col gap-4">
                    {/* Mini Calendar */}
                    <MiniCalendar setIsModalOpen={setIsModalOpen} />
                    {/* Mini Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-4">
                        {announcements.map((item) => (
                            <a
                                key={item.id}
                                href={`https://example.com/event/${item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition"
                            >
                                <div className="overflow-hidden rounded-t-lg aspect-video w-full">
                                    <img
                                        src={
                                            item.image ||
                                            "https://via.placeholder.com/300x200"
                                        }
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-1 sm:p-2 text-center">
                                    <h3 className="text-xs sm:text-sm font-bold text-gray-700 line-clamp-2">
                                        {item.title}
                                    </h3>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";
import Loader from "../Loader";
import MiniCalendar from "./MiniCalendar";

const Home = () => {
    const [allEvents, setAllEvents] = useState([]); // Store all events (including past)
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchEvents();
        // Subscribe to real-time changes
        const subscription = supabase
            .channel('events-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                fetchEvents(); // Refetch data when any change occurs
            })
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchEvents = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("events")
                .select("*")
                .order("created_at", { ascending: false }); // Sort by created_at descending (latest first)

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

            setAllEvents(eventsWithImages); // Store all events for announcements
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

    // Filter upcoming events and determine the earliest future date for display
    const upcomingEvents = allEvents
        .map((event) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today

            // Find the earliest future date from event.dates
            const futureDates = event.dates
                .map((date) => new Date(date))
                .filter((date) => {
                    date.setHours(0, 0, 0, 0); // Normalize date
                    return date >= today;
                })
                .sort((a, b) => a - b);

            // If there are future dates, return the event with the earliest future date
            if (futureDates.length > 0) {
                return { ...event, displayDate: futureDates[0] };
            }
            return null;
        })
        .filter((event) => event !== null); // Remove events with no future dates

    const handleEventClick = (e, facebookLink) => {
        if (!facebookLink) {
            e.preventDefault();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "info",
                title: "No Facebook Link",
                text: "This event does not have a Facebook post link.",
                showConfirmButton: false,
                timer: 1500,
            });
        }
        // If facebookLink exists, the <a> tag's href will handle the navigation
    };

    return (
        <div className="relative w-full mx-auto p-2 sm:p-4 md:p-6 lg:p-8 min-h-screen">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left: Announcements (all events, latest to oldest) */}
                <div className="w-full lg:w-3/4 bg-white p-2 sm:p-4 rounded-md shadow-md">
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
                            {allEvents.map((item) => (
                                <motion.div
                                    key={item.id}
                                    className="bg-[#dee5f8] p-2 sm:p-4 rounded shadow-md border border-gray-200 flex flex-col sm:flex-row gap-4"
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <div className="w-full sm:w-1/3">
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
                                        <h2 className="text-gray-700 mb-1 sm:mb-2 text-lg sm:text-xl font-bold capitalize">
                                            {item.title}
                                        </h2>
                                        <p className="text-sm sm:text-lg text-gray-600 capitalize">
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
                                        <p className="mt-1 sm:mt-2 text-gray-500 text-sm sm:text-sm">
                                            {item.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Mini Calendar and Upcoming Events */}
                <div className="w-full lg:w-1/4 flex flex-col gap-4">
                    {/* Mini Calendar */}
                    <MiniCalendar setIsModalOpen={setIsModalOpen} />

                    {/* Upcoming Events (only future events) */}
                    <div className="space-y-2 sm:space-y-4">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Upcoming Events</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-4">
                            {upcomingEvents.slice(0, 4).map((item) => (
                                <a
                                    key={item.id}
                                    href={item.facebook_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => handleEventClick(e, item.facebook_link)}
                                    className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-md transition-all duration-200"
                                >
                                    <div className="overflow-hidden rounded-t-lg aspect-video w-full">
                                        <img
                                            src={
                                                item.image ||
                                                "https://via.placeholder.com/300x200"
                                            }
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-2 text-center">
                                        <h3 className="text-xs sm:text-sm font-bold text-gray-700 line-clamp-2 capitalize">
                                            {item.title}
                                        </h3>
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                            {item.displayDate.toLocaleDateString()}
                                        </p>
                                    </div>
                                </a>
                            ))}
                            {upcomingEvents.length === 0 && !isLoading && (
                                <p className="text-gray-500 text-sm text-center">No upcoming events</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
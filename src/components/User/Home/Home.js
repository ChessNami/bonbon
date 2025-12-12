import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../supabaseClient";
import Swal from "sweetalert2";
import Loader from "../../Loader";
import MiniCalendar from "./MiniCalendar";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const Home = () => {
    const [allEvents, setAllEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(5); // For announcements
    const [currentPage, setCurrentPage] = useState(1); // For announcements
    const [upcomingItemsPerPage, setUpcomingItemsPerPage] = useState(4); // For upcoming events
    const [upcomingCurrentPage, setUpcomingCurrentPage] = useState(1); // For upcoming events

    useEffect(() => {
        fetchEvents();
        const subscription = supabase
            .channel('events-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                fetchEvents();
            })
            .subscribe();

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

            setAllEvents(eventsWithImages);
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

    const upcomingEvents = allEvents
        .filter((event) => event.create_type === "event") // Filter for event type only
        .map((event) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 30);

            const futureDates = event.dates
                .map((date) => new Date(date))
                .filter((date) => {
                    date.setHours(0, 0, 0, 0);
                    return date >= today && date <= thirtyDaysFromNow;
                })
                .sort((a, b) => a - b);

            if (futureDates.length > 0) {
                return { ...event, displayDate: futureDates[0] };
            }
            return null;
        })
        .filter((event) => event !== null);

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
    };

    // Pagination for announcements
    const totalPages = Math.ceil(allEvents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEvents = allEvents.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Pagination for upcoming events
    const upcomingTotalPages = Math.ceil(upcomingEvents.length / upcomingItemsPerPage);
    const upcomingStartIndex = (upcomingCurrentPage - 1) * upcomingItemsPerPage;
    const paginatedUpcomingEvents = upcomingEvents.slice(upcomingStartIndex, upcomingStartIndex + upcomingItemsPerPage);

    const handleUpcomingPageChange = (page) => {
        setUpcomingCurrentPage(page);
    };

    const handleUpcomingItemsPerPageChange = (e) => {
        setUpcomingItemsPerPage(Number(e.target.value));
        setUpcomingCurrentPage(1);
    };

    return (
        <div className="relative w-full mx-auto p-2 sm:p-4 md:p-6 lg:p-8 min-h-screen">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left: Announcements */}
                <div className="w-full lg:w-3/4 bg-white p-2 sm:p-4 rounded-md shadow-md flex flex-col">
                    <div className="flex justify-between items-center mb-2 sm:mb-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                            Announcements and Events
                        </h1>
                        <div className="flex items-center gap-2">
                            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                                Show:
                            </label>
                            <select
                                id="itemsPerPage"
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="border border-gray-300 rounded-md p-1 text-sm"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={20}>20</option>
                            </select>
                        </div>
                    </div>
                    <div className="w-full border-b border-gray-300 my-2 sm:my-4"></div>
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader />
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
                                {paginatedEvents.map((item) => (
                                    <a
                                        key={item.id}
                                        href={item.facebook_link || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => handleEventClick(e, item.facebook_link)}
                                        className="block"
                                    >
                                        <motion.div
                                            className="bg-[#dee5f8] p-2 sm:p-4 rounded shadow-md border border-gray-200 flex flex-col sm:flex-row gap-4 hover:shadow-lg transition-shadow duration-200"
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <div className="w-full sm:w-1/3">
                                                <div className="aspect-video w-full rounded overflow-hidden">
                                                    <img
                                                        src={
                                                            item.image ||
                                                            "https://www.rootinc.com/wp-content/uploads/2022/11/placeholder-1.png"
                                                        }
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-2/3">
                                                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                                    <h2 className="text-gray-700 text-lg sm:text-xl font-bold capitalize">
                                                        {item.title}
                                                    </h2>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${item.create_type === "event" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                                                        {item.create_type === "event" ? "Event" : "Announcement"}
                                                    </span>
                                                </div>
                                                <p className="text-sm sm:text-lg text-gray-600 capitalize">
                                                    <span className="font-bold">Date:</span>{" "}
                                                    {formatDates(item.dates)}
                                                    {item.create_type === "event" && (
                                                        <>
                                                            <br />
                                                            <span className="font-bold">Time:</span>{" "}
                                                            {item.whole_day
                                                                ? "Whole Day"
                                                                : `${item.start_time || "N/A"} - ${item.end_time || "N/A"}`}
                                                            <br />
                                                            <span className="font-bold">Where:</span>{" "}
                                                            {item.location || "N/A"}
                                                        </>
                                                    )}
                                                </p>
                                                <p className="mt-1 sm:mt-2 text-gray-500 text-sm sm:text-sm">
                                                    {item.description.split(/(\s+)/).map((word, index) =>
                                                        word.startsWith('#') ? (
                                                            <span key={index} className="text-blue-500 font-semibold">
                                                                {word}
                                                            </span>
                                                        ) : (
                                                            word
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </a>
                                ))}
                                {paginatedEvents.length === 0 && (
                                    <p className="text-gray-500 text-center">No events to display</p>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Pagination Controls at Bottom */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4 pb-4">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                                <FaChevronLeft />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1 rounded ${currentPage === page
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 hover:bg-gray-300"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Mini Calendar and Upcoming Events */}
                <div className="w-full lg:w-1/4 flex flex-col gap-4">
                    <MiniCalendar setIsModalOpen={setIsModalOpen} />
                    <div className="flex flex-col space-y-2 sm:space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                                Upcoming Events (Next 30 Days)
                            </h2>
                            <div className="flex items-center gap-2">
                                <label htmlFor="upcomingItemsPerPage" className="text-sm text-gray-600">
                                    Show:
                                </label>
                                <select
                                    id="upcomingItemsPerPage"
                                    value={upcomingItemsPerPage}
                                    onChange={handleUpcomingItemsPerPageChange}
                                    className="border border-gray-300 rounded-md p-1 text-sm"
                                >
                                    <option value={4}>4</option>
                                    <option value={8}>8</option>
                                    <option value={12}>12</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-4">
                            {paginatedUpcomingEvents.map((item) => (
                                <a
                                    key={item.id}
                                    href={item.facebook_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => handleEventClick(e, item.facebook_link)}
                                    className="bg-white border border-gray-200 rounded-xl shadow hover:shadow-lg transition-all duration-300 overflow-hidden"
                                >
                                    <div className="overflow-hidden aspect-video w-full">
                                        <img
                                            src={item.image || "https://www.rootinc.com/wp-content/uploads/2022/11/placeholder-1.png"}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-gray-800 line-clamp-2 capitalize">
                                                {item.title}
                                            </h3>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.create_type === "event" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                                                {item.create_type === "event" ? "Event" : "Announcement"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            {item.displayDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                        </p>

                                        {/* Show location map if available */}
                                        {item.location_lat && item.location_lng && (
                                            <div className="mt-3">
                                                <p className="text-xs font-medium text-blue-700 mb-1">Location:</p>
                                                <div className="h-40 rounded-lg overflow-hidden border border-gray-300">
                                                    <MapContainer
                                                        center={[item.location_lat, item.location_lng]}
                                                        zoom={16}
                                                        style={{ height: "100%", width: "100%" }}
                                                        scrollWheelZoom={false}
                                                        zoomControl={false}
                                                    >
                                                        <TileLayer
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                            attribution='&copy; OpenStreetMap'
                                                        />
                                                        <Marker position={[item.location_lat, item.location_lng]} />
                                                    </MapContainer>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 truncate">
                                                    {item.location || "Pinned location"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </a>
                            ))}
                            {paginatedUpcomingEvents.length === 0 && !isLoading && (
                                <p className="text-gray-500 text-sm text-center col-span-2 lg:col-span-1">
                                    No upcoming events in the next 30 days
                                </p>
                            )}
                        </div>
                        {/* Pagination for Upcoming Events */}
                        {upcomingTotalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-2">
                                <button
                                    onClick={() => handleUpcomingPageChange(upcomingCurrentPage - 1)}
                                    disabled={upcomingCurrentPage === 1}
                                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                                >
                                    <FaChevronLeft />
                                </button>
                                {Array.from({ length: upcomingTotalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handleUpcomingPageChange(page)}
                                        className={`px-3 py-1 rounded ${upcomingCurrentPage === page
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-200 hover:bg-gray-300"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleUpcomingPageChange(upcomingCurrentPage + 1)}
                                    disabled={upcomingCurrentPage === upcomingTotalPages}
                                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
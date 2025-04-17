import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";

const MiniCalendar = ({ setIsModalOpen }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [userEvents, setUserEvents] = useState({});
    const [holidays, setHolidays] = useState([]);
    const [modalData, setModalData] = useState(null);
    const modalRef = useRef(null);

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totalSlots = 42;
    const emptySlots = firstDayOfMonth;
    const remainingSlots = totalSlots - (emptySlots + daysArray.length);

    const fetchHolidays = useCallback(async () => {
        try {
            const response = await fetch(
                `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/PH`
            );
            const data = await response.json();
            setHolidays(data);
        } catch (error) {
            console.error("Error fetching holidays:", error);
        }
    }, [selectedYear]);

    const fetchUserEvents = async () => {
        try {
            const { data, error } = await supabase.from("events").select("*");

            if (error) throw error;

            const eventsWithImages = await Promise.all(
                data.map(async (event) => {
                    let imageUrl = null;
                    if (event.image_url) {
                        const { data: signedUrlData, error: signedUrlError } =
                            await supabase.storage
                                .from("event-photos")
                                .createSignedUrl(event.image_url, 3600);

                        if (signedUrlError) {
                            console.error(
                                `Error generating signed URL for event ${event.id}:`,
                                signedUrlError
                            );
                        } else {
                            imageUrl = signedUrlData.signedUrl;
                        }
                    }
                    return { ...event, signedImageUrl: imageUrl };
                })
            );

            const eventsByDate = eventsWithImages.reduce((acc, event) => {
                event.dates.forEach((date) => {
                    acc[date] = acc[date] ? [...acc[date], event] : [event];
                });
                return acc;
            }, {});

            setUserEvents(eventsByDate);
        } catch (error) {
            console.error("Error fetching user events:", error);
            Swal.fire({
                icon: "error",
                title: "Fetch Error",
                text: "Failed to fetch events: " + error.message,
            });
        }
    };

    useEffect(() => {
        fetchHolidays();
        fetchUserEvents();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('calendar-events-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                fetchUserEvents(); // Refetch data when any change occurs
            })
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            subscription.unsubscribe();
        };
    }, [selectedYear, fetchHolidays]);

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const handleLeftClick = (dateKey) => {
        const holiday = holidays.find((h) => h.date === dateKey);
        const userEventsForDate = userEvents[dateKey] || [];
        setModalData({ dateKey, holiday, userEvents: userEventsForDate });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalData(null);
        setIsModalOpen(false);
    };

    const handleClickOutsideModal = useCallback(
        (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setModalData(null);
                setIsModalOpen(false);
            }
        },
        [setIsModalOpen]
    );

    useEffect(() => {
        if (modalData) {
            document.addEventListener("mousedown", handleClickOutsideModal);
        } else {
            document.removeEventListener("mousedown", handleClickOutsideModal);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutsideModal);
        };
    }, [modalData, handleClickOutsideModal]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 30 },
        },
        exit: { opacity: 0, scale: 0.8 },
    };

    return (
        <motion.div
            className="bg-white p-2 sm:p-4 rounded-lg shadow-md w-full border border-gray-200"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Controls */}
            <motion.div
                className="flex justify-between items-center mb-2 sm:mb-4"
                variants={itemVariants}
            >
                <div className="flex gap-1 sm:gap-2">
                    <motion.button
                        onClick={handlePrevMonth}
                        className="p-1 sm:p-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronLeft size={12} className="sm:w-4 sm:h-4 text-gray-600" />
                    </motion.button>
                    <motion.button
                        onClick={handleNextMonth}
                        className="p-1 sm:p-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronRight size={12} className="sm:w-4 sm:h-4 text-gray-600" />
                    </motion.button>
                </div>
                <motion.div
                    className="font-bold text-base sm:text-lg text-gray-800"
                    variants={itemVariants}
                >
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                    })}
                </motion.div>
            </motion.div>

            {/* Weekdays */}
            <motion.div
                className="grid grid-cols-7 text-center font-semibold text-[10px] sm:text-sm text-gray-700 mb-1 sm:mb-2"
                variants={containerVariants}
            >
                {weekDays.map((day, index) => (
                    <motion.div
                        key={day}
                        className={`p-1 sm:p-2 ${index === 0 ? "text-red-500" : ""}`}
                        variants={itemVariants}
                    >
                        {day}
                    </motion.div>
                ))}
            </motion.div>

            {/* Calendar Grid */}
            <motion.div
                className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[10px] sm:text-sm"
                variants={containerVariants}
            >
                {Array.from({ length: emptySlots }, (_, i) => (
                    <motion.div
                        key={`empty-${i}`}
                        className="p-1 sm:p-2 h-8 sm:h-12 bg-gray-100 rounded-md border border-gray-200"
                        variants={itemVariants}
                    />
                ))}
                {daysArray.map((day) => {
                    const dateKey = `${selectedYear}-${String(selectedMonth).padStart(
                        2,
                        "0"
                    )}-${String(day).padStart(2, "0")}`;
                    const isSunday =
                        new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
                    const isHoliday = holidays.some((h) => h.date === dateKey);
                    const today = new Date();
                    const isToday =
                        today.getFullYear() === selectedYear &&
                        today.getMonth() + 1 === selectedMonth &&
                        today.getDate() === day;
                    const hasEvents = userEvents[dateKey]?.length > 0;

                    let cellClass =
                        "p-1 sm:p-2 h-8 sm:h-12 rounded-md text-center relative cursor-pointer border";
                    cellClass += isToday
                        ? " bg-yellow-200 border-yellow-500"
                        : isHoliday
                            ? " bg-green-100 border-gray-300"
                            : isSunday
                                ? " text-red-500 bg-red-100 border-gray-300"
                                : " bg-white border-gray-300";
                    if (hasEvents) cellClass += " bg-blue-100";
                    cellClass += " hover:bg-gray-200 transition-colors";

                    return (
                        <motion.div
                            key={day}
                            className={cellClass}
                            onClick={() => handleLeftClick(dateKey)}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05 }}
                        >
                            <span className="font-medium">{day}</span>
                            {hasEvents && (
                                <div className="absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 w-1 sm:w-2 h-1 sm:h-2 bg-blue-500 rounded-full" />
                            )}
                        </motion.div>
                    );
                })}
                {Array.from({ length: remainingSlots }, (_, i) => (
                    <motion.div
                        key={`empty-end-${i}`}
                        className="p-1 sm:p-2 h-8 sm:h-12 bg-gray-100 rounded-md border border-gray-200"
                        variants={itemVariants}
                    />
                ))}
            </motion.div>

            {/* Legend */}
            <motion.div
                className="mt-2 sm:mt-4 pt-2 border-t border-gray-200"
                variants={itemVariants}
            >
                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 sm:w-3 h-2 sm:h-3 bg-yellow-200 border border-yellow-500 rounded" />
                        <span>Today</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 sm:w-3 h-2 sm:h-3 bg-red-100 rounded" />
                        <span>Sunday</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-100 rounded" />
                        <span>Holiday</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-100 rounded" />
                        <span>Event</span>
                    </div>
                </div>
            </motion.div>

            {/* Events Modal */}
            <AnimatePresence>
                {modalData && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClickOutsideModal}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white rounded-xl shadow-2xl w-[90%] sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 min-h-[60%] max-h-[95vh] overflow-y-auto pointer-events-auto"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center sticky top-0 bg-white p-4 border-b border-gray-300">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Events on {modalData.dateKey}
                                </h2>
                                <motion.button
                                    onClick={handleCloseModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={20} className="sm:w-6 sm:h-6" />
                                </motion.button>
                            </div>
                            <div className="p-4">
                                {modalData.holiday && (
                                    <div className="mb-4">
                                        <span className="font-bold text-xl text-gray-700">
                                            Holiday:
                                        </span>{" "}
                                        <span className="text-lg text-gray-600">
                                            {modalData.holiday.localName}
                                        </span>
                                    </div>
                                )}
                                {modalData.userEvents.length > 0 ? (
                                    modalData.userEvents.map((event, idx) => (
                                        <motion.div
                                            key={idx}
                                            className="bg-blue-100 p-4 rounded-lg mb-4 shadow-md"
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <h3 className="text-2xl font-bold text-gray-800 mb-2 capitalize">
                                                {event.title}
                                            </h3>
                                            <p className="text-lg text-gray-600">
                                                <span className="font-bold">Time: </span>
                                                {event.whole_day
                                                    ? "Whole Day"
                                                    : `${event.start_time} - ${event.end_time}`}
                                            </p>
                                            <p className="text-lg text-gray-600 mb-4 capitalize">
                                            <span className="font-bold">Where: </span>
                                                {event.location || "N/A"}
                                            </p>
                                            <p className="text-lg text-gray-600">
                                                {event.description || "N/A"}
                                            </p>
                                            {event.signedImageUrl && (
                                                <img
                                                    src={event.signedImageUrl}
                                                    alt={event.title}
                                                    className="mt-6 w-full h-auto max-h-96 object-cover rounded-lg"
                                                    onError={(e) =>
                                                    (e.target.src =
                                                        "https://via.placeholder.com/600x400")
                                                    }
                                                />
                                            )}
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-lg text-gray-600">
                                        No events scheduled.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MiniCalendar;
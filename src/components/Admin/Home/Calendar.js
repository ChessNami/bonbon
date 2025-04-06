import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

const Calendar = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, events, selectedDates, setSelectedDates }) => {
    const [holidays, setHolidays] = useState([]);
    const [modalData, setModalData] = useState(null);
    const modalRef = useRef(null);

    const currentYear = new Date().getFullYear();

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const response = await fetch(
                    `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/PH`
                );
                const data = await response.json();
                setHolidays(data);
            } catch (error) {
                console.error("Error fetching holidays:", error);
            }
        };
        fetchHolidays();
    }, [selectedYear]);

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

    const handleDateClick = (dateKey) => {
        if (selectedDates.includes(dateKey)) {
            setSelectedDates(selectedDates.filter((date) => date !== dateKey));
        } else if (selectedDates.length < 4) {
            setSelectedDates([...selectedDates, dateKey]);
        }
    };

    const handleLongPress = (dateKey) => {
        const holiday = holidays.find((h) => h.date === dateKey);
        const userEvents = events[dateKey] || [];
        setModalData({ dateKey, holiday, userEvents });
    };

    const handleCloseModal = () => {
        setModalData(null);
    };

    const handleClickOutsideModal = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setModalData(null);
        }
    };

    useEffect(() => {
        if (modalData) {
            document.addEventListener("mousedown", handleClickOutsideModal);
        } else {
            document.removeEventListener("mousedown", handleClickOutsideModal);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutsideModal);
        };
    }, [modalData]);

    const totalSlots = 42;
    const emptySlots = firstDayOfMonth;
    const filledSlots = daysArray.length;
    const remainingSlots = totalSlots - (emptySlots + filledSlots);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 } // Stagger animation for children
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
        exit: { opacity: 0, scale: 0.8 }
    };

    return (
        <motion.div
            className="bg-white p-4 rounded-lg shadow select-none w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Controls */}
            <motion.div
                className="flex flex-col md:flex-row md:justify-between items-center mb-4 gap-2"
                variants={itemVariants}
            >
                <div className="flex gap-2">
                    <motion.button
                        onClick={handlePrevMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronLeft size={20} />
                    </motion.button>
                    <motion.button
                        onClick={handleNextMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <FaChevronRight size={20} />
                    </motion.button>
                </div>

                <motion.div
                    className="font-bold text-lg sm:text-xl md:text-2xl uppercase underline underline-offset-4 text-center"
                    variants={itemVariants}
                >
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                </motion.div>

                <div className="flex gap-2 items-center">
                    <motion.select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                                {new Date(currentYear, month - 1, 1).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </motion.select>

                    <motion.select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                    >
                        {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </motion.select>
                </div>
            </motion.div>

            <div className="border-b border-gray-300 my-4"></div>

            {/* Weekdays */}
            <motion.div
                className="grid grid-cols-7 text-center font-semibold text-sm sm:text-base"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {weekDays.map((day, index) => (
                    <motion.div
                        key={day}
                        className={`p-2 ${index === 0 ? "text-red-500" : ""}`}
                        variants={itemVariants}
                    >
                        {day}
                    </motion.div>
                ))}
            </motion.div>

            {/* Calendar Grid */}
            <motion.div
                className="grid grid-cols-7 gap-1"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {Array.from({ length: emptySlots }, (_, i) => (
                    <motion.div
                        key={`empty-${i}`}
                        className="p-2 border rounded-lg h-12 sm:h-16 md:h-24 relative overflow-hidden bg-gray-100"
                        variants={itemVariants}
                    >
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1 left-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                            <div className="absolute top-1 right-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 left-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                        </div>
                    </motion.div>
                ))}
                {daysArray.map((day) => {
                    const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
                    const holiday = holidays.find((h) => h.date === dateKey);
                    const isSelected = selectedDates.includes(dateKey);
                    const selectionIndex = selectedDates.indexOf(dateKey) + 1;
                    const today = new Date();
                    const isToday =
                        today.getFullYear() === selectedYear &&
                        today.getMonth() + 1 === selectedMonth &&
                        today.getDate() === day;

                    return (
                        <motion.div
                            key={day}
                            className={`relative p-2 border rounded-lg h-12 sm:h-16 md:h-24 cursor-pointer text-xs sm:text-sm md:text-base 
                            flex flex-col items-center justify-center 
                            ${isSunday ? "text-red-500 bg-red-100" : ""}
                            ${holiday ? "bg-green-100" : ""}
                            ${isSelected ? "bg-blue-200 border-blue-500" : ""}
                            ${isToday ? "bg-yellow-200 border-yellow-500" : ""}`}
                            onClick={() => handleDateClick(dateKey)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPress(dateKey);
                            }}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="absolute top-1 right-1 text-xs font-bold">{day}</span>
                            {isSelected && <span className="text-blue-600 font-bold">{selectionIndex}</span>}
                            {holiday && <div className="hidden md:block text-xs bg-green-200 p-1 rounded">{holiday.localName}</div>}
                            {events[dateKey]?.map((event, idx) => (
                                <div key={idx} className="hidden md:block text-xs bg-blue-100 p-1 mt-1 rounded w-full text-center">
                                    {event}
                                </div>
                            ))}
                        </motion.div>
                    );
                })}
                {Array.from({ length: remainingSlots }, (_, i) => (
                    <motion.div
                        key={`empty-end-${i}`}
                        className="p-2 border rounded-lg h-12 sm:h-16 md:h-24 relative overflow-hidden bg-gray-100"
                        variants={itemVariants}
                    >
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-1 left-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                            <div className="absolute top-1 right-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 left-1 w-2 h-px bg-gray-400 transform -rotate-45"></div>
                            <div className="absolute bottom-1 right-1 w-2 h-px bg-gray-400 transform rotate-45"></div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Legend Section */}
            <motion.div
                className="mt-4 border-t pt-4"
                variants={itemVariants}
            >
                <h3 className="text-lg font-bold mb-2">Legend</h3>
                <motion.div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-yellow-200 border border-yellow-500 rounded"></div>
                        <span>Today</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
                        <span>Sunday</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                        <span>Holiday</span>
                    </motion.div>
                    <motion.div className="flex items-center gap-2" variants={itemVariants}>
                        <div className="w-4 h-4 bg-blue-200 border border-blue-500 rounded"></div>
                        <span>Selected Date</span>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {modalData && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            ref={modalRef}
                            className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">Events on {modalData.dateKey}</h2>
                                <motion.button
                                    onClick={handleCloseModal}
                                    className="text-gray-500 hover:text-gray-700 transition"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FaTimes size={20} />
                                </motion.button>
                            </div>
                            <div>
                                {modalData.holiday && (
                                    <div className="mb-2">
                                        <span className="font-bold">Holiday:</span> {modalData.holiday.localName}
                                    </div>
                                )}
                                {modalData.userEvents.length > 0 ? (
                                    modalData.userEvents.map((event, idx) => (
                                        <motion.div
                                            key={idx}
                                            className="bg-blue-100 p-2 rounded mb-2"
                                            variants={itemVariants}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            {event}
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-gray-500">No user-created events.</div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Calendar;
import React, { useState, useEffect, useRef } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

const Calendar = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, events, selectedDates, setSelectedDates }) => {
    const [holidays, setHolidays] = useState([]);
    const [modalData, setModalData] = useState(null); // Data for the modal
    const modalRef = useRef(null); // Reference for the modal

    const currentYear = new Date().getFullYear();

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Fetch holidays from DateNager API
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const response = await fetch(
                    `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/PH`
                );
                const data = await response.json();
                setHolidays(data); // Store holidays separately
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
            // Deselect the date
            setSelectedDates(selectedDates.filter((date) => date !== dateKey));
        } else if (selectedDates.length < 4) {
            // Select the date (limit to 3)
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

    return (
        <div className="bg-white p-4 rounded-lg shadow select-none w-full">
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:justify-between items-center mb-4 gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                    >
                        <FaChevronLeft size={20} />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition"
                    >
                        <FaChevronRight size={20} />
                    </button>
                </div>

                <div className="font-bold text-lg sm:text-xl md:text-2xl uppercase underline underline-offset-4 text-center">
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                </div>

                <div className="flex gap-2 items-center">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                                {new Date(currentYear, month - 1, 1).toLocaleString("default", { month: "long" })}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="border p-2 rounded text-sm"
                    >
                        {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border-b border-gray-300 my-4"></div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center font-semibold text-sm sm:text-base">
                {weekDays.map((day, index) => (
                    <div key={day} className={`p-2 ${index === 0 ? "text-red-500" : ""}`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: emptySlots }, (_, i) => (
                    <div key={`empty-${i}`} className="p-2 border rounded-lg h-12 sm:h-16 md:h-24"></div>
                ))}
                {daysArray.map((day) => {
                    const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
                    const holiday = holidays.find((h) => h.date === dateKey);
                    const isSelected = selectedDates.includes(dateKey);
                    const selectionIndex = selectedDates.indexOf(dateKey) + 1;

                    return (
                        <div
                            key={day}
                            className={`relative p-2 border rounded-lg h-12 sm:h-16 md:h-24 cursor-pointer text-xs sm:text-sm md:text-base 
                        flex flex-col items-center justify-center 
                        ${isSunday ? "text-red-500 bg-red-100" : ""}
                        ${holiday ? "bg-green-100" : ""}
                        ${isSelected ? "bg-blue-200 border-blue-500" : ""}`}
                            onClick={() => handleDateClick(dateKey)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                handleLongPress(dateKey);
                            }}
                        >
                            <span className="absolute top-1 right-1 text-xs font-bold">{day}</span>
                            {isSelected && <span className="text-blue-600 font-bold">{selectionIndex}</span>}
                            {holiday && <div className="hidden md:block text-xs bg-green-200 p-1 rounded">{holiday.localName}</div>}
                            {events[dateKey]?.map((event, idx) => (
                                <div key={idx} className="hidden md:block text-xs bg-blue-100 p-1 mt-1 rounded w-full text-center">
                                    {event}
                                </div>
                            ))}
                        </div>
                    );
                })}
                {Array.from({ length: remainingSlots }, (_, i) => (
                    <div key={`empty-end-${i}`} className="p-2 border rounded-lg h-12 sm:h-16 md:h-24"></div>
                ))}
            </div>

            {/* Modal */}
            {modalData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div ref={modalRef} className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Events on {modalData.dateKey}</h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 transition"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <div>
                            {modalData.holiday && (
                                <div className="mb-2">
                                    <span className="font-bold">Holiday:</span> {modalData.holiday.localName}
                                </div>
                            )}
                            {modalData.userEvents.length > 0 ? (
                                modalData.userEvents.map((event, idx) => (
                                    <div key={idx} className="bg-blue-100 p-2 rounded mb-2">
                                        {event}
                                    </div>
                                ))
                            ) : (
                                <div className="text-gray-500">No user-created events.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Calendar;
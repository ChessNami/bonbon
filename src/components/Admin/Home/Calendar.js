import React, { useState, useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const Calendar = ({ selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, events, selectedDates, setSelectedDates }) => {
    const [holidays, setHolidays] = useState([]);

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

    const totalSlots = 42;
    const emptySlots = firstDayOfMonth;
    const filledSlots = daysArray.length;
    const remainingSlots = totalSlots - (emptySlots + filledSlots);

    return (
        <div className="bg-white p-4 rounded-lg shadow select-none">
            {/* Controls */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition duration-150"
                    >
                        <FaChevronLeft size={25} />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 rounded bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition duration-150"
                    >
                        <FaChevronRight size={25} />
                    </button>
                </div>

                <div className="font-bold text-2xl uppercase underline underline-offset-4">
                    {new Date(selectedYear, selectedMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="border p-2 rounded"
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
                        className="border p-2 rounded"
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
            <div className="grid grid-cols-7 text-center font-semibold">
                {weekDays.map((day, index) => (
                    <div
                        key={day}
                        className={`p-2 ${index === 0 ? "text-red-500" : ""}`}
                    >
                        {day}
                    </div>
                ))}
            </div>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: emptySlots }, (_, i) => (
                    <div key={`empty-${i}`} className="p-3 border rounded-lg h-24"></div>
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
                            className={`relative p-3 border rounded-lg h-24 overflow-auto cursor-pointer 
                                ${isSunday ? "text-red-500 bg-red-100" : ""}
                                ${holiday ? "bg-green-100" : ""}
                                ${isSelected ? "bg-blue-200 border-blue-500" : ""}`}
                            onClick={() => handleDateClick(dateKey)}
                        >
                            <span className="absolute top-2 right-2 text-xl font-semibold">{day}</span>
                            {isSelected && (
                                <span className="absolute top-2 left-2 text-2xl font-bold text-blue-600">
                                    {selectionIndex}
                                </span>
                            )}
                            <div className="mt-6">
                                {holiday && (
                                    <div className="text-xs bg-green-200 p-1 rounded mb-1">
                                        {holiday.localName}
                                    </div>
                                )}
                                {events[dateKey]?.map((event, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-blue-100 p-1 mt-1 rounded">
                                        <span>{event}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {Array.from({ length: remainingSlots }, (_, i) => (
                    <div key={`empty-end-${i}`} className="p-3 border rounded-lg h-24"></div>
                ))}
            </div>
        </div>
    );
};

export default Calendar;
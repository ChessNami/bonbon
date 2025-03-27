import React from "react";
import { FaPlus, FaTimes, FaEdit, FaTrash } from "react-icons/fa";

const EventForm = ({ newEvent, setNewEvent, events, setEvents, selectedDates, setSelectedDates }) => {
    const handleAddEvent = (date) => {
        if (newEvent[date]) {
            setEvents((prev) => ({
                ...prev,
                [date]: [...(prev[date] || []), newEvent[date]],
            }));
            setNewEvent((prev) => ({ ...prev, [date]: "" })); // Clear the input for this date
            setSelectedDates((prev) => prev.filter((d) => d !== date)); // Auto-deselect the date
        }
    };

    const handleEditEvent = (date) => {
        if (newEvent[date]) {
            setEvents((prev) => ({
                ...prev,
                [date]: [newEvent[date]], // Replace existing events with the new title
            }));
            setNewEvent((prev) => ({ ...prev, [date]: "" })); // Clear the input for this date
            setSelectedDates((prev) => prev.filter((d) => d !== date)); // Auto-deselect the date
        }
    };

    const handleDeleteEvent = (date) => {
        setEvents((prev) => {
            const updatedEvents = { ...prev };
            delete updatedEvents[date]; // Remove the event for this date
            return updatedEvents;
        });
        setNewEvent((prev) => ({ ...prev, [date]: "" })); // Clear the input for this date
        setSelectedDates((prev) => prev.filter((d) => d !== date)); // Auto-deselect the date
    };

    const handleClearField = (date) => {
        setNewEvent((prev) => ({ ...prev, [date]: "" })); // Clear the input for this date
    };

    const handleRemoveDate = (date) => {
        setSelectedDates((prev) => prev.filter((d) => d !== date)); // Remove the date from selectedDates
        setNewEvent((prev) => {
            const updatedNewEvent = { ...prev };
            delete updatedNewEvent[date]; // Remove the corresponding event name
            return updatedNewEvent;
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow min-h-full">
            <h2 className="text-lg font-semibold mb-2">Create/Edit/Delete Events</h2>
            {selectedDates.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                    <p className="text-gray-500 text-2xl text-center uppercase font-bold">Please select a Date</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {selectedDates.map((date, index) => (
                        <div key={date} className="flex items-center gap-2">
                            <span className="font-bold">{index + 1}.</span>
                            <input
                                type="text"
                                placeholder={`Event Name for ${date}`}
                                value={newEvent[date] || ""}
                                onChange={(e) =>
                                    setNewEvent((prev) => ({ ...prev, [date]: e.target.value }))
                                }
                                className="border p-2 rounded flex-1"
                            />
                            <span className="text-sm text-gray-500">{date}</span>
                            <button
                                onClick={() => handleClearField(date)}
                                className="bg-red-500 text-white p-2 rounded flex items-center justify-center h-10 w-10 
                                hover:bg-red-600 active:bg-red-700 transition duration-150"
                                title="Clear Field"
                            >
                                <FaTimes size={16} />
                            </button>
                            <button
                                onClick={() => handleAddEvent(date)}
                                className="bg-green-500 text-white p-2 rounded flex items-center justify-center h-10 w-10 
                                hover:bg-green-600 active:bg-green-700 transition duration-150"
                                title="Add Event"
                            >
                                <FaPlus size={16} />
                            </button>
                            <button
                                onClick={() => handleEditEvent(date)}
                                className="bg-blue-500 text-white p-2 rounded flex items-center justify-center h-10 w-10 
                                hover:bg-blue-600 active:bg-blue-700 transition duration-150"
                                title="Save Edit"
                            >
                                <FaEdit size={16} />
                            </button>
                            <button
                                onClick={() => handleDeleteEvent(date)}
                                className="bg-gray-500 text-white p-2 rounded flex items-center justify-center h-10 w-10 
                                hover:bg-gray-600 active:bg-gray-700 transition duration-150"
                                title="Delete Event"
                            >
                                <FaTrash size={16} />
                            </button>
                            <button
                                onClick={() => handleRemoveDate(date)}
                                className="bg-yellow-500 text-white p-2 rounded flex items-center justify-center h-10 w-10 
                                hover:bg-yellow-600 active:bg-yellow-700 transition duration-150"
                                title="Remove Date"
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EventForm;
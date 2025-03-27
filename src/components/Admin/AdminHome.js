import React, { useState } from "react";
import { FaHome } from "react-icons/fa";
import Calendar from "./Home/Calendar";
import EventForm from "./Home/EventForm";
import TotalResident from "./Home/TotalResident";
import ApprovedProfile from "./Home/ApprovedProfile";
import RejectedProfile from "./Home/RejectedProfile";
import PendingProfile from "./Home/PendingProfile";
import BarangayCouncilTable from "./Home/BarangayCouncilTable";
import ZonePopulationTable from "./Home/ZonePopulationTable";

const AdminHome = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [events, setEvents] = useState({});
    const [newEvent, setNewEvent] = useState({ date: "", title: "" });
    const [selectedDates, setSelectedDates] = useState([]); // Initialize selectedDates as an empty array

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Header */}
            <h1 className="text-2xl font-bold bg-[#dee5f8] p-4 flex items-center gap-2">
                <FaHome className="text-[#172554]" size={30} />
                Dashboard
            </h1>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-4">
                <TotalResident />
                <ApprovedProfile />
                <RejectedProfile />
                <PendingProfile />
            </div>

            {/* Calendar & Barangay Council */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 px-4">
                <div className="xl:col-span-3">
                    <Calendar
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        events={events}
                        setEvents={setEvents}
                        setSelectedYear={setSelectedYear}
                        setSelectedMonth={setSelectedMonth}
                        selectedDates={selectedDates} // Pass selectedDates to Calendar
                        setSelectedDates={setSelectedDates} // Pass setSelectedDates to Calendar
                    />
                </div>
                <div className="xl:col-span-2 xl:row-start-auto row-start-2 overflow-x-auto shadow rounded-lg">
                    <BarangayCouncilTable />
                </div>
            </div>

            {/* Event Form & Zone Population Table */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4">
                {/* Event Form */}
                <div className="lg:col-span-2">
                    <EventForm
                        newEvent={newEvent}
                        setNewEvent={setNewEvent}
                        events={events}
                        setEvents={setEvents}
                        selectedDates={selectedDates} // Pass selectedDates to EventForm
                        setSelectedDates={setSelectedDates} // Pass setSelectedDates to EventForm
                    />
                </div>

                {/* Zone Population Table */}
                <div className="lg:col-span-2 overflow-x-auto shadow rounded-lg">
                    <ZonePopulationTable />
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
import React, { useState } from "react";
import Calendar from "./Home/Calendar";
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
    const [selectedDates, setSelectedDates] = useState([]);

    return (
        <div className="flex flex-col min-h-screen bg-background">

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-4">
                <TotalResident />
                <ApprovedProfile />
                <RejectedProfile />
                <PendingProfile />
            </div>

            {/* Zone Population Table */}
            <section className="p-4">
                <div className="rounded-lg shadow overflow-x-auto">
                    <ZonePopulationTable />
                </div>
            </section>

            {/* Calendar, Event Form & Barangay Council */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 px-4 pb-4">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <Calendar
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        events={events}
                        setEvents={setEvents}
                        setSelectedYear={setSelectedYear}
                        setSelectedMonth={setSelectedMonth}
                        selectedDates={selectedDates}
                        setSelectedDates={setSelectedDates}
                    />
                </div>
                <div className="lg:col-span-2 overflow-x-auto shadow rounded-lg">
                    <BarangayCouncilTable />
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
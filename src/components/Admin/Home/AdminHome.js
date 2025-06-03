import React, { useState, useEffect, Suspense } from "react";
import Calendar from "./Calendar";
import TotalResident from "./TotalResident";
import ApprovedProfile from "./ApprovedProfile";
import PendingProfile from "./PendingProfile";
import BarangayCouncilTable from "./BarangayCouncilTable";
import ZonePopulationTable from "./ZonePopulationTable";
import ToUpdateProfile from "./ToUpdateProfile";

const AdminHome = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [events, setEvents] = useState({});
    const [selectedDates, setSelectedDates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const prefetchData = async () => {
            try {
                // Simulate prefetching data for child components
                await Promise.all([
                    import('./ApprovedProfile'),
                    import('./RejectedProfile'),
                    import('./PendingProfile')
                ]);
            } catch (error) {
                console.error('Error prefetching components:', error);
            } finally {
                setIsLoading(false);
            }
        };

        prefetchData();
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Suspense fallback={<div>Loading stats...</div>}>
                {isLoading ? (
                    <div>Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4 px-4">
                        <TotalResident />
                        <ApprovedProfile />
                        <ToUpdateProfile />
                        <PendingProfile />
                    </div>
                )}
            </Suspense>

            <section className="p-4">
                <div className="rounded-lg shadow overflow-x-auto">
                    <ZonePopulationTable />
                </div>
            </section>

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
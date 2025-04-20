import React, { useState, useEffect } from "react";
import { FaHourglassHalf } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const PendingProfile = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchPendingCount = async () => {
        try {
            const { count, error } = await supabase
                .from('resident_profile_status')
                .select('*', { count: 'exact', head: true })
                .eq('status', 3);

            if (error) throw error;
            setPendingCount(count || 0);
        } catch (error) {
            console.error('Error fetching pending count:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingCount();

        const subscription = supabase
            .channel('resident_profile_status-pending-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resident_profile_status',
                    filter: 'status=eq.3'
                },
                () => fetchPendingCount()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    if (loading) {
        return (
            <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4 animate-pulse">
                <div className="bg-gray-300 p-3 rounded-full w-12 h-12"></div>
                <div className="space-y-2">
                    <div className="h-5 bg-gray-300 rounded w-32"></div>
                    <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
            <div className="bg-yellow-500 text-white p-3 rounded-full">
                <FaHourglassHalf size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Pending Profiles</h2>
                <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
        </div>
    );
};

export default PendingProfile;
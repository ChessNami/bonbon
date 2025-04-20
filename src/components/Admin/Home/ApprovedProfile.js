import React, { useState, useEffect } from "react";
import { FaCheckCircle } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const ApprovedProfile = () => {
    const [approvedCount, setApprovedCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchApprovedCount = async () => {
        try {
            const { count, error } = await supabase
                .from('resident_profile_status')
                .select('*', { count: 'exact', head: true })
                .eq('status', 1);

            if (error) throw error;
            setApprovedCount(count || 0);
        } catch (error) {
            console.error('Error fetching approved count:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovedCount();

        const subscription = supabase
            .channel('resident_profile_status-approved-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resident_profile_status',
                    filter: 'status=eq.1'
                },
                () => fetchApprovedCount()
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
            <div className="bg-green-500 text-white p-3 rounded-full">
                <FaCheckCircle size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Approved Profiles</h2>
                <p className="text-2xl font-bold">{approvedCount}</p>
            </div>
        </div>
    );
};

export default ApprovedProfile;
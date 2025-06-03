import React, { useState, useEffect } from "react";
import { FaSyncAlt } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";

const ToUpdateProfile = () => {
    const [toUpdateCount, setToUpdateCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchToUpdateCount = async () => {
        try {
            const { count, error } = await supabase
                .from('resident_profile_status')
                .select('*', { count: 'exact', head: true })
                .eq('status', 6);

            if (error) throw error;
            setToUpdateCount(count || 0);
        } catch (error) {
            console.error('Error fetching update profile count:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToUpdateCount();

        const subscription = supabase
            .channel('resident_profile_status-update-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resident_profile_status',
                    filter: 'status=eq.6'
                },
                () => fetchToUpdateCount()
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
            <div className="bg-blue-500 text-white p-3 rounded-full">
                <FaSyncAlt size={30} />
            </div>
            <div>
                <h2 className="text-gray-600 text-lg">Profiles to Update</h2>
                <p className="text-2xl font-bold">{toUpdateCount}</p>
            </div>
        </div>
    );
};

export default ToUpdateProfile;
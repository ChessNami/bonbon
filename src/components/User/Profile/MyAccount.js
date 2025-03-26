import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import Loader from "../../Loader";

const MyAccount = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);

            // Get current session user
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error("Error fetching user:", error.message);
                setUser(null);
            } else {
                setUser(user);
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    if (loading) {
        return <Loader />;
    }

    if (!user) {
        return <p className="text-red-500">No user found. Please log in.</p>;
    }

    return (
        <div className="w-full">
            <h2 className="text-3xl font-extrabold text-gray-700 mb-4 border-b pb-2">My Account</h2>
            <p className="text-gray-600"><strong>Display Name:</strong> {user.user_metadata?.display_name || "N/A"}</p>
            <p className="text-gray-600"><strong>Email:</strong> {user.email || "N/A"}</p>
            <p className="text-gray-600"><strong>Date Joined:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
        </div>
    );
};

export default MyAccount;
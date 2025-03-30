import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import Loader from "../../Loader";

const MyAccount = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: "",
        email: "",
    });

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error.message);
                setUser(null);
            } else {
                setUser(user);
                setFormData({
                    displayName: user.user_metadata?.display_name || "",
                    email: user.email || "",
                });
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleEditClick = () => {
        setEditing(!editing);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (loading) return <Loader />;
    if (!user) return <p className="text-red-500">No user found. Please log in.</p>;

    return (
        <div className="w-full">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-3xl font-extrabold text-gray-700">My Account</h2>
                <button
                    onClick={handleEditClick}
                    className="text-blue-500 hover:underline text-sm"
                >
                    {editing ? "Cancel" : "Edit"}
                </button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-600 font-semibold">Display Name</label>
                    <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleChange}
                        disabled={!editing}
                        className={`w-full p-2 border rounded-lg ${editing ? "border-blue-400" : "bg-gray-100 cursor-not-allowed"}`}
                    />
                </div>
                <div>
                    <label className="block text-gray-600 font-semibold">Email</label>
                    <input
                        type="text"
                        name="email"
                        value={formData.email}
                        disabled
                        className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                </div>
                <div>
                    <label className="block text-gray-600 font-semibold">Date Joined</label>
                    <input
                        type="text"
                        value={user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                        disabled
                        className="w-full p-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                </div>
                {editing && (
                    <button
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                        Save Changes
                    </button>
                )}
            </div>
        </div>
    );
};

export default MyAccount;
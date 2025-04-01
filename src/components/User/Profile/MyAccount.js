import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import Loader from "../../Loader";
import Swal from "sweetalert2";

const MyAccount = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        displayName: "",
        email: "",
        dateOfBirth: "",
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
                    dateOfBirth: user.user_metadata?.date_of_birth || "",
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

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const updates = {
                display_name: formData.displayName,
                date_of_birth: formData.dateOfBirth,
            };

            const { error } = await supabase.auth.updateUser({
                data: updates,
            });

            if (error) {
                throw error;
            }

            setUser((prevUser) => ({
                ...prevUser,
                user_metadata: {
                    ...prevUser.user_metadata,
                    ...updates,
                },
            }));

            setEditing(false);

            // Success notification
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Changes saved successfully!",
                timer: 1500,
                showConfirmButton: false,
                background: "#f0f9ff", // Optional: Light background for better visibility
            });
        } catch (error) {
            console.error("Error saving changes:", error.message);

            // Error notification
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Failed to save changes!",
                text: error.message,
                timer: 1500,
                showConfirmButton: false,
                background: "#ffe4e6", // Optional: Light background for better visibility
            });
        } finally {
            setLoading(false);
        }
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
                    <label className="block text-gray-600 font-semibold">Date of Birth</label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        disabled={!editing}
                        className={`w-full p-2 border rounded-lg ${editing ? "border-blue-400" : "bg-gray-100 cursor-not-allowed"}`}
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
                        onClick={handleSaveChanges}
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
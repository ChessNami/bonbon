import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [displayName, setDisplayName] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [viewMode, setViewMode] = useState("admin"); // Default to admin view

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error("Error fetching user:", error.message);
                return;
            }

            setDisplayName(user.user_metadata?.display_name || "User");

            // Fetch profile picture from Supabase Storage
            const { data, error: imageError } = await supabase
                .storage
                .from("user-assets")
                .getPublicUrl(`profiles/${user.id}.jpg`);

            if (imageError) {
                console.error("Error fetching profile picture:", imageError.message);
            } else {
                setProfilePicture(data.publicUrl);
            }
        };

        fetchUser();
    }, []);

    const toggleViewMode = () => {
        setViewMode((prev) => (prev === "admin" ? "user" : "admin"));
    };

    return (
        <UserContext.Provider value={{ displayName, profilePicture, setDisplayName, viewMode, toggleViewMode }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
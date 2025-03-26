import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from "../../supabaseClient";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [displayName, setDisplayName] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);

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

    return (
        <UserContext.Provider value={{ displayName, profilePicture, setDisplayName }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);

import { supabase } from "../supabaseClient";
import Swal from "sweetalert2";

// Cache for user data (display name and photos) to avoid repeated requests
const userDataCache = new Map();

export const fetchUserData = async (userId, forceRefresh = false) => {
    try {
        // Check cache first unless forceRefresh is true
        const cacheKey = `user_data_${userId}`;
        if (!forceRefresh && userDataCache.has(cacheKey)) {
            return userDataCache.get(cacheKey);
        }

        // Fetch user metadata
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user || user.id !== userId) {
            console.error("Error fetching user or mismatched user ID:", userError?.message || "No user found");
            return { displayName: "User", profilePic: null, coverPhoto: null };
        }

        const displayName = user.user_metadata?.display_name || "User";

        // Fetch photo paths from user_photos table
        const { data: photoData, error: photoError } = await supabase
            .from("user_photos")
            .select("profile_pic_path, cover_photo_path")
            .eq("user_id", userId)
            .single();

        let profilePicUrl = null;
        let coverPhotoUrl = null;

        if (!photoError && photoData) {
            const { profile_pic_path, cover_photo_path } = photoData;

            // Generate signed URLs if paths exist
            if (profile_pic_path) {
                const { data: signedProfilePic, error: profilePicError } = await supabase.storage
                    .from("user-assets")
                    .createSignedUrl(profile_pic_path, 3600);
                if (!profilePicError) {
                    profilePicUrl = signedProfilePic.signedUrl;
                }
            }

            if (cover_photo_path) {
                const { data: signedCoverPhoto, error: coverPhotoError } = await supabase.storage
                    .from("user-assets")
                    .createSignedUrl(cover_photo_path, 3600);
                if (!coverPhotoError) {
                    coverPhotoUrl = signedCoverPhoto.signedUrl;
                }
            }
        }

        const result = { displayName, profilePic: profilePicUrl, coverPhoto: coverPhotoUrl };

        // Cache the result for 1 hour (3600 seconds)
        userDataCache.set(cacheKey, result);
        setTimeout(() => userDataCache.delete(cacheKey), 3600 * 1000);

        return result;
    } catch (err) {
        console.error("Error in fetchUserData:", err.message);
        return { displayName: "User", profilePic: null, coverPhoto: null };
    }
};

export const subscribeToUserData = (userId, callback) => {
    if (!userId) {
        console.error("No userId provided for user data subscription");
        return () => { };
    }

    // Subscribe to user_photos changes
    const photosChannel = supabase
        .channel(`user_photos_changes_${userId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "user_photos",
                filter: `user_id=eq.${userId}`,
            },
            async (payload) => {
                console.log("User photos change detected:", payload);
                const newData = await fetchUserData(userId, true); // Force refresh on change
                callback(newData);
            }
        )
        .subscribe((status, error) => {
            if (error) {
                console.error("Photo subscription error:", error);
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to subscribe to photo updates",
                    timer: 1500,
                    showConfirmButton: false,
                    scrollbarPadding: false,
                });
            }
        });

    // Subscribe to auth state changes for user metadata updates
    const authChannel = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "USER_UPDATED" || event === "SIGNED_IN") {
            console.log("User metadata change detected:", event);
            const newData = await fetchUserData(userId, true); // Force refresh on change
            callback(newData);
        }
    });

    return () => {
        supabase.removeChannel(photosChannel);
        authChannel.data.subscription.unsubscribe();
    };
};

// Legacy functions for backward compatibility
export const fetchUserPhotos = async (userId, forceRefresh = false) => {
    const data = await fetchUserData(userId, forceRefresh);
    return { profilePic: data.profilePic, coverPhoto: data.coverPhoto };
};

export const subscribeToUserPhotos = (userId, callback) => {
    return subscribeToUserData(userId, (data) => {
        callback({ profilePic: data.profilePic, coverPhoto: data.coverPhoto });
    });
};
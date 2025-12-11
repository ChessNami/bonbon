import { supabase } from "../supabaseClient";
// import Swal from "sweetalert2";

// Cache for signed URLs to avoid repeated requests
const signedUrlCache = new Map();

export const fetchUserPhotos = async (userId, forceRefresh = false) => {
    try {
        // Check cache first unless forceRefresh is true
        const cacheKey = `photos_${userId}`;
        if (!forceRefresh && signedUrlCache.has(cacheKey)) {
            return signedUrlCache.get(cacheKey);
        }

        // Fetch photo paths from user_photos table
        const { data: photoData, error: photoError } = await supabase
            .from("user_photos")
            .select("profile_pic_path, cover_photo_path")
            .eq("user_id", userId)
            .single();

        if (photoError || !photoData) {
            console.error("Error fetching user photos:", photoError?.message);
            return { profilePic: null, coverPhoto: null };
        }

        const { profile_pic_path, cover_photo_path } = photoData;
        let profilePicUrl = null;
        let coverPhotoUrl = null;

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

        const result = { profilePic: profilePicUrl, coverPhoto: coverPhotoUrl };

        // Cache the result for 1 hour (3600 seconds)
        signedUrlCache.set(cacheKey, result);
        setTimeout(() => signedUrlCache.delete(cacheKey), 3600 * 1000);

        return result;
    } catch (err) {
        console.error("Error in fetchUserPhotos:", err.message);
        return { profilePic: null, coverPhoto: null };
    }
};

export const subscribeToUserPhotos = (userId, callback) => {
    if (!userId) {
        console.error("No userId provided for photo subscription");
        return () => { };
    }

    const channel = supabase
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
                const newPhotos = await fetchUserPhotos(userId, true); // Force refresh on change
                callback(newPhotos);
            }
        )
        // .subscribe((status, error) => {
        //     if (error) {
        //         console.error("Photo subscription error:", error);
        //         Swal.fire({
        //             toast: true,
        //             position: "top-end",
        //             icon: "error",
        //             title: "Failed to subscribe to photo updates",
        //             timer: 1500,
        //             showConfirmButton: false,
        //             scrollbarPadding: false,
        //         });
        //     }
        // });

    return () => supabase.removeChannel(channel);
};
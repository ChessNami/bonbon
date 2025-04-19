import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaCommentAlt } from "react-icons/fa";
import { supabase } from "../../supabaseClient";
import { fetchUserPhotos } from "../../utils/supabaseUtils";
import Loader from "../Loader"; // Import the Loader component

const UserFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch feedback and user data from Supabase
    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                // Fetch feedback data
                const { data: feedbackData, error: feedbackError } = await supabase
                    .from("feedback")
                    .select("id, user_id, feedback_text, rating, created_at")
                    .order("created_at", { ascending: false });

                if (feedbackError) {
                    console.error("Error fetching feedbacks:", feedbackError);
                    return;
                }

                // Fetch user display names from auth.users
                const userIds = [...new Set(feedbackData.map((f) => f.user_id))];
                const { data: userData, error: userError } = await supabase.rpc(
                    "get_users_by_ids",
                    { user_ids: userIds }
                );

                if (userError) {
                    console.error("Error fetching user data:", userError);
                    return;
                }

                // Map user data to get display names with fallback
                const userMap = new Map();
                userData.forEach((user) => {
                    const displayName =
                        user.raw_user_meta_data?.display_name || "Anonymous";
                    userMap.set(user.id, displayName);
                });

                // Fetch profile pictures and ensure displayName is set
                const feedbackWithPhotos = await Promise.all(
                    feedbackData.map(async (feedback) => {
                        const photos = await fetchUserPhotos(feedback.user_id);
                        const displayName =
                            userMap.get(feedback.user_id) || "Anonymous";
                        if (!userMap.has(feedback.user_id)) {
                            console.warn(
                                `No user data found for user_id: ${feedback.user_id}`
                            );
                        }
                        return {
                            ...feedback,
                            displayName,
                            profilePic: photos.profilePic,
                        };
                    })
                );

                setFeedbacks(feedbackWithPhotos);
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeedbacks();
    }, []);

    return (
        <section className="min-h-screen bg-blue-50 py-8 px-4 sm:px-6 lg:px-8">
            {/* Content */}
            <AnimatePresence>
                {loading ? (
                    <motion.div
                        className="flex justify-center items-center h-64"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Loader />
                    </motion.div>
                ) : feedbacks.length === 0 ? (
                    <motion.div
                        className="text-center py-12 bg-white rounded-lg shadow-md max-w-md mx-auto"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <FaCommentAlt
                            className="mx-auto text-gray-400 mb-4"
                            size={40}
                        />
                        <p className="text-gray-600 text-lg">
                            No feedback available yet.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            Encourage users to share their thoughts!
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {feedbacks.map((feedback, index) => (
                            <motion.div
                                key={feedback.id}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: 0.3,
                                    delay: index * 0.1,
                                }}
                            >
                                {/* User Info */}
                                <div className="flex items-center mb-4">
                                    {feedback.profilePic ? (
                                        <img
                                            src={feedback.profilePic}
                                            alt="Profile"
                                            className="w-12 h-12 rounded-full mr-3 object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-blue-200 mr-3 flex items-center justify-center">
                                            <span className="text-blue-800 font-semibold text-lg">
                                                {feedback.displayName &&
                                                    typeof feedback.displayName ===
                                                    "string"
                                                    ? feedback.displayName[0]?.toUpperCase()
                                                    : "A"}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-blue-900 text-lg">
                                            {feedback.displayName}
                                        </h3>
                                        <div className="flex mt-1">
                                            {[...Array(5)].map((_, i) => (
                                                <FaStar
                                                    key={i}
                                                    size={16}
                                                    className={
                                                        i < feedback.rating
                                                            ? "text-yellow-400"
                                                            : "text-gray-300"
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Feedback Text */}
                                <p className="text-gray-700 mb-4 text-sm sm:text-base line-clamp-3">
                                    {feedback.feedback_text}
                                </p>

                                {/* Timestamp */}
                                <p className="text-xs sm:text-sm text-gray-500">
                                    Submitted:{" "}
                                    {new Date(
                                        feedback.created_at
                                    ).toLocaleString()}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default UserFeedback;
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaCommentAlt, FaFilter, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../../utils/supabaseUtils";
import Loader from "../../Loader";

const UserFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratingFilter, setRatingFilter] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch feedback and user data from Supabase
    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                // Fetch feedback data
                let query = supabase
                    .from("feedback")
                    .select("id, user_id, feedback_text, rating, created_at")
                    .order("created_at", { ascending: false });

                if (ratingFilter > 0) {
                    query = query.eq("rating", ratingFilter);
                }

                const { data: feedbackData, error: feedbackError } = await query;

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
    }, [ratingFilter]);

    // Set up subscriptions for profile pictures
    useEffect(() => {
        const subscriptions = [];

        // Subscribe to photo changes for each user
        feedbacks.forEach((feedback) => {
            const unsubscribe = subscribeToUserPhotos(feedback.user_id, (newPhotos) => {
                setFeedbacks((prevFeedbacks) =>
                    prevFeedbacks.map((f) =>
                        f.user_id === feedback.user_id
                            ? { ...f, profilePic: newPhotos.profilePic }
                            : f
                    )
                );
            });
            subscriptions.push(unsubscribe);
        });

        // Cleanup subscriptions
        return () => {
            subscriptions.forEach((unsubscribe) => unsubscribe());
        };
    }, [feedbacks]);

    // Pagination logic
    const totalPages = Math.ceil(feedbacks.length / itemsPerPage);
    const paginatedFeedbacks = feedbacks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1 mx-1 rounded-full text-sm ${currentPage === i
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-blue-100"
                        }`}
                >
                    {i}
                </button>
            );
        }
        return pageNumbers;
    };

    return (
        <section className="min-h-screen bg-blue-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
            <div className="flex-1 flex flex-col">
                {/* Filters and Controls */}
                <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <FaFilter className="text-blue-600" />
                        <label className="text-sm font-medium text-gray-700">
                            Filter by Rating:
                        </label>
                        <select
                            value={ratingFilter}
                            onChange={(e) => {
                                setRatingFilter(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="p-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={0}>All Ratings</option>
                            {[1, 2, 3, 4, 5].map((rating) => (
                                <option key={rating} value={rating}>
                                    {rating} Star{rating > 1 ? "s" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">
                            Items per page:
                        </label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="p-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {[6, 12, 18, 24].map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

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
                            className="text-center py-12 bg-white rounded-lg shadow-md max-w-md mx-auto px-4"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                            {paginatedFeedbacks.map((feedback, index) => (
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
                                                        typeof feedback.displayName === "string"
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
                                        Submitted: {new Date(feedback.created_at).toLocaleString()}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pagination */}
            {feedbacks.length > 0 && (
                <div className="flex justify-center items-center mt-8 gap-2 pb-4">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-blue-100"
                    >
                        <FaChevronLeft />
                    </button>
                    {renderPageNumbers()}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-blue-100"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
        </section>
    );
};

export default UserFeedback;
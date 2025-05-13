import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaCommentAlt, FaChevronLeft, FaChevronRight, FaTrash } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";
import { fetchUserPhotos, subscribeToUserPhotos } from "../../../utils/supabaseUtils";
import Loader from "../../Loader";
import Swal from "sweetalert2";

const UserFeedback = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratingFilter, setRatingFilter] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const [currentPage, setCurrentPage] = useState(1);
    const [userRoles, setUserRoles] = useState([]);
    const [averageRating, setAverageRating] = useState(0);

    // Fetch current user's roles
    useEffect(() => {
        const fetchUserRoles = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: rolesData, error: rolesError } = await supabase
                        .from("user_roles")
                        .select("role_id")
                        .eq("user_id", user.id);

                    if (rolesError) {
                        console.error("Error fetching user roles:", rolesError);
                        return;
                    }

                    const roleIds = rolesData.map((role) => role.role_id);
                    const { data: roles, error: roleError } = await supabase
                        .from("roles")
                        .select("name")
                        .in("id", roleIds);

                    if (roleError) {
                        console.error("Error fetching role names:", roleError);
                        return;
                    }

                    setUserRoles(roles.map((role) => role.name));
                }
            } catch (error) {
                console.error("Unexpected error fetching user roles:", error);
            }
        };

        fetchUserRoles();
    }, []);

    // Fetch feedback and calculate global average rating
    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                // Fetch filtered feedback for display
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

                // Fetch all feedback ratings for global average
                const { data: allFeedbackData, error: allFeedbackError } = await supabase
                    .from("feedback")
                    .select("rating");

                if (allFeedbackError) {
                    console.error("Error fetching all feedback ratings:", allFeedbackError);
                    return;
                }

                // Calculate global average rating
                const totalRating = allFeedbackData.reduce((sum, f) => sum + f.rating, 0);
                const avgRating = allFeedbackData.length > 0 ? (totalRating / allFeedbackData.length).toFixed(1) : 0;
                setAverageRating(avgRating);

                const userIds = [...new Set(feedbackData.map((f) => f.user_id))];
                const { data: userData, error: userError } = await supabase.rpc(
                    "get_users_by_ids",
                    { user_ids: userIds }
                );

                if (userError) {
                    console.error("Error fetching user data:", userError);
                    return;
                }

                const userMap = new Map();
                userData.forEach((user) => {
                    const displayName =
                        user.raw_user_meta_data?.display_name || "Anonymous";
                    userMap.set(user.id, displayName);
                });

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

        return () => {
            subscriptions.forEach((unsubscribe) => unsubscribe());
        };
    }, [feedbacks]);

    // Delete feedback with confirmation
    const handleDeleteFeedback = async (feedbackId) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This feedback will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "Cancel",
            scrollbarPadding: false,
        });

        if (result.isConfirmed) {
            try {
                const { error } = await supabase
                    .from("feedback")
                    .delete()
                    .eq("id", feedbackId);

                if (error) {
                    console.error("Error deleting feedback:", error);
                    return;
                }

                setFeedbacks((prevFeedbacks) =>
                    prevFeedbacks.filter((f) => f.id !== feedbackId)
                );

                // Recalculate global average rating after deletion
                const { data: allFeedbackData, error: allFeedbackError } = await supabase
                    .from("feedback")
                    .select("rating");

                if (allFeedbackError) {
                    console.error("Error fetching all feedback ratings:", allFeedbackError);
                    return;
                }

                const totalRating = allFeedbackData.reduce((sum, f) => sum + f.rating, 0);
                const avgRating = allFeedbackData.length > 0 ? (totalRating / allFeedbackData.length).toFixed(1) : 0;
                setAverageRating(avgRating);

                // Show success toast
                await Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Feedback deleted successfully",
                    showConfirmButton: false,
                    timer: 1500,
                    scrollbarPadding: false,
                    timerProgressBar: true,
                });
            } catch (error) {
                console.error("Unexpected error deleting feedback:", error);
            }
        }
    };

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
        <section className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col">
            <div className="flex-1 flex flex-col">
                {/* Refactored Filter Layout */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-6">
                        {/* Average Rating Display */}
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                            <FaStar className="text-yellow-400 text-xl" />
                            <span className="text-lg font-semibold text-gray-800">
                                Average Rating: {Number(averageRating) === 5 ? "5" : averageRating} / 5
                            </span>
                        </div>
                        {/* Rating Filter */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <FaStar className="text-yellow-400" />
                                <span className="text-sm font-medium text-gray-700">
                                    Filter by Rating
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[0, 1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        onClick={() => {
                                            setRatingFilter(rating);
                                            setCurrentPage(1);
                                        }}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${ratingFilter === rating
                                                ? "bg-blue-600 text-white shadow-md"
                                                : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                                            }`}
                                    >
                                        {rating === 0 ? "All" : `${rating} Star${rating > 1 ? "s" : ""}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Items Per Page Slider */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                    Items per Page
                                </span>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="relative w-full sm:w-48">
                                    <input
                                        type="range"
                                        min="6"
                                        max="24"
                                        step="6"
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                                        {[6, 12, 18, 24].map((num) => (
                                            <span key={num}>{num}</span>
                                        ))}
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-blue-600">
                                    {itemsPerPage}
                                </span>
                            </div>
                        </div>
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
                                    className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        delay: index * 0.1,
                                    }}
                                >
                                    {/* Delete Button for Admins and Devs */}
                                    {(userRoles.includes("admin") || userRoles.includes("dev")) && (
                                        <button
                                            onClick={() => handleDeleteFeedback(feedback.id)}
                                            className="absolute bottom-7 right-4 text-red-500 hover:text-red-700 transition-colors duration-200"
                                            title="Delete Feedback"
                                        >
                                            <FaTrash size={16} />
                                        </button>
                                    )}
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
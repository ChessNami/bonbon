import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaStar, FaPaperPlane, FaComment } from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const Feedback = () => {
    const [feedback, setFeedback] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please log in to submit feedback",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }

        if (!feedback.trim()) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Feedback cannot be empty",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }

        if (rating < 1 || rating > 5) {
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please select a rating",
                showConfirmButton: false,
                timer: 1500,
            });
            return;
        }

        // Show loading dialog
        Swal.fire({
            title: "Submitting feedback...",
            allowOutsideClick: false,
            allowEscapeKey: false,
            scrollbarPadding: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        try {
            // Calculate the start of the current week (Sunday)
            const now = new Date();
            const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const daysSinceSunday = dayOfWeek; // Number of days since last Sunday
            const startOfWeek = new Date(now);
            startOfWeek.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
            startOfWeek.setUTCDate(now.getUTCDate() - daysSinceSunday); // Go back to last Sunday

            // Calculate the end of the week (Saturday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
            endOfWeek.setUTCHours(23, 59, 59, 999); // End of Saturday

            // Check feedback count for the current week
            const { data: recentFeedbacks, error: countError } = await supabase
                .from("feedback")
                .select("id, created_at")
                .eq("user_id", user.id)
                .gte("created_at", startOfWeek.toISOString())
                .lte("created_at", endOfWeek.toISOString());

            if (countError) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Error checking feedback limit",
                    showConfirmButton: false,
                    timer: 1500,
                });
                console.error("Error checking feedback count:", countError);
                return;
            }

            if (recentFeedbacks.length >= 2) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "warning",
                    title: "You can only submit 2 feedbacks per week",
                    showConfirmButton: false,
                    timer: 1500,
                });
                return;
            }

            const { error } = await supabase
                .from("feedback")
                .insert({
                    user_id: user.id,
                    feedback_text: feedback,
                    rating,
                });

            if (error) {
                Swal.close();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Failed to submit feedback",
                    showConfirmButton: false,
                    timer: 1500,
                });
                console.error("Error submitting feedback:", error);
                return;
            }

            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "success",
                title: "Feedback submitted successfully!",
                showConfirmButton: false,
                timer: 1500,
            });

            setSubmitted(true);
            setFeedback("");
            setRating(0);
            setTimeout(() => setSubmitted(false), 3000);
        } catch (error) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Unexpected error occurred",
                showConfirmButton: false,
                timer: 1500,
            });
            console.error("Unexpected error submitting feedback:", error);
        }
    };

    return (
        <div className="p-4">
            <motion.div
                className="bg-white p-6 rounded-2xl shadow-xl max-w-lg mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <div className="flex items-center gap-3 mb-6 select-none">
                    <FaComment className="text-indigo-500" size={24} />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Your Feedback
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center gap-2 select-none">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.div
                                key={star}
                                whileHover={{ scale: 1.3, rotate: 10 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <FaStar
                                    size={28}
                                    className={`cursor-pointer transition-colors duration-200 ${(hoverRating || rating) >= star
                                        ? "text-yellow-400"
                                        : "text-gray-200"
                                        }`}
                                    onClick={() => !submitted && setRating(star)}
                                    onMouseEnter={() => !submitted && setHoverRating(star)}
                                    onMouseLeave={() => !submitted && setHoverRating(0)}
                                />
                            </motion.div>
                        ))}
                    </div>

                    <textarea
                        className="w-full p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 text-gray-900 resize-none transition-all duration-200"
                        rows="4"
                        placeholder="Share your thoughts..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        disabled={submitted}
                    />

                    <motion.button
                        type="submit"
                        className={`w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all duration-300 ${submitted
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-indigo-500 hover:bg-indigo-600"
                            }`}
                        disabled={submitted}
                        whileHover={{ scale: submitted ? 1 : 1.05 }}
                        whileTap={{ scale: submitted ? 1 : 0.95 }}
                    >
                        <FaPaperPlane size={16} />
                        <span>{submitted ? "Submitted" : "Submit"}</span>
                    </motion.button>
                </form>

                <AnimatePresence>
                    {submitted && (
                        <motion.div
                            className="mt-4 text-center text-green-600 font-medium"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            Thank you for your feedback!
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default Feedback;
// Feedback.js
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaStar, FaPaperPlane, FaCommentAlt } from "react-icons/fa";
import Swal from "sweetalert2";
import { supabase } from "../../../supabaseClient";

const Feedback = () => {
    const [feedback, setFeedback] = useState("");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [user, setUser] = useState(null);

    // Fetch logged-in user
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
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

        // Submit to Supabase
        const { error } = await supabase
            .from("feedback")
            .insert({
                user_id: user.id,
                feedback_text: feedback,
                rating,
            });

        if (error) {
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

        // Success
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
    };

    return (
        <motion.div
            className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-xl shadow-lg max-w-md mx-auto mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex items-center justify-center mb-6">
                <FaCommentAlt className="text-blue-500 mr-2" size={24} />
                <h2 className="text-2xl font-bold text-gray-800">
                    Share Your Feedback
                </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star Rating */}
                <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <motion.div
                            key={star}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <FaStar
                                size={30}
                                className={`cursor-pointer transition-colors duration-200 ${(hoverRating || rating) >= star
                                        ? "text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                onClick={() => !submitted && setRating(star)}
                                onMouseEnter={() => !submitted && setHoverRating(star)}
                                onMouseLeave={() => !submitted && setHoverRating(0)}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Feedback Textarea */}
                <textarea
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 resize-none"
                    rows="5"
                    placeholder="Tell us your thoughts..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={submitted}
                />

                {/* Submit Button */}
                <button
                    type="submit"
                    className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center space-x-2 ${submitted
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    disabled={submitted}
                >
                    <FaPaperPlane size={18} />
                    <span>{submitted ? "Submitted!" : "Submit Feedback"}</span>
                </button>
            </form>
        </motion.div>
    );
};

export default Feedback;
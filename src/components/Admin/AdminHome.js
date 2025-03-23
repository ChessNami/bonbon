import React, { useRef } from "react";
import { motion } from "framer-motion";

const AdminHome = () => {
    const cards = ["Users", "Revenue", "Orders", "Sales", "Feedback"];
    const containerRef = useRef(null);

    return (
        <div className="flex flex-col h-screen bg-gray-100 p-4 overflow-hidden">
            {/* Draggable Card Container */}
            <motion.div
                ref={containerRef}
                className="flex gap-4 overflow-x-auto cursor-grab pb-4 no-scrollbar"
                drag="x"
                dragConstraints={containerRef}
                style={{ paddingLeft: 0, marginLeft: 0 }} // Ensures it starts from the left
            >
                {cards.map((card, index) => (
                    <motion.div
                        key={index}
                        className="min-w-[200px] bg-white p-4 rounded-lg shadow text-center"
                        whileTap={{ scale: 0.95 }}
                    >
                        <h2 className="text-lg font-semibold">{card}</h2>
                        <p className="text-gray-500">Some data here</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Other Content Below */}
            <div className="flex-1 bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold">Other Content</h2>
                <p className="text-gray-500 mt-2">This is where additional information will be displayed.</p>
            </div>
        </div>
    );
};

export default AdminHome;

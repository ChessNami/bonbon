import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { supabase } from "../../../supabaseClient";
import placeholderImage from "../../../img/Placeholder/placeholder.png";
import Loader from "../../Loader";

const BarangayCouncil = ({ showFormer, onCloseFormer }) => {
    const [officials, setOfficials] = useState([]);
    const [formerOfficials, setFormerOfficials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOfficial, setSelectedOfficial] = useState(null);

    useEffect(() => {
        fetchOfficials();
    }, []);

    const fetchOfficials = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("barangay_officials")
                .select("id, name, position, official_type, image_url, is_current, start_year, end_year")
                .order("position", { ascending: true });

            if (error) throw error;

            const withImages = await Promise.all(
                (data || []).map(async (o) => {
                    let signedImageUrl = placeholderImage;
                    if (o.image_url) {
                        const path = o.image_url.split("/barangayofficials/")[1] || `public/official_${o.id}.jpg`;
                        const { data: signed } = await supabase.storage
                            .from("barangayofficials")
                            .createSignedUrl(path, 3600);
                        signedImageUrl = signed?.signedUrl || placeholderImage;
                    }
                    return { ...o, signedImageUrl };
                })
            );

            const current = withImages.filter(o => o.is_current);
            const former = withImages.filter(o => !o.is_current);

            // Sort current: Captain → Secretary → Treasurer → Kagawad (by last name)
            const sortedCurrent = current.sort((a, b) => {
                const priority = (pos) => {
                    if (/punong barangay|captain|kapitan/i.test(pos)) return 0;
                    if (/secretary/i.test(pos)) return 1;
                    if (/treasurer/i.test(pos)) return 2;
                    return 3;
                };
                if (priority(a.position) !== priority(b.position))
                    return priority(a.position) - priority(b.position);
                const lastA = a.name.split(" ").pop().toLowerCase();
                const lastB = b.name.split(" ").pop().toLowerCase();
                return lastA.localeCompare(lastB);
            });

            setOfficials(sortedCurrent);
            setFormerOfficials(former.sort((a, b) => (b.end_year || 0) - (a.end_year || 0)));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const captain = officials.find(o => /punong barangay|captain|kapitan/i.test(o.position));
    const others = officials.filter(o => o.id !== captain?.id);

    return (
        <div className="p-4 sm:p-6 lg:p-8">

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader /></div>
            ) : (
                <div className="space-y-12">
                    {/* Captain - Centered */}
                    {captain && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center"
                        >
                            <div
                                className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-sm w-full cursor-pointer border-4 border-blue-600"
                                onClick={() => setSelectedOfficial(captain)}
                            >
                                <div className="relative aspect-square">
                                    <img src={captain.signedImageUrl} alt={captain.name} className="w-full h-full object-cover" />
                                    <div className="absolute top-4 right-4 bg-blue-600 text-white font-bold px-4 py-2 rounded-full text-sm shadow">
                                        CURRENT
                                    </div>
                                </div>
                                <div className="p-6 text-center">
                                    <h3 className="text-2xl font-bold text-gray-800">{captain.name}</h3>
                                    <p className="text-lg text-blue-600 font-medium mt-2">{captain.position}</p>
                                    <p className="text-sm text-gray-600 mt-3">
                                        Term: {captain.start_year} – Present
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Others Grid */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
                    >
                        {others.map((o, i) => (
                            <motion.div
                                key={o.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition"
                                onClick={() => setSelectedOfficial(o)}
                            >
                                <div className="aspect-square">
                                    <img src={o.signedImageUrl} alt={o.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-4 text-center">
                                    <h4 className="font-bold text-gray-800">{o.name}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{o.position}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            )}

            {/* Former Modal – now controlled by parent */}
            <AnimatePresence>
                {showFormer && (
                    <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onCloseFormer}
                    >
                        <motion.div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Former Punong Barangay</h2>
                                <button onClick={onCloseFormer}><FaTimes className="w-6 h-6" /></button>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {formerOfficials.length === 0 ? (
                                    <p className="col-span-full text-center text-gray-500 py-10">
                                        No former leaders recorded.
                                    </p>
                                ) : (
                                    formerOfficials.map(o => (
                                        <motion.div
                                            key={o.id}
                                            whileHover={{ y: -4 }}
                                            className="bg-gray-50 rounded-xl overflow-hidden cursor-pointer"
                                            onClick={() => {
                                                setSelectedOfficial(o); onCloseFormer();
                                            }}
                                        >
                                            <div className="aspect-square relative">
                                                <img src={o.signedImageUrl} alt={o.name} className="w-full h-full object-cover" />
                                                <div className="absolute top-3 left-3 bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs">
                                                    FORMER
                                                </div>
                                            </div>
                                            <div className="p-4 text-center">
                                                <h4 className="font-bold">{o.name}</h4>
                                                <p className="text-sm text-gray-600">{o.position}</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {o.start_year} – {o.end_year || "N/A"}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Modal */}
            <AnimatePresence>
                {selectedOfficial && (
                    <motion.div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedOfficial(null)}
                    >
                        <motion.div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="relative h-64 sm:h-80">
                                <img
                                    src={selectedOfficial.signedImageUrl}
                                    alt={selectedOfficial.name}
                                    className="w-full h-full object-cover"
                                    onError={e => e.target.src = placeholderImage}
                                />
                                <button
                                    onClick={() => setSelectedOfficial(null)}
                                    className="absolute top-3 right-3 p-2.5 bg-white rounded-full shadow"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                                {!selectedOfficial.is_current && (
                                    <div className="absolute top-3 left-3 bg-red-600 text-white font-bold px-4 py-2 rounded-full text-sm">
                                        FORMER
                                    </div>
                                )}
                            </div>
                            <div className="p-8 text-center">
                                <h3 className="text-2xl sm:text-3xl font-bold">{selectedOfficial.name}</h3>
                                <p className="text-xl text-blue-600 font-medium mt-2">{selectedOfficial.position}</p>
                                <p className="text-gray-600 mt-2">{selectedOfficial.official_type}</p>
                                <p className="text-sm text-gray-500 mt-4">
                                    Term: {selectedOfficial.start_year} – {selectedOfficial.is_current ? "Present" : selectedOfficial.end_year || "N/A"}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BarangayCouncil;
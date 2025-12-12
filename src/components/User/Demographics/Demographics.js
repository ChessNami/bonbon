import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../supabaseClient";
import { ClipLoader } from "react-spinners";
import { FaTimes, FaArrowLeft, FaInfoCircle } from "react-icons/fa";

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.2, duration: 0.5, ease: "easeOut" },
    }),
    hover: { scale: 1.01, transition: { duration: 0.15 } },
    tap: { scale: 0.98, transition: { duration: 0.15 } },
};

const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const modalVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.2 } },
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.5, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

const Demographics = () => {
    const [totalResidents, setTotalResidents] = useState(0);
    const [totalHouseholds, setTotalHouseholds] = useState(0);
    const [maleCount, setMaleCount] = useState(0);
    const [femaleCount, setFemaleCount] = useState(0);
    const [seniorCitizens, setSeniorCitizens] = useState(0);
    const [ageData, setAgeData] = useState([]);
    const [genderData, setGenderData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoneSeniorData, setZoneSeniorData] = useState({});
    const [zonePopulationData, setZonePopulationData] = useState({}); // New: population per zone
    const [seniorModalOpen, setSeniorModalOpen] = useState(false);
    const [populationModalOpen, setPopulationModalOpen] = useState(false);
    const [selectedSeniorZone, setSelectedSeniorZone] = useState(null);
    const [selectedPopulationZone, setSelectedPopulationZone] = useState(null);

    // Calculate age from DOB or provided age
    const calculateAge = useCallback((dob, providedAge) => {
        if (providedAge !== null && providedAge !== undefined) {
            if (typeof providedAge === "number") {
                return providedAge;
            }
            if (typeof providedAge === "string") {
                const ageNum = parseInt(providedAge.replace(" years old", ""));
                if (!isNaN(ageNum)) return ageNum;
            }
        }
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }
        return 0;
    }, []);

    // Memoized function to calculate total residents
    const calculateTotalResidents = useCallback((residents) => {
        let total = 0;
        residents.forEach((resident) => {
            total += 1;
            if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                total += 1;
            }
            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") {
                        composition = JSON.parse(composition);
                    }
                    composition.forEach((member) => {
                        if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                            total += 1;
                        }
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });
        return total;
    }, []);

    // Fetch and process demographic data
    const fetchDemographics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("residents")
                .select(`
                    household,
                    spouse,
                    household_composition,
                    resident_profile_status!inner(status)
                `)
                .eq("resident_profile_status.status", 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                setTotalResidents(0);
                setTotalHouseholds(0);
                setAgeData([]);
                setGenderData([]);
                setMaleCount(0);
                setFemaleCount(0);
                setSeniorCitizens(0);
                setZoneSeniorData({});
                setZonePopulationData({});
                return;
            }

            let male = 0;
            let female = 0;
            let other = 0;
            let age18Below = 0;
            let age18Above = 0;
            let seniors = 0;
            let zoneSeniorDataTemp = {};
            let zonePopulationDataTemp = {};
            for (let i = 1; i <= 9; i++) {
                zoneSeniorDataTemp[i] = { count: 0, names: [] };
                zonePopulationDataTemp[i] = { count: 0 };
            }

            data.forEach((resident) => {
                const household = resident.household;
                const headAge = calculateAge(household.dob, household.age);
                const headGender = household.customGender || household.gender;
                const zoneStr = household.zone || null;
                const zone = zoneStr ? parseInt(zoneStr.replace(/[^0-9]/g, '')) : null;
                const headName = `${household.firstName || ''} ${household.lastName || ''}`.trim() || 'Unknown';

                // Population count (all members)
                if (zone && zone in zonePopulationDataTemp) {
                    zonePopulationDataTemp[zone].count += 1;
                }
                if (headGender === "Male") male += 1;
                else if (headGender === "Female") female += 1;
                else other += 1;

                if (headAge <= 18) age18Below += 1;
                else age18Above += 1;
                if (headAge >= 60) {
                    seniors += 1;
                    if (zone && zone in zoneSeniorDataTemp) {
                        zoneSeniorDataTemp[zone].count += 1;
                        zoneSeniorDataTemp[zone].names.push(headName);
                    }
                }

                // Spouse
                if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                    const spouse = resident.spouse;
                    const spouseAge = calculateAge(spouse.dob, spouse.age);
                    const spouseGender = spouse.customGender || spouse.gender;
                    const spouseName = `${spouse.firstName || ''} ${spouse.lastName || ''}`.trim() || 'Unknown Spouse';

                    if (zone && zone in zonePopulationDataTemp) {
                        zonePopulationDataTemp[zone].count += 1;
                    }
                    if (spouseGender === "Male") male += 1;
                    else if (spouseGender === "Female") female += 1;
                    else other += 1;

                    if (spouseAge <= 18) age18Below += 1;
                    else age18Above += 1;
                    if (spouseAge >= 60) {
                        seniors += 1;
                        if (zone && zone in zoneSeniorDataTemp) {
                            zoneSeniorDataTemp[zone].count += 1;
                            zoneSeniorDataTemp[zone].names.push(spouseName);
                        }
                    }
                }

                // Household composition
                if (resident.household_composition) {
                    try {
                        let composition = resident.household_composition;
                        if (typeof composition === "string") {
                            composition = JSON.parse(composition);
                        }
                        composition.forEach((member) => {
                            if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                                const memberAge = calculateAge(member.dob, member.age);
                                const memberGender = member.customGender || member.gender;
                                const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown Member';

                                if (zone && zone in zonePopulationDataTemp) {
                                    zonePopulationDataTemp[zone].count += 1;
                                }
                                if (memberGender === "Male") male += 1;
                                else if (memberGender === "Female") female += 1;
                                else other += 1;

                                if (memberAge <= 18) age18Below += 1;
                                else age18Above += 1;
                                if (memberAge >= 60) {
                                    seniors += 1;
                                    if (zone && zone in zoneSeniorDataTemp) {
                                        zoneSeniorDataTemp[zone].count += 1;
                                        zoneSeniorDataTemp[zone].names.push(memberName);
                                    }
                                }
                            }
                        });
                    } catch (e) {
                        console.error("Error parsing household_composition:", e);
                    }
                }
            });

            Object.keys(zoneSeniorDataTemp).forEach(zone => {
                zoneSeniorDataTemp[zone].names.sort();
            });

            setTotalResidents(calculateTotalResidents(data));
            setTotalHouseholds(data.length);
            setMaleCount(male);
            setFemaleCount(female);
            setSeniorCitizens(seniors);
            setZoneSeniorData(zoneSeniorDataTemp);
            setZonePopulationData(zonePopulationDataTemp);

            const ageChartData = [
                { ageGroup: "18 below", count: age18Below },
                { ageGroup: "18 above", count: age18Above },
            ];

            const genderChartData = [
                { category: "Residents", male, female, other },
            ];

            setAgeData(ageChartData);
            setGenderData(genderChartData);

        } catch (err) {
            setError("Failed to fetch demographic data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [calculateAge, calculateTotalResidents]);

    useEffect(() => {
        fetchDemographics();
    }, [fetchDemographics]);

    const closeSeniorModal = () => {
        setSeniorModalOpen(false);
        setSelectedSeniorZone(null);
    };

    const closePopulationModal = () => {
        setPopulationModalOpen(false);
        setSelectedPopulationZone(null);
    };

    const goBackToSeniorZones = () => setSelectedSeniorZone(null);
    const goBackToPopulationZones = () => setSelectedPopulationZone(null);

    return (
        <div className="p-4 relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <ClipLoader color="#4f46e5" size={50} />
                </div>
            )}

            {/* Global Note */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> All demographic data shown here is based exclusively on resident profiles that have been <strong>approved</strong> (Status: Approved). Pending, rejected, or update-requested profiles are not included.
                </p>
            </div>

            {error ? (
                <p className="text-center text-red-500 text-lg">{error}</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                        {[
                            { title: "Barangay Population", value: totalResidents.toLocaleString(), color: "bg-indigo-600", modal: "population" },
                            { title: "Total Households Submitted", value: totalHouseholds.toLocaleString(), color: "bg-green-600" },
                            { title: "Male", value: maleCount.toLocaleString(), color: "bg-blue-600" },
                            { title: "Senior Citizens (60+)", value: seniorCitizens.toLocaleString(), color: "bg-purple-600", modal: "senior" },
                            { title: "Female", value: femaleCount.toLocaleString(), color: "bg-teal-600" },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.title}
                                custom={index}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                whileTap="tap"
                                className={`${stat.color} text-white p-6 rounded-xl shadow-lg text-center cursor-pointer`}
                                onClick={() => {
                                    if (stat.modal === "senior") setSeniorModalOpen(true);
                                    if (stat.modal === "population") setPopulationModalOpen(true);
                                }}
                            >
                                <p className="font-semibold text-sm uppercase tracking-wide">{stat.title}</p>
                                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Population by Age",
                                chart: (
                                    <BarChart data={ageData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="ageGroup" stroke="#6b7280" />
                                        <YAxis stroke="#6b7280" />
                                        <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                                        <Bar dataKey="count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                ),
                            },
                            {
                                title: "Gender Population Details",
                                chart: (
                                    <BarChart data={genderData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="category" stroke="#6b7280" />
                                        <YAxis stroke="#6b7280" />
                                        <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                                        <Legend />
                                        <Bar dataKey="male" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="female" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="other" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                ),
                            },
                        ].map((item, index) => (
                            <motion.div
                                key={item.title}
                                custom={index}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                whileTap="tap"
                                className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-150"
                            >
                                <p className="font-semibold text-lg text-gray-800 mb-4">{item.title}</p>
                                <motion.div variants={chartVariants} initial="hidden" animate="visible" className="h-96">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {item.chart}
                                    </ResponsiveContainer>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}

            {/* Senior Citizens Modal */}
            <AnimatePresence>
                {seniorModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closeSeniorModal} />
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center p-4 z-50"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                {/* Header */}
                                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-xl">
                                    <div className="flex items-center gap-4">
                                        {selectedSeniorZone !== null && (
                                            <button onClick={goBackToSeniorZones} className="hover:bg-purple-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedSeniorZone === null ? "Senior Citizens per Zone" : `Seniors in Zone ${selectedSeniorZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closeSeniorModal} className="hover:bg-purple-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {selectedSeniorZone === null ? (
                                            <motion.div key="senior-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zoneSeniorData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-purple-600 text-white p-8 rounded-xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:bg-purple-700"
                                                        onClick={() => setSelectedSeniorZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <p className="text-5xl font-bold mt-4">{data.count}</p>
                                                        <p className="text-sm mt-2 opacity-90">Click to view names</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="senior-names" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                                {zoneSeniorData[selectedSeniorZone].names.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {zoneSeniorData[selectedSeniorZone].names.map((name, idx) => (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 text-center"
                                                            >
                                                                <p className="text-lg font-medium text-purple-900">{name}</p>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12 text-gray-500">
                                                        <p className="text-xl">No seniors recorded in Zone {selectedSeniorZone}</p>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Barangay Population Modal */}
            <AnimatePresence>
                {populationModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closePopulationModal} />
                        <motion.div
                            className="fixed inset-0 flex items-center justify-center p-4 z-50"
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                {/* Header */}
                                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-t-xl">
                                    <div className="flex items-center gap-4">
                                        {selectedPopulationZone !== null && (
                                            <button onClick={goBackToPopulationZones} className="hover:bg-indigo-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedPopulationZone === null ? "Population per Zone" : `Population in Zone ${selectedPopulationZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closePopulationModal} className="hover:bg-indigo-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {selectedPopulationZone === null ? (
                                            <motion.div key="pop-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zonePopulationData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-indigo-600 text-white p-8 rounded-xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:bg-indigo-700"
                                                        onClick={() => setSelectedPopulationZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <p className="text-5xl font-bold mt-4">{data.count}</p>
                                                        <p className="text-sm mt-2 opacity-90">Total residents</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="pop-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                                                <div className="text-center py-12">
                                                    <p className="text-7xl font-bold text-indigo-600">{zonePopulationData[selectedPopulationZone].count}</p>
                                                    <p className="text-2xl text-gray-700 mt-6">Total residents living in Zone {selectedPopulationZone}</p>
                                                    <p className="text-base text-gray-500 mt-3">(Includes household head, spouse, and all household members)</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Demographics;
import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../supabaseClient";
import { ClipLoader } from "react-spinners";
import { FaTimes, FaArrowLeft, FaInfoCircle } from "react-icons/fa";

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
    }),
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 },
};

const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const modalVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -50 },
};

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.6, transition: { duration: 0.3 } },
};

const COLORS = {
    yes: "#10b981",   // green-500
    no: "#ef4444",    // red-500
    male: "#4f46e5",  // indigo-600
    female: "#10b981",
    other: "#f59e0b",
    children: "#f59e0b",
    adults: "#3b82f6",
    seniors: "#8b5cf6",
};

const Demographics = () => {
    const [totalResidents, setTotalResidents] = useState(0);
    const [totalHouseholds, setTotalHouseholds] = useState(0);
    const [maleCount, setMaleCount] = useState(0);
    const [femaleCount, setFemaleCount] = useState(0);
    const [seniorCitizens, setSeniorCitizens] = useState(0);
    const [ageData, setAgeData] = useState([]);
    const [ageAdditionsByYear, setAgeAdditionsByYear] = useState([]);
    const [genderData, setGenderData] = useState([]);
    const [zoneSeniorData, setZoneSeniorData] = useState({});
    const [zonePopulationData, setZonePopulationData] = useState({});
    const [zoneGenderData, setZoneGenderData] = useState({});
    const [censusData, setCensusData] = useState({
        isRenting: { Yes: 0, No: 0 },
        ownsHouse: { Yes: 0, No: 0 },
        hasOwnComfortRoom: { Yes: 0, No: 0 },
        hasOwnElectricity: { Yes: 0, No: 0 },
        hasOwnWaterSupply: { Yes: 0, No: 0 },
        isRegisteredVoter: { Yes: 0, No: 0 },
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [seniorModalOpen, setSeniorModalOpen] = useState(false);
    const [populationModalOpen, setPopulationModalOpen] = useState(false);
    const [genderModalOpen, setGenderModalOpen] = useState(false);
    const [selectedPopulationZone, setSelectedPopulationZone] = useState(null);
    const [selectedGenderZone, setSelectedGenderZone] = useState(null);

    const calculateAge = useCallback((dob, providedAge, referenceDate = new Date()) => {
        if (providedAge !== null && providedAge !== undefined) {
            if (typeof providedAge === "number") return providedAge;
            if (typeof providedAge === "string") {
                const ageNum = parseInt(providedAge.replace(" years old", ""));
                if (!isNaN(ageNum)) return ageNum;
            }
        }
        if (dob) {
            const birthDate = new Date(dob);
            const today = referenceDate;
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            return age;
        }
        return 0;
    }, []);

    const calculateTotalResidents = useCallback((residents) => {
        let total = 0;
        residents.forEach((resident) => {
            total += 1;
            if (resident.spouse && Object.keys(resident.spouse).length > 0) total += 1;
            if (resident.household_composition) {
                try {
                    let composition = resident.household_composition;
                    if (typeof composition === "string") composition = JSON.parse(composition);
                    composition.forEach((member) => {
                        if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) total += 1;
                    });
                } catch (e) {
                    console.error("Error parsing household_composition:", e);
                }
            }
        });
        return total;
    }, []);

    const fetchDemographics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from("residents")
                .select(`
                    created_at,
                    household,
                    spouse,
                    household_composition,
                    census,
                    resident_profile_status!inner(status)
                `)
                .eq("resident_profile_status.status", 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                setTotalResidents(0);
                setTotalHouseholds(0);
                setAgeData([]);
                setAgeAdditionsByYear([]);
                setGenderData([]);
                setMaleCount(0);
                setFemaleCount(0);
                setSeniorCitizens(0);
                setZoneSeniorData({});
                setZonePopulationData({});
                setZoneGenderData({});
                setCensusData({
                    isRenting: { Yes: 0, No: 0 },
                    ownsHouse: { Yes: 0, No: 0 },
                    hasOwnComfortRoom: { Yes: 0, No: 0 },
                    hasOwnElectricity: { Yes: 0, No: 0 },
                    hasOwnWaterSupply: { Yes: 0, No: 0 },
                    isRegisteredVoter: { Yes: 0, No: 0 },
                });
                return;
            }

            let male = 0, female = 0, other = 0;
            let children = 0, adults = 0, seniors = 0;

            const zoneSeniorDataTemp = {};
            const zonePopulationDataTemp = {};
            const zoneGenderDataTemp = {};
            const tempCensus = {
                isRenting: { Yes: 0, No: 0 },
                ownsHouse: { Yes: 0, No: 0 },
                hasOwnComfortRoom: { Yes: 0, No: 0 },
                hasOwnElectricity: { Yes: 0, No: 0 },
                hasOwnWaterSupply: { Yes: 0, No: 0 },
                isRegisteredVoter: { Yes: 0, No: 0 },
            };

            const ageAdditionsByYearTemp = {};

            for (let i = 1; i <= 9; i++) {
                zoneSeniorDataTemp[i] = { count: 0 };
                zonePopulationDataTemp[i] = { count: 0 };
                zoneGenderDataTemp[i] = { male: 0, female: 0 };
            }

            data.forEach((resident) => {
                const createdAt = new Date(resident.created_at);
                const createdYear = createdAt.getFullYear();
                if (!ageAdditionsByYearTemp[createdYear]) {
                    ageAdditionsByYearTemp[createdYear] = { children: 0, adults: 0, seniors: 0 };
                }

                const household = resident.household;
                const headCurrentAge = calculateAge(household.dob, household.age);
                const headHistAge = calculateAge(household.dob, household.age, createdAt);
                const headGender = household.customGender || household.gender;
                const zoneStr = household.zone || null;
                const zone = zoneStr ? parseInt(zoneStr.replace(/[^0-9]/g, '')) : null;

                // Population & Gender per zone (current)
                if (zone && zone in zonePopulationDataTemp) {
                    zonePopulationDataTemp[zone].count += 1;
                    if (headGender === "Male") zoneGenderDataTemp[zone].male += 1;
                    else if (headGender === "Female") zoneGenderDataTemp[zone].female += 1;
                }

                if (headGender === "Male") male += 1;
                else if (headGender === "Female") female += 1;
                else other += 1;

                // Current age groups
                if (headCurrentAge < 18) children += 1;
                else if (headCurrentAge < 60) adults += 1;
                else seniors += 1;
                if (headCurrentAge >= 60) {
                    if (zone) zoneSeniorDataTemp[zone].count += 1;
                }

                // Historical age groups for additions by year
                if (headHistAge < 18) ageAdditionsByYearTemp[createdYear].children += 1;
                else if (headHistAge < 60) ageAdditionsByYearTemp[createdYear].adults += 1;
                else ageAdditionsByYearTemp[createdYear].seniors += 1;

                // Spouse
                if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                    const spouse = resident.spouse;
                    const spouseCurrentAge = calculateAge(spouse.dob, spouse.age);
                    const spouseHistAge = calculateAge(spouse.dob, spouse.age, createdAt);
                    const spouseGender = spouse.customGender || spouse.gender;

                    if (zone && zone in zonePopulationDataTemp) {
                        zonePopulationDataTemp[zone].count += 1;
                        if (spouseGender === "Male") zoneGenderDataTemp[zone].male += 1;
                        else if (spouseGender === "Female") zoneGenderDataTemp[zone].female += 1;
                    }

                    if (spouseGender === "Male") male += 1;
                    else if (spouseGender === "Female") female += 1;

                    // Current
                    if (spouseCurrentAge < 18) children += 1;
                    else if (spouseCurrentAge < 60) adults += 1;
                    else seniors += 1;
                    if (spouseCurrentAge >= 60) {
                        if (zone) zoneSeniorDataTemp[zone].count += 1;
                    }

                    // Historical
                    if (spouseHistAge < 18) ageAdditionsByYearTemp[createdYear].children += 1;
                    else if (spouseHistAge < 60) ageAdditionsByYearTemp[createdYear].adults += 1;
                    else ageAdditionsByYearTemp[createdYear].seniors += 1;
                }

                // Household composition
                if (resident.household_composition) {
                    try {
                        let composition = resident.household_composition;
                        if (typeof composition === "string") composition = JSON.parse(composition);
                        composition.forEach((member) => {
                            if (member.isLivingWithParents === "Yes" || !member.isLivingWithParents) {
                                const memberCurrentAge = calculateAge(member.dob, member.age);
                                const memberHistAge = calculateAge(member.dob, member.age, createdAt);
                                const memberGender = member.customGender || member.gender;

                                if (zone && zone in zonePopulationDataTemp) {
                                    zonePopulationDataTemp[zone].count += 1;
                                    if (memberGender === "Male") zoneGenderDataTemp[zone].male += 1;
                                    else if (memberGender === "Female") zoneGenderDataTemp[zone].female += 1;
                                }

                                if (memberGender === "Male") male += 1;
                                else if (memberGender === "Female") female += 1;

                                // Current
                                if (memberCurrentAge < 18) children += 1;
                                else if (memberCurrentAge < 60) adults += 1;
                                else seniors += 1;
                                if (memberCurrentAge >= 60) {
                                    if (zone) zoneSeniorDataTemp[zone].count += 1;
                                }

                                // Historical
                                if (memberHistAge < 18) ageAdditionsByYearTemp[createdYear].children += 1;
                                else if (memberHistAge < 60) ageAdditionsByYearTemp[createdYear].adults += 1;
                                else ageAdditionsByYearTemp[createdYear].seniors += 1;
                            }
                        });
                    } catch (e) {
                        console.error("Error parsing household_composition:", e);
                    }
                }

                // Census Data Processing
                if (resident.census) {
                    let census;
                    try {
                        census = typeof resident.census === "string" ? JSON.parse(resident.census) : resident.census;
                    } catch (e) {
                        console.error("Error parsing census:", e);
                        census = {};
                    }

                    const countYesNo = (field) => {
                        if (census[field] === "Yes") tempCensus[field].Yes++;
                        else if (census[field] === "No") tempCensus[field].No++;
                    };

                    countYesNo("isRenting");
                    countYesNo("ownsHouse");
                    countYesNo("hasOwnComfortRoom");
                    countYesNo("hasOwnElectricity");
                    countYesNo("hasOwnWaterSupply");
                    countYesNo("isRegisteredVoter");
                }
            });

            // Set all data
            setTotalResidents(calculateTotalResidents(data));
            setTotalHouseholds(data.length);
            setMaleCount(male);
            setFemaleCount(female);
            setSeniorCitizens(seniors);
            setZoneSeniorData(zoneSeniorDataTemp);
            setZonePopulationData(zonePopulationDataTemp);
            setZoneGenderData(zoneGenderDataTemp);
            setCensusData(tempCensus);

            setAgeData([
                { ageGroup: "Children (0-17)", count: children },
                { ageGroup: "Adults (18-59)", count: adults },
                { ageGroup: "Seniors (60+)", count: seniors },
            ]);

            const sortedAgeAdditions = Object.entries(ageAdditionsByYearTemp)
                .map(([year, d]) => ({ year: parseInt(year), children: d.children, adults: d.adults, seniors: d.seniors }))
                .sort((a, b) => a.year - b.year);
            setAgeAdditionsByYear(sortedAgeAdditions);

            setGenderData([
                { category: "Residents", male, female, other },
            ]);

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

    const closeSeniorModal = () => setSeniorModalOpen(false);
    const closePopulationModal = () => { setPopulationModalOpen(false); setSelectedPopulationZone(null); };
    const closeGenderModal = () => { setGenderModalOpen(false); setSelectedGenderZone(null); };
    const goBackToGenderZones = () => setSelectedGenderZone(null);
    const goBackToPopulationZones = () => setSelectedPopulationZone(null);

    // Pie Chart Data Helper
    const getPieData = (yes, no) => [
        { name: "Yes", value: yes },
        { name: "No", value: no },
    ].filter(d => d.value > 0);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {loading && (
                <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
                    <ClipLoader color="#4f46e5" size={60} />
                </div>
            )}

            {/* Global Note */}
            <div className="mb-10 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg flex items-start gap-3">
                <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" size={22} />
                <p className="text-sm text-blue-900">
                    <strong>Note:</strong> All data is based exclusively on <strong>approved</strong> resident profiles. Pending or rejected profiles are excluded.
                </p>
            </div>

            {error ? (
                <div className="text-center text-red-600 text-xl">{error}</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-12">
                        {[
                            { title: "Total Population", value: totalResidents.toLocaleString(), color: "from-indigo-500 to-indigo-600", modal: "population" },
                            { title: "Households", value: totalHouseholds.toLocaleString(), color: "from-green-500 to-emerald-600" },
                            { title: "Males", value: maleCount.toLocaleString(), color: "from-blue-500 to-blue-600", modal: "gender" },
                            { title: "Females", value: femaleCount.toLocaleString(), color: "from-teal-500 to-teal-600", modal: "gender" },
                            { title: "Senior Citizens", value: seniorCitizens.toLocaleString(), color: "from-purple-500 to-purple-600", modal: "senior" },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.title}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                whileHover="hover"
                                whileTap="tap"
                                className={`bg-gradient-to-br ${stat.color} text-white p-6 rounded-2xl shadow-lg text-center cursor-pointer transform transition-all`}
                                onClick={() => stat.modal === "senior" ? setSeniorModalOpen(true) :
                                    stat.modal === "population" ? setPopulationModalOpen(true) :
                                        stat.modal === "gender" ? setGenderModalOpen(true) : null}
                            >
                                <p className="text-sm font-medium uppercase tracking-wider opacity-90">{stat.title}</p>
                                <p className="text-4xl font-bold mt-3">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main Charts - Age & Gender */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <motion.div variants={chartVariants} initial="hidden" animate="visible" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Current Population by Age Group</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={ageData}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                                    <XAxis dataKey="ageGroup" tick={{ fill: "#555" }} />
                                    <YAxis tick={{ fill: "#555" }} />
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        <motion.div variants={chartVariants} initial="hidden" animate="visible" className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Gender Distribution</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={genderData}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                                    <XAxis dataKey="category" tick={{ fill: "#555" }} />
                                    <YAxis tick={{ fill: "#555" }} />
                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                                    <Legend />
                                    <Bar dataKey="male" fill={COLORS.male} radius={[12, 12, 0, 0]} />
                                    <Bar dataKey="female" fill={COLORS.female} radius={[12, 12, 0, 0]} />
                                    <Bar dataKey="other" fill={COLORS.other} radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    </div>

                    {/* New Chart - Additions by Year and Age Group */}
                    {/* New Chart - Residents Added by Age Group per Year */}
                    <motion.div
                        variants={chartVariants}
                        initial="hidden"
                        animate="visible"
                        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-12"
                    >
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">
                            Residents by Age Group per Year
                        </h3>

                        {/* Info Note Bubble */}
                        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                            <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                            <div className="text-sm text-amber-900">
                                <p className="font-medium">Based on the year the resident profile was approved</p>
                                <p className="mt-1">
                                    Each resident (head, spouse, and household members) is counted in the year their profile was marked as <strong>approved</strong>.
                                    Their age group is calculated <em>as of the approval date</em>.
                                </p>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={ageAdditionsByYear}>
                                <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                                <XAxis dataKey="year" tick={{ fill: "#555" }} />
                                <YAxis tick={{ fill: "#555" }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                                />
                                <Legend />
                                <Bar dataKey="children" stackId="a" fill={COLORS.children} name="Children (0-17)" />
                                <Bar dataKey="adults" stackId="a" fill={COLORS.adults} name="Adults (18-59)" />
                                <Bar dataKey="seniors" stackId="a" fill={COLORS.seniors} radius={[12, 12, 0, 0]} name="Seniors (60+)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>

                    {/* Census Pie Charts */}
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-gray-800 text-center mb-10">Census Survey Insights</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: "Registered Voters", field: "isRegisteredVoter" },
                                { title: "Owns House", field: "ownsHouse" },
                                { title: "Renting", field: "isRenting" },
                                { title: "Own Comfort Room", field: "hasOwnComfortRoom" },
                                { title: "Own Electricity", field: "hasOwnElectricity" },
                                { title: "Own Water Supply", field: "hasOwnWaterSupply" },
                            ].map((item, i) => {
                                const data = getPieData(censusData[item.field].Yes, censusData[item.field].No);
                                const total = data.reduce((sum, d) => sum + d.value, 0);
                                if (total === 0) return null;

                                return (
                                    <motion.div
                                        key={item.field}
                                        custom={i}
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
                                    >
                                        <h4 className="text-xl font-semibold text-gray-800 text-center mb-6">{item.title}</h4>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.name === "Yes" ? COLORS.yes : COLORS.no} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 text-center text-sm text-gray-600">
                                            Total Responses: <strong>{total}</strong>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Modals remain unchanged but with improved styling */}
            {/* Senior Citizens Modal */}
            <AnimatePresence>
                {seniorModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={closeSeniorModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit">
                            <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-2xl">
                                    <h2 className="text-2xl font-bold">Senior Citizens per Zone</h2>
                                    <button onClick={closeSeniorModal} className="p-2 hover:bg-purple-800 rounded-full transition"><FaTimes size={24} /></button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex gap-3 items-start">
                                        <FaInfoCircle className="text-amber-700 mt-0.5" size={18} />
                                        <p className="text-sm text-amber-900">Based on approved resident profiles only.</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        {Object.entries(zoneSeniorData).map(([zone, data]) => (
                                            <div key={zone} className="bg-purple-600 text-white p-8 rounded-2xl text-center shadow-lg">
                                                <p className="text-lg font-semibold uppercase">Zone {zone}</p>
                                                <p className="text-5xl font-bold mt-4">{data.count}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Population Modal */}
            <AnimatePresence>
                {populationModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closePopulationModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
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
                                            <motion.div key="pop-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-12">
                                                <p className="text-7xl font-bold text-indigo-600">{zonePopulationData[selectedPopulationZone].count}</p>
                                                <p className="text-2xl text-gray-700 mt-6">Total residents living in Zone {selectedPopulationZone}</p>
                                                <p className="text-base text-gray-500 mt-3">(Includes household head, spouse, and all household members)</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Gender by Zone Modal */}
            <AnimatePresence>
                {genderModalOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={closeGenderModal} />
                        <motion.div className="fixed inset-0 flex items-center justify-center p-4 z-50" variants={modalVariants} initial="hidden" animate="visible" exit="exit" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[85vh]">
                                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-t-xl">
                                    <div className="flex items-center gap-4">
                                        {selectedGenderZone !== null && (
                                            <button onClick={goBackToGenderZones} className="hover:bg-blue-800 p-2 rounded-full transition-colors">
                                                <FaArrowLeft size={20} />
                                            </button>
                                        )}
                                        <h2 className="text-2xl font-bold">
                                            {selectedGenderZone === null ? "Gender Distribution per Zone" : `Gender in Zone ${selectedGenderZone}`}
                                        </h2>
                                    </div>
                                    <button onClick={closeGenderModal} className="hover:bg-blue-800 p-2 rounded-full transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                                        <FaInfoCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={18} />
                                        <p className="text-sm text-amber-800">Data shown is based only on <strong>approved</strong> resident profiles.</p>
                                    </div>
                                    <AnimatePresence mode="wait">
                                        {selectedGenderZone === null ? (
                                            <motion.div key="gender-zones" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {Object.entries(zoneGenderData).map(([zone, data], index) => (
                                                    <motion.div
                                                        key={zone}
                                                        custom={index}
                                                        variants={cardVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        className="bg-gradient-to-br from-blue-600 to-teal-600 text-white p-8 rounded-xl shadow-xl text-center cursor-pointer transition-all duration-200 hover:from-blue-700 hover:to-teal-700"
                                                        onClick={() => setSelectedGenderZone(parseInt(zone))}
                                                    >
                                                        <p className="font-semibold text-lg uppercase tracking-wide">Zone {zone}</p>
                                                        <div className="mt-4 space-y-2">
                                                            <p className="text-4xl font-bold">{data.male}</p>
                                                            <p className="text-sm opacity-90">Male</p>
                                                            <p className="text-4xl font-bold">{data.female}</p>
                                                            <p className="text-sm opacity-90">Female</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="gender-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center py-12">
                                                <div className="space-y-8">
                                                    <div>
                                                        <p className="text-7xl font-bold text-blue-600">{zoneGenderData[selectedGenderZone].male}</p>
                                                        <p className="text-2xl text-gray-700 mt-2">Male Residents</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-7xl font-bold text-teal-600">{zoneGenderData[selectedGenderZone].female}</p>
                                                        <p className="text-2xl text-gray-700 mt-2">Female Residents</p>
                                                    </div>
                                                    <p className="text-base text-gray-500 mt-8">
                                                        Total in Zone {selectedGenderZone}: {zoneGenderData[selectedGenderZone].male + zoneGenderData[selectedGenderZone].female}
                                                    </p>
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
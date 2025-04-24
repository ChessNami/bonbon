import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { supabase } from "../../../supabaseClient";
import { ClipLoader } from "react-spinners";

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
                console.warn("No resident data returned from Supabase");
                setTotalResidents(0);
                setTotalHouseholds(0);
                setAgeData([]);
                setGenderData([]);
                setMaleCount(0);
                setFemaleCount(0);
                setSeniorCitizens(0);
                return;
            }

            let male = 0;
            let female = 0;
            let other = 0;
            let age18Below = 0;
            let age18Above = 0;
            let seniors = 0;

            data.forEach((resident) => {
                const household = resident.household;
                const headAge = calculateAge(household.dob, household.age);
                const headGender = household.customGender || household.gender;

                if (headGender === "Male") male += 1;
                else if (headGender === "Female") female += 1;
                else other += 1;

                if (headAge <= 18) age18Below += 1;
                else age18Above += 1;
                if (headAge >= 60) seniors += 1;

                if (resident.spouse && Object.keys(resident.spouse).length > 0) {
                    const spouse = resident.spouse;
                    const spouseAge = calculateAge(spouse.dob, spouse.age);
                    const spouseGender = spouse.customGender || spouse.gender;

                    if (spouseGender === "Male") male += 1;
                    else if (spouseGender === "Female") female += 1;
                    else other += 1;

                    if (spouseAge <= 18) age18Below += 1;
                    else age18Above += 1;
                    if (spouseAge >= 60) seniors += 1;
                }

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

                                if (memberGender === "Male") male += 1;
                                else if (memberGender === "Female") female += 1;
                                else other += 1;

                                if (memberAge <= 18) age18Below += 1;
                                else age18Above += 1;
                                if (memberAge >= 60) seniors += 1;
                            }
                        });
                    } catch (e) {
                        console.error("Error parsing household_composition:", e);
                    }
                }
            });

            setTotalResidents(calculateTotalResidents(data));
            setTotalHouseholds(data.length);
            setMaleCount(male);
            setFemaleCount(female);
            setSeniorCitizens(seniors);

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
            setTotalResidents(0);
            setTotalHouseholds(0);
            setMaleCount(0);
            setFemaleCount(0);
            setSeniorCitizens(0);
            setAgeData([]);
            setGenderData([]);
        } finally {
            setLoading(false);
        }
    }, [calculateAge, calculateTotalResidents]);

    useEffect(() => {
        fetchDemographics();
        const subscription = supabase
            .channel("residents-channel")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "residents" },
                (payload) => {
                    console.log("Change detected in residents:", payload);
                    fetchDemographics();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "resident_profile_status",
                    filter: "status=eq.1",
                },
                (payload) => {
                    console.log("Change detected in resident_profile_status:", payload);
                    fetchDemographics();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchDemographics]);

    return (
        <div className="p-4 relative">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <ClipLoader color="#4f46e5" size={50} />
                </div>
            )}
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
            </motion.h1>

            {error ? (
                <p className="text-center text-red-500 text-lg">{error}</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                        {[
                            { title: "Barangay Population", value: totalResidents.toLocaleString(), color: "bg-indigo-600" },
                            { title: "Total Households Submitted", value: totalHouseholds.toLocaleString(), color: "bg-green-600" },
                            { title: "Male", value: maleCount.toLocaleString(), color: "bg-blue-600" },
                            { title: "Senior Citizens (60+)", value: seniorCitizens.toLocaleString(), color: "bg-purple-600" },
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
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#fff",
                                                borderRadius: "8px",
                                                border: "none",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                            }}
                                        />
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
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#fff",
                                                borderRadius: "8px",
                                                border: "none",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                            }}
                                        />
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
        </div>
    );
};

export default Demographics;
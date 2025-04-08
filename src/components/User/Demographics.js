import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, ResponsiveContainer } from "recharts";

const populationData = [
    { year: 1990, population: 4500 },
    { year: 1995, population: 6000 },
    { year: 2000, population: 7200 },
    { year: 2005, population: 8000 },
    { year: 2010, population: 9000 },
    { year: 2015, population: 9500 },
    { year: 2020, population: 10976 },
];

const householdData = [
    { year: 1990, households: 4000 },
    { year: 1995, households: 5500 },
    { year: 2000, households: 7000 },
    { year: 2005, households: 7500 },
    { year: 2010, households: 8500 },
    { year: 2015, households: 9200 },
];

const ageData = [
    { ageGroup: "15 and under", count: 4000 },
    { ageGroup: "15-64", count: 6000 },
    { ageGroup: "65 and over", count: 976 },
];

const genderData = [
    { category: "Group 1", male: 3200, female: 2800 },
    { category: "Group 2", male: 4000, female: 3800 },
    { category: "Group 3", male: 5000, female: 4500 },
];

const Demographics = () => {
    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-500 text-white p-4 rounded-md text-center text-xs">
                    <p className="font-semibold">Barangay Population</p>
                    <p className="text-lg font-bold">10,976</p>
                </div>
                <div className="bg-blue-500 text-white p-4 rounded-md text-center text-xs">
                    <p className="font-semibold">Population of Male</p>
                    <p className="text-lg font-bold">5,488</p>
                </div>
                <div className="bg-blue-500 text-white p-4 rounded-md text-center text-xs">
                    <p className="font-semibold">Out of School Youths</p>
                    <p className="text-lg font-bold">3,540</p>
                </div>
                <div className="bg-blue-500 text-white p-4 rounded-md text-center text-xs">
                    <p className="font-semibold">Population of Female</p>
                    <p className="text-lg font-bold">5,488</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 sm:grid-cols-1 gap-4">
                <div className="bg-white p-4 shadow-lg rounded-lg">
                    <p className="font-semibold">Population Details</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={populationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="population" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 shadow-lg rounded-lg">
                    <p className="font-semibold">Household Population</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={householdData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="households" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 shadow-lg rounded-lg">
                    <p className="font-semibold">Population by Age</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="ageGroup" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#ffc658" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-4 shadow-lg rounded-lg">
                    <p className="font-semibold">Gender Population Details</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={genderData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="male" fill="#8884d8" />
                                <Bar dataKey="female" fill="#82ca9d" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Demographics;
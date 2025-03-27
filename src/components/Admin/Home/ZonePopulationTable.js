import React, { useState, useEffect } from "react";

const ZonePopulationTable = () => {
    const [zones, setZones] = useState([]);

    useEffect(() => {
        // Define zones
        const zoneNames = [
            "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5",
            "Zone A", "Zone B", "Zone C", "Zone D"
        ];

        // Generate random population numbers
        const randomZones = zoneNames.map(zone => ({
            name: zone,
            population: Math.floor(Math.random() * (500 - 100 + 1)) + 100 // Random population between 100-500
        }));

        setZones(randomZones);
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Zone Population</h2>
            <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                    <thead className="sticky top-0">
                        <tr className="bg-gray-200">
                            <th className="p-3 border-b">Purok/Zone</th>
                            <th className="p-3 border-b">Population</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zones.map((zone, index) => (
                            <tr key={index} className="hover:bg-gray-100">
                                <td className="p-3 border border-gray-300">{zone.name}</td>
                                <td className="p-3 border border-gray-300 text-center">{zone.population}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ZonePopulationTable;

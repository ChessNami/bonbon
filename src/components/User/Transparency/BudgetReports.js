// BudgetReports.js
import React from "react";

const BudgetReports = () => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Budget & Financial Reports</h2>
            <p className="text-gray-700">
                View the financial reports and budget allocations for Barangay Bonbon.
                This ensures accountability and transparency in fund management.
            </p>
            <ul className="list-disc pl-6 mt-2">
                <li>2023 Q1 Budget: ₱500,000</li>
                <li>2023 Q2 Expenditure: ₱450,000</li>
            </ul>
        </div>
    );
};

export default BudgetReports;
import React from "react";
import { useUser } from "../../contexts/UserContext";

const MyAccount = () => {
    const { displayName } = useUser();
    const email = "user@example.com"; // Replace with actual email from context or props
    const dateCreated = "January 1, 2023"; // Replace with actual date from context or props

    return (
        <div>
            <h2 className="text-2xl font-bold">My Account</h2>
            <p><strong>Display Name:</strong> {displayName}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Date Created:</strong> {dateCreated}</p>
        </div>
    );
};

export default MyAccount;
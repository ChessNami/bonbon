import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [displayName, setDisplayName] = useState('');

    return (
        <UserContext.Provider value={{ displayName, setDisplayName }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
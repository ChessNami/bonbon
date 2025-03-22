import React from 'react';
import { ClipLoader } from 'react-spinners';
import './Loader.css';

const Loader = () => {
    return (
        <div className="loader-container">
            <ClipLoader color="#4fa94d" loading={true} size={80} />
        </div>
    );
};

export default Loader;
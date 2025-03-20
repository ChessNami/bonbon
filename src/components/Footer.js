import React from "react";

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-8">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start space-y-8 md:space-y-0 gap-x-8">
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">About Us</h2>
                    <p className="text-gray-400">
                        Barangay Bonbon is a vibrant community located in Cagayan de Oro City. Our mission is to foster a safe, inclusive, and prosperous environment for all residents.
                    </p>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">Quick Links</h2>
                    <ul className="text-gray-400 space-y-2">
                        <li><button className="hover:text-white">Home</button></li>
                        <li><button className="hover:text-white">Transparency</button></li>
                        <li><button className="hover:text-white">Demographics</button></li>
                        <li><button className="hover:text-white">Project Management</button></li>
                        <li><button className="hover:text-white">Strategic Road</button></li>
                    </ul>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold mb-4">Contact Us</h2>
                    <p className="text-gray-400">
                        <strong>Address:</strong> Barangay Hall, Bonbon, Cagayan de Oro City
                    </p>
                    <p className="text-gray-400">
                        <strong>Phone:</strong> (088) 123-4567
                    </p>
                    <p className="text-gray-400">
                        <strong>Email:</strong> info@barangaybonbon.com
                    </p>
                </div>
            </div>
            <div className="text-center text-gray-400 mt-8">
                &copy; {new Date().getFullYear()} Barangay Bonbon. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
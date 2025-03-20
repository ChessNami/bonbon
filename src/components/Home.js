import React from "react";

const Home = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center mb-8">Home Page</h1>
            <p className="text-lg text-gray-700 mb-4">
                Welcome to the Home page of Barangay Bonbon. We are committed to providing our community with the best services and information.
            </p>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">About Us</h2>
                <p className="text-lg text-gray-700 mb-4">
                    Barangay Bonbon is a vibrant community located in Cagayan de Oro City. Our mission is to foster a safe, inclusive, and prosperous environment for all residents. We offer a variety of services and programs to support our community members.
                </p>
                <p className="text-lg text-gray-700 mb-4">
                    Our barangay is known for its rich history, cultural heritage, and strong sense of community. We are proud of our achievements and continue to strive for excellence in all that we do.
                </p>
            </section>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Services</h2>
                <ul className="list-disc list-inside text-lg text-gray-700 mb-4">
                    <li>Health and Wellness Programs</li>
                    <li>Educational Support and Scholarships</li>
                    <li>Community Development Projects</li>
                    <li>Environmental Conservation Initiatives</li>
                    <li>Public Safety and Emergency Services</li>
                </ul>
                <p className="text-lg text-gray-700 mb-4">
                    We are dedicated to providing high-quality services to meet the needs of our residents. Our team works tirelessly to ensure that our community remains a great place to live, work, and play.
                </p>
            </section>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
                <p className="text-lg text-gray-700 mb-4">
                    Stay tuned for our upcoming events and activities. We have a variety of events planned throughout the year to bring our community together and celebrate our shared values and traditions.
                </p>
                <ul className="list-disc list-inside text-lg text-gray-700 mb-4">
                    <li>Community Clean-Up Drive - April 15, 2025</li>
                    <li>Annual Barangay Fiesta - May 20, 2025</li>
                    <li>Health and Wellness Fair - June 10, 2025</li>
                    <li>Educational Workshop Series - July 5, 2025</li>
                    <li>Environmental Awareness Campaign - August 25, 2025</li>
                </ul>
            </section>
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                <p className="text-lg text-gray-700 mb-4">
                    If you have any questions or need assistance, please do not hesitate to contact us. Our team is here to help you.
                </p>
                <p className="text-lg text-gray-700 mb-4">
                    <strong>Address:</strong> Barangay Hall, Bonbon, Cagayan de Oro City
                </p>
                <p className="text-lg text-gray-700 mb-4">
                    <strong>Phone:</strong> (088) 123-4567
                </p>
                <p className="text-lg text-gray-700 mb-4">
                    <strong>Email:</strong> info@barangaybonbon.com
                </p>
            </section>
        </div>
    );
};

export default Home;
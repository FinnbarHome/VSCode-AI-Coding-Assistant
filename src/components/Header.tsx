import React from "react";
import "../styles/header.css";

const Header: React.FC = () => {
    return (
        <header className="header">
            <h1>AI Coding Assistant</h1>
            <p>Get instant feedback on your code.</p>
        </header>
    );
};

export default Header;

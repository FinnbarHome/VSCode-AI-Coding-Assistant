import React from "react";

const Header: React.FC = () => {
    return (
        <header style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ color: "#007acc" }}>AI Coding Assistant</h1>
            <p>Click the button to get feedback on your open file.</p>
        </header>
    );
};

export default Header;

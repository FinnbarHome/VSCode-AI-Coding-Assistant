import React from "react";

const Header: React.FC = () => {
    return (
        <header style={{
            textAlign: "center",
            padding: "15px",
            backgroundColor: "#252526",
            borderRadius: "8px",
            boxShadow: "0px 4px 10px rgba(0, 122, 204, 0.3)"
        }}>
            <h1 style={{ color: "#61dafb", fontSize: "22px", fontWeight: "bold" }}>
                AI Coding Assistant
            </h1>
            <p style={{ color: "#cccccc" }}>
                Get instant feedback on your code.
            </p>
        </header>
    );
};

export default Header;

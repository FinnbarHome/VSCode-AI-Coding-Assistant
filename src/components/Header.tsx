import React from "react";

const Header: React.FC = () => {
    return (
        <header style={{
            textAlign: "center",
            padding: "20px",
            backgroundColor: "#252526",
            borderRadius: "8px",
            boxShadow: "0px 4px 10px rgba(0, 122, 204, 0.3)",
            marginBottom: "20px" 
        }}>
            <h1 style={{
                color: "#61dafb",
                fontSize: "22px",
                fontWeight: "bold",
                marginBottom: "8px" 
            }}>
                AI Coding Assistant
            </h1>
            <p style={{
                color: "#cccccc",
                marginBottom: "16px" 
            }}>
                Get instant feedback on your code.
            </p>
        </header>
    );
};


export default Header;

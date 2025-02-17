import React from "react";

interface BulletPointProps {
    text: string;
}

const BulletPoint: React.FC<BulletPointProps> = ({ text }) => {
    return <li style={{ padding: "6px", backgroundColor: "rgba(0, 122, 204, 0.2)", borderRadius: "5px", margin: "4px 0" }}>{text}</li>;
};

export default BulletPoint;

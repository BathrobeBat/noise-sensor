// Function to determine the marker's color baed on PM2.5 value
export const getMarkerColor = (value: number) => {
    if (value < 5) return "#8EFF44";
    if (value < 10) return "#F8FF73";
    if (value < 15) return "#FFB24D";
    if (value < 25) return "#DE0C4A";
    if (value < 35) return "#8F154A";
    if (value < 50) return "#8B4DB0";
    return "#000000";
};
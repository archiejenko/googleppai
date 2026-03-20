/**
 * Returns a Hex color and a descriptive label based on the score percentage.
 * @param {number} score - The percentage score (0-100)
 */
export const getPerformanceTheme = (score: number) => {
    if (score >= 90) return { color: "#10B981", label: "Mastered", intensity: "High" }; // Emerald Green
    if (score >= 70) return { color: "#3B82F6", label: "Proficient", intensity: "Medium" }; // Blue
    if (score >= 50) return { color: "#F59E0B", label: "Developing", intensity: "Low" }; // Amber
    return { color: "#EF4444", label: "At Risk", intensity: "Critical" }; // Red
};

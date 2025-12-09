import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface MEDDICScore {
    metrics: number;
    economicBuyer: number;
    decisionCriteria: number;
    decisionProcess: number;
    identifyPain: number;
    champion: number;
}

export interface PitchAnalysis {
    feedback: string;
    score: number;
    meddicScores: MEDDICScore;
    strengths: string[];
    improvements: string[];
    meddicBreakdown: {
        metrics: string;
        economicBuyer: string;
        decisionCriteria: string;
        decisionProcess: string;
        identifyPain: string;
        champion: string;
    };
    // Enhanced metrics
    sentimentScore: number; // -1 to 1 (negative to positive)
    confidenceScore: number; // 0-100
    paceScore: number; // 0-100
    clarityScore: number; // 0-100
    duration: number; // estimated in seconds
    keyPhrases: string[]; // Important phrases used
    fillerWordCount: number;
    questionCount: number;
}

export const analyzePitch = async (text: string): Promise<PitchAnalysis> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are an expert sales coach specializing in the MEDDIC sales methodology. Analyze the following sales pitch transcript and provide comprehensive scoring.

MEDDIC Framework:
- **Metrics (M)**: Does the pitch include quantifiable business impact, ROI, or measurable outcomes?
- **Economic Buyer (E)**: Does the pitch identify or address the economic decision-maker?
- **Decision Criteria (D)**: Does the pitch understand and address the customer's evaluation criteria?
- **Decision Process (D)**: Does the pitch acknowledge the buying process, timeline, or steps?
- **Identify Pain (I)**: Does the pitch clearly articulate the customer's pain points or challenges?
- **Champion (C)**: Does the pitch build rapport or identify ways to create an internal champion?

Additional Analysis:
- **Sentiment**: Overall emotional tone (-1 negative to 1 positive)
- **Confidence**: How confident and assertive is the delivery? (0-100)
- **Pace**: Is the speaking pace appropriate? (0-100, where 50 is ideal)
- **Clarity**: How clear and articulate is the message? (0-100)
- **Key Phrases**: Identify 3-5 impactful phrases used
- **Filler Words**: Count of filler words (um, uh, like, you know, etc.)
- **Questions**: Count of questions asked to engage the prospect

Return ONLY a valid JSON object with this exact structure:
{
    "score": <overall MEDDIC score 0-100>,
    "meddicScores": {
        "metrics": <0-100>,
        "economicBuyer": <0-100>,
        "decisionCriteria": <0-100>,
        "decisionProcess": <0-100>,
        "identifyPain": <0-100>,
        "champion": <0-100>
    },
    "meddicBreakdown": {
        "metrics": "<specific feedback on metrics>",
        "economicBuyer": "<specific feedback on economic buyer>",
        "decisionCriteria": "<specific feedback on decision criteria>",
        "decisionProcess": "<specific feedback on decision process>",
        "identifyPain": "<specific feedback on pain identification>",
        "champion": "<specific feedback on champion building>"
    },
    "feedback": "<overall general feedback on the pitch>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
    "sentimentScore": <-1 to 1>,
    "confidenceScore": <0-100>,
    "paceScore": <0-100>,
    "clarityScore": <0-100>,
    "duration": <estimated duration in seconds>,
    "keyPhrases": ["<phrase 1>", "<phrase 2>", "<phrase 3>"],
    "fillerWordCount": <number>,
    "questionCount": <number>
}

Do not include markdown formatting like \`\`\`json. Just the raw JSON.

Transcript: ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Clean up if markdown is present
        const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(cleanText);

        // Ensure all required fields are present with defaults
        return {
            feedback: parsed.feedback || "Analysis completed",
            score: parsed.score || 0,
            meddicScores: {
                metrics: parsed.meddicScores?.metrics || 0,
                economicBuyer: parsed.meddicScores?.economicBuyer || 0,
                decisionCriteria: parsed.meddicScores?.decisionCriteria || 0,
                decisionProcess: parsed.meddicScores?.decisionProcess || 0,
                identifyPain: parsed.meddicScores?.identifyPain || 0,
                champion: parsed.meddicScores?.champion || 0,
            },
            meddicBreakdown: {
                metrics: parsed.meddicBreakdown?.metrics || "No metrics analysis available",
                economicBuyer: parsed.meddicBreakdown?.economicBuyer || "No economic buyer analysis available",
                decisionCriteria: parsed.meddicBreakdown?.decisionCriteria || "No decision criteria analysis available",
                decisionProcess: parsed.meddicBreakdown?.decisionProcess || "No decision process analysis available",
                identifyPain: parsed.meddicBreakdown?.identifyPain || "No pain identification analysis available",
                champion: parsed.meddicBreakdown?.champion || "No champion building analysis available",
            },
            strengths: parsed.strengths || [],
            improvements: parsed.improvements || [],
            sentimentScore: parsed.sentimentScore ?? 0,
            confidenceScore: parsed.confidenceScore || 0,
            paceScore: parsed.paceScore || 50,
            clarityScore: parsed.clarityScore || 0,
            duration: parsed.duration || 0,
            keyPhrases: parsed.keyPhrases || [],
            fillerWordCount: parsed.fillerWordCount || 0,
            questionCount: parsed.questionCount || 0,
        };
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            feedback: "Analysis failed",
            score: 0,
            meddicScores: {
                metrics: 0,
                economicBuyer: 0,
                decisionCriteria: 0,
                decisionProcess: 0,
                identifyPain: 0,
                champion: 0,
            },
            meddicBreakdown: {
                metrics: "Analysis failed",
                economicBuyer: "Analysis failed",
                decisionCriteria: "Analysis failed",
                decisionProcess: "Analysis failed",
                identifyPain: "Analysis failed",
                champion: "Analysis failed",
            },
            strengths: [],
            improvements: [],
            sentimentScore: 0,
            confidenceScore: 0,
            paceScore: 50,
            clarityScore: 0,
            duration: 0,
            keyPhrases: [],
            fillerWordCount: 0,
            questionCount: 0,
        };
    }
};

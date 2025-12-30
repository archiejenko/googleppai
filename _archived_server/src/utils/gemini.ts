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

export const analyzePitch = async (input: { text?: string, audio?: { buffer: Buffer, mimeType: string } }): Promise<PitchAnalysis> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let promptParts: any[] = [];

        const systemPrompt = `You are an expert sales coach specializing in the MEDDIC sales methodology. Analyze the provided sales pitch (audio or text) and provide comprehensive scoring.

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
        "metrics": "<specific feedback>",
        "economicBuyer": "<specific feedback>",
        "decisionCriteria": "<specific feedback>",
        "decisionProcess": "<specific feedback>",
        "identifyPain": "<specific feedback>",
        "champion": "<specific feedback>"
    },
    "feedback": "<overall general feedback>",
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

Do not include markdown formatting like \`\`\`json. Just the raw JSON.`;

        promptParts.push(systemPrompt);

        if (input.audio) {
            promptParts.push({
                inlineData: {
                    mimeType: input.audio.mimeType,
                    data: input.audio.buffer.toString('base64')
                }
            });
            promptParts.push("Analyze this audio pitch.");
        } else if (input.text) {
            promptParts.push(`Transcript: ${input.text}`);
        } else {
            throw new Error("No input provided");
        }

        const result = await model.generateContent(promptParts);
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
            feedback: "Analysis failed. Please try again.",
            score: 0,
            meddicScores: { metrics: 0, economicBuyer: 0, decisionCriteria: 0, decisionProcess: 0, identifyPain: 0, champion: 0 },
            meddicBreakdown: { metrics: "N/A", economicBuyer: "N/A", decisionCriteria: "N/A", decisionProcess: "N/A", identifyPain: "N/A", champion: "N/A" },
            strengths: [],
            improvements: [],
            sentimentScore: 0,
            confidenceScore: 0,
            paceScore: 0,
            clarityScore: 0,
            duration: 0,
            keyPhrases: [],
            fillerWordCount: 0,
            questionCount: 0,
        };
    }
};

export const continueConversation = async (
    history: { role: 'user' | 'ai', text: string }[],
    newMessage: string,
    context: { scenario: string, persona: string, goal: string }
): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const historyForGemini = history.map(h => ({
            role: h.role === 'ai' ? 'model' : 'user',
            parts: [{ text: h.text }]
        }));

        const systemPrompt = `You are roleplaying as a sales prospect. 
        Context:
        - Scenario: ${context.scenario}
        - Your Role: ${context.persona}
        - Salesperson's Goal: ${context.goal}
        
        Instructions:
        - Act naturally, like a busy professional.
        - Do not be overly helpful or overly difficult unless the difficulty setting implies it (assume medium difficulty).
        - Keep responses concise (1-3 sentences) to allow for back-and-forth conversation.
        - React to what the user says. If they make a good point, acknowledge it. If they are vague, ask for clarification.
        - Do not break character.`;

        // Start waiting for the first user message, or if history exists, append to it.
        // Actually, startChat allows providing history.
        // But we need to inject system prompt. 
        // Gemini doesn't have a strict 'system' role in `startChat` history in all versions, 
        // but passing it as the first 'user' part or separately is common.
        // Let's prepend the system prompt to the first history item or current prompt?
        // Better: use `systemInstruction` if available (Gemini 1.5 Pro/Flash supports it).

        const chat = model.startChat({
            history: historyForGemini,
            systemInstruction: systemPrompt
        });

        const result = await chat.sendMessage(newMessage);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("Gemini Chat Error:", error);
        return "I apologize, I didn't verify that. Could you repeat it?";
    }
};

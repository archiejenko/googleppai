# Training Content Data Guide

This guide defines the data structure required for creating industry-specific call scenarios and learning paths in PitchPerfect AI.

## Scenario Templates (Industry Specific)

The `Industry` model in the database contains a `scenarioTemplates` field (JSON). This field stores an array of pre-defined training scenarios available for that industry.

### JSON Structure

Each scenario template in the array should follow this structure:

```json
{
  "id": "unique_string_id",
  "title": "Display Title of the Scenario",
  "description": "Detailed context for the AI and the user. Explain who they are talking to and what the goal is.",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "targetPersona": "Job Title or Role (e.g., CTO, VP of Sales)"
}
```

### Example (SaaS Industry)

```json
[
  {
    "id": "saas_cold_call_1",
    "title": "Cold Call: CTO of Series B Startup",
    "description": "You are calling the CTO of a growing Series B startup. They are currently using a competitor's legacy solution. Your goal is to book a 15-minute discovery meeting.",
    "difficulty": "intermediate",
    "targetPersona": "CTO"
  },
  {
    "id": "saas_closing_1",
    "title": "Closing: Procurement Manager",
    "description": "Negotiating final terms with a procurement manager who is pushing for a discount.",
    "difficulty": "hard",
    "targetPersona": "Procurement Manager"
  }
]
```

## Adding New Content

1.  **Via Seed Script**: Update `server/prisma/seed.ts` in the `industries` array.
2.  **Via Database**: deeply the `scenarioTemplates` JSON column for the specific `Industry` row.

## Learning Modules

Learning modules are separate from random training sessions. They are structured lessons.

### Schema
- **Title**: Name of the module (e.g., "Handling Objections")
- **Description**: What the user will learn.
- **Content**: The textual or video content of the lesson.
- **Duration**: Estimated time in minutes.
- **Difficulty**: Difficulty level.

### Creation
Currently managed via the `seed.ts` file or direct database insertion. Future updates will include an Admin UI for creating these modules.

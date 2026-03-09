# Gemini CLI Project Rules

## Core Mandates

### 1. UI/UX Focus & Logic Restriction
- **Primary Responsibility:** You are primarily responsible for UI/UX improvements, styling, and front-end interface adjustments.
- **Logic Boundary:** You MUST NOT modify core business logic, database schemas, API structures, or critical backend algorithms.
- **Explicit Permission:** If a UI change necessitates a change in business logic, you MUST inform the user first and obtain explicit permission before proceeding with the logic modification.
- **Safety First:** Always prioritize the stability of the existing business logic. If you are unsure whether a change is "logic" or "UI", treat it as logic and ask for clarification.

### 2. General Principles
- Adhere to the existing design patterns and styling conventions (Tailwind CSS, shadcn/ui).
- Ensure all UI changes are responsive and follow the established user experience guidelines.
- Always run `npm run lint` and `npm run typecheck` after UI changes to ensure no breakage.

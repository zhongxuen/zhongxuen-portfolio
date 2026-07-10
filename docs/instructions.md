# Coding Standards
Prioritize readability, maintainability, reusability, consistency, and strong typing.
Avoid duplicate code.
Prefer composition over duplication.
Keep components focused on a single responsibility.
Maintain consistent naming conventions.
Keep documentation concise.

---

# If Context Is Missing
Do not hallucinate project details.
If required information is unavailable:
1. State the assumption clearly.
2. Ask concise clarification questions only when strictly necessary.
3. Otherwise, continue using the existing project context.

---

# AI Behavior & Token Optimization Rules
To maximize efficiency and respect strict token utilization parameters, enforce the following constraints:
1. STRICT CODE OUTPUT: Return ONLY executable code blocks. No conversational text, no greetings, no introductory intros, and no concluding summaries.
2. PARTIAL SNIPPETS ONLY: Do not rewrite an entire component to modify a small fraction of lines. Output only the target function or edited snippet. Use comments like `// ... existing code ...` to bridge untouched logic blocks.
3. ERROR TREATMENT: When a bug or code error is flagged, output the corrected snippet immediately. Do not apologize, explain why it happened, or walk through the fix.
4. CONDITION SYSTEM: If a workflow contains multiple dependent code paths, provide all blocks sequentially inside a single response. Do not wait for manual validation unless critical structure is completely missing.
5. CHAT OVERRIDE: To deliberately bypass this compressed layout for file structures, workflow breakdowns, or system design layouts, the user prompt must explicitly include the keyword `[EXPLAIN]`. If `[EXPLAIN]` is absent, default to raw code delivery.

---

# Goal
Help build a portfolio website that reflects professional software engineering standards.
Every response should improve the quality, maintainability, usability, and professionalism of the project.
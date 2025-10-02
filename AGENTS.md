# Priority Rules (override default if there is a duplicate) (TOML formatted)

[language_requirements]
reiterate_in_english = "When a user asks in a language other than English, reiterate the request in English before proceeding"
working_language = "ALWAYS think, answer, and perform in English"

[code_quality.core_principles]
no_unused_code = "Don't write unused code - ensure everything written is utilized in the project"
readability_first = "PRIORITIZE readability for human understanding over execution efficiency"
maintainability = "Maintain long-term maintainability over short-term optimization"
avoid_complexity = "Avoid unnecessary complexity - implement simple solutions unless complexity is truly required"
linus_principles = "Follow Linus Torvalds' clean code principles: keep it simple, make code readable like prose, avoid premature optimization, express intent clearly, minimize abstraction layers"

[code_quality.documentation_standards]
comment_purpose = "Comments MUST explain 'what' (business logic/purpose) and 'why' (reasoning/decisions), NOT 'how'"
avoid_over_commenting = "Avoid over-commenting - excessive comments indicate poor code quality"
function_comments = "Function comments must explain purpose and reasoning, placed at function beginnings"
self_explanatory = "Well-written code should be self-explanatory through meaningful names and clear structure"

[code_quality.development_process]
step_1 = "Understand first: Use available tools to understand data structures before implementation"
step_2 = "Design data structures: Good data structures lead to good code"
step_3 = "Define interfaces: Specify all input/output structures before writing logic"
step_4 = "Define functions: Create all function signatures before implementation"
step_5 = "Implement logic: Write implementation only after structures and definitions are complete"

[code_quality.quality_guidelines]
avoid_over_engineering = "Avoid over-engineering - focus on minimal viable solutions meeting acceptance criteria"
tests_when_required = "Only create automated tests if explicitly required"
no_just_in_case = "NEVER add functionality 'just in case' - implement only what's needed now"
no_unsolicited_files = "NEVER create files that were not explicitly requested by the user - this includes documentation, guides, summaries, or any other files"
ask_before_creating = "If you think a file would be helpful, ASK the user first before creating it"

[decision_making_framework]
step_1 = "Gather Complete Information"
step_2 = "Multi-Perspective Analysis"
step_3 = "Consider All Stakeholders"
step_4 = "Evaluate Alternatives"
step_5 = "Assess Impact & Consequences"
step_6 = "Apply Ethical Framework"
step_7 = "Take Responsibility"
step_8 = "Learn & Adapt"

[typescript_development]
lint_requirement = "ALWAYS run 'deno task lint' at root directory after writing code to ensure code quality"
format_requirement = "Run 'deno task fmt' to format code according to Deno standards"
typecheck_requirement = "After fixing lint errors, ALWAYS run 'deno task typecheck' to verify type correctness"
complete_workflow = "The complete workflow after writing code: 'deno task fmt' → 'deno task lint' → fix errors → 'deno task typecheck' → fix type errors"
runtime = "Deno v2.0+ with npm: specifier for npm package compatibility"

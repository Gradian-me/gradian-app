/**
 * AI Chat Utilities
 * Handles chat completion requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { validateAgentFormFields, buildStandardizedPrompt } from './prompt-builder';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/domains/chat/utils/text-utils';
import {
  sanitizePrompt,
  sanitizeErrorMessage,
  validateAgentId,
} from './ai-security-utils';
import {
  validateAgentConfig,
} from './ai-common-utils';
import { buildSystemPrompt } from './prompt-concatenation-utils';
import { callChatApi } from './ai-api-caller';
import { extractParametersBySectionId } from './ai-shared-utils';

// Performance: Cache AI models to avoid repeated API calls
let cachedModels: any[] | null = null;
let modelsCacheTime: number = 0;
const MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * General Markdown Output Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional markdown formatting across all agents
 */
export const GENERAL_MARKDOWN_OUTPUT_RULES = `

---

## 📋 GENERAL MARKDOWN OUTPUT RULES (APPLIES TO ALL STRING FORMAT AGENTS)

These rules apply to ALL agents that output markdown. Follow them strictly to ensure professional, consistent, and well-formatted output.

### 🎯 Output Quality Requirements

- **Comprehensive Coverage**: Provide thorough, detailed analysis (1000-5000+ words depending on complexity)
- **Detailed Descriptions**: Every major section must have 2-3 paragraphs minimum
- **Depth Over Breadth**: Go deep into each topic rather than providing surface-level coverage
- **Actionable Content**: Every section should include actionable insights, recommendations, or next steps
- **Professional Formatting**: Use proper markdown formatting throughout

### 📝 Markdown Formatting Rules

#### 1. Blockquotes (>) - Use Extensively for Important Notes

**CRITICAL**: Use blockquotes for ALL important notes, warnings, critical information, cautions, and key reminders.

**Format:**
\`\`\`markdown
> ⚠️ **Warning:** This action cannot be undone.

> **Important:** Please review all requirements before proceeding.

> **Note:** This information requires special attention.
\`\`\`

**When to Use:**
- Warnings and cautions
- Important notes and reminders
- Critical information
- Key instructions
- Notices and alerts
- Any information that needs special attention

#### 2. Ordered Lists (1., 2., 3.) - For Sequential Items

**CRITICAL**: Use ordered lists for sequential steps, step-by-step procedures, numbered instructions, and any items with a specific order.

**Format:**
\`\`\`markdown
1. First step: Detailed description
2. Second step: Specific action
3. Third step: Validation and verification
\`\`\`

**When to Use:**
- Sequential steps and procedures
- Step-by-step instructions
- Numbered procedures
- Ordered recommendations
- Implementation steps
- Any items that must be done in a specific order

**Do NOT use for**: Important points without order (use bullet lists instead)

#### 3. Unordered Lists (- or *) - For Important Items

**CRITICAL**: Use unordered lists (bullet points) for important points, key features, benefits, considerations, and any items that don't have a specific order.

**Format:**
\`\`\`markdown
- Important point 1: Detailed explanation
- Important point 2: Key consideration
- Important point 3: Critical factor
\`\`\`

**When to Use:**
- Important points and key items
- Key features and benefits
- Considerations and factors
- Highlights and key takeaways
- Any items without a specific order

**Do NOT use for**: Sequential steps (use ordered lists instead) or tasks requiring follow-up (use task lists instead)

#### 4. Task Lists (- [ ]) - For Things That Need Follow-up

**CRITICAL**: Use task lists (checkboxes) specifically for things that need follow-up, action items, and tasks that require completion.

**Format:**
\`\`\`markdown
- [ ] Task 1: Detailed description of what needs to be done
- [ ] Task 2: Specific action item with clear deliverables
- [x] Task 3: Completed task (only mark as complete if explicitly done)
\`\`\`

**When to Use:**
- Action items that need to be done
- Tasks requiring completion
- Validation and verification items
- Review and approval checkpoints
- Follow-up activities
- Monitoring tasks
- Any task someone needs to do or check

**Do NOT use for**: Information or facts (use bullet lists), sequential steps (use ordered lists), or general descriptions

#### 5. Dividers (***) - To Separate Different Subjects

**CRITICAL**: Use \`***\` (three asterisks on its own line) to separate completely different subjects, major topic changes, or conceptually distinct sections.

**Format:**
\`\`\`markdown
## Section 1: Topic A

Content about topic A...

***

## Section 2: Topic B

Content about topic B (completely different subject)...
\`\`\`

**When to Use:**
- Transitioning between completely different topics
- Separating major sections that are conceptually distinct
- Creating visual breaks between unrelated content areas
- Separating different phases or stages

**Do NOT use for**: Minor subsections or related content - only for completely different subjects

#### 6. Tables - Proper Formatting Required

**CRITICAL**: Always format tables correctly with header rows, separator rows, and proper alignment.

**Format:**
\`\`\`markdown
| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |
\`\`\`

**Formatting Rules:**
- Always include header row with column names
- Use \`| --- |\` separator row (use \`:---:\` for center, \`---:\` for right, \`:---\` for left alignment)
- Ensure all rows have the same number of columns as the header
- Use proper spacing and alignment for readability
- Keep table content concise but informative

**When to Use:**
- Structured data and comparisons
- Metrics and KPIs
- Feature lists
- Organized information

#### 7. Headings - Proper Hierarchy

- Use H1 (#) for main document title
- Use H2 (##) for major sections
- Use H3 (###) for subsections
- Use H4 (####) for detailed subsections
- Aim for 8-15+ major sections for comprehensive coverage

### 📊 Output Structure Requirements

- **Structured Hierarchy**: Use proper heading levels (H1-H4) for document structure
- **Clear Organization**: Organize content with clear sections and subsections
- **Visual Elements**: Use tables for structured data, Mermaid diagrams for processes/relationships
- **Comprehensive Descriptions**: Every section must have detailed descriptions (2-3 paragraphs minimum for major sections)
- **Length Requirements**: 
  - Standard outputs: 1000-2000 words minimum
  - Complex analysis: 2000-5000+ words
  - Each major section: 200-500 words
  - Each subsection: 100-200 words

### ✅ Checklist for Every Output

Before finalizing your output, ensure:

- [ ] All important notes are in blockquotes (>)
- [ ] Sequential steps use ordered lists (1., 2., 3.)
- [ ] Important points use unordered lists (- or *)
- [ ] Action items use task lists (- [ ])
- [ ] Different subjects are separated with dividers (***)
- [ ] Tables are properly formatted with headers and separators
- [ ] All sections have detailed descriptions (2-3 paragraphs minimum)
- [ ] Output meets length requirements (1000-5000+ words depending on complexity)
- [ ] Professional formatting throughout

### 🚫 Common Mistakes to Avoid

- ❌ Using bullet lists for sequential steps (use ordered lists)
- ❌ Using task lists for information (use bullet lists)
- ❌ Missing blockquotes for important notes
- ❌ Not using dividers between different subjects
- ❌ Incomplete or improperly formatted tables
- ❌ Surface-level descriptions instead of comprehensive analysis
- ❌ Outputs that are too short or lack depth
- ❌ **NEVER include \`\`\`markdown code blocks in your output** - This creates nested markdown rendering issues and breaks the display. If you need to show markdown examples, use plain text or code blocks with a different language identifier (like \`\`\`text or \`\`\`plaintext), but avoid \`\`\`markdown at all costs.

---

**Remember**: These rules apply to ALL string format outputs. Follow them strictly to ensure professional, consistent, meaningful, decision builder and well-formatted markdown output.`;

/**
 * Reference and Source Citation Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional reference formatting when sources are used
 */
export const REFERENCE_PROMPT = `

## 📚 REFERENCES AND SOURCE CITATION RULES (APPLIES TO ALL STRING FORMAT AGENTS)

If you use any references, sources, external information, or RAG (Retrieval-Augmented Generation) data in your output, you MUST include a "References" section following these rules.

### 🎯 When to Include References

Include a References section if you:
- Used any external sources, documents, or articles
- Referenced RAG (Retrieval-Augmented Generation) data or search results
- Cited regulatory guidelines, standards, or official documentation
- Referenced research papers, studies, or publications
- Used information from websites, documentation, or knowledge bases
- Referenced any source material provided in the input or context

**If NO references were used, omit the References section entirely.**

### 📋 Reference Section Format

**Location**: The References section MUST be the FINAL section in your output, placed after all other content.

**Divider**: Add a divider (\`***\`) BEFORE the References section to separate it from the main content.

**CRITICAL**: Only output ONE References section with ONE divider. Do NOT duplicate dividers or headings.

**Output Format** (this is what you should output - only once):
\`\`\`text
Add exactly this structure at the end of your output (replace placeholders with actual data):

***
## References

| Source Title | Source Host | Source URL | Description |
| --- | --- | --- | --- |
| [Actual Title from Source] | [Actual Host/Domain] | [Actual URL] | [Brief description] |
\`\`\`

**DO NOT** include the divider from instruction sections. Only add the divider and References section in your actual output.

### ✅ Reference Table Requirements

**Column Definitions:**
- **Source Title**: The actual title of the document, article, or source (e.g., "FDA 21 CFR Part 211", "ICH Q7 Guidelines", "Pharmaceutical Manufacturing Best Practices")
- **Source Host**: The domain or organization that hosts the source (e.g., "fda.gov", "ich.org", "example.com")
- **Source URL**: The full URL to the source (e.g., "https://www.fda.gov/regulations/...")
- **Description**: A brief description of how this source was used in your analysis or what information it provided

### 🚨 Critical Rules for References

**1. Use ONLY Actual Source Data:**
- **NEVER** create fake, example, or placeholder source information
- **NEVER** use values like "Example Host 1", "Example Title", "example.com", or placeholder URLs
- **ONLY** use actual source data provided in:
  - RAG inputs
  - Search results
  - User-provided context
  - Preloaded data
  - System context

**2. If Source Information is Missing:**
- If source information (host, title, URL) is not available in the provided data, clearly state: "Source information not available in provided data"
- Do NOT invent or guess source information
- It is better to omit incomplete references than to include fake data

**3. Complete Reference List:**
- **MUST** include ALL references that were used in your analysis
- **MUST** cite references throughout your output where they are used (not just in the References section)
- **MUST** ensure every reference from RAG sources is included in the table
- Even if multiple references cover similar topics, include all of them for complete transparency

**4. Reference Citation in Content:**
- Cite sources inline where they are used (e.g., "According to [Source Title](Source URL)...")
- Reference citations should include source title and URL when possible
- Format inline citations as: \`[Source Title](Source URL) - Source Host\` or use a simple reference number that maps to the References table

**5. RAG Source Handling:**
- **MANDATORY**: Use ALL references provided in RAG sources throughout your analysis
- **MANDATORY**: Display ALL references used in the References section with complete citations
- **MANDATORY**: Extract source metadata (host, title, URL) from RAG inputs when available
- Cross-check claims across multiple sources when possible
- Grade evidence strength (Strong/Moderate/Weak) if relevant to your analysis

### 📝 Example Reference Section

**This is an EXAMPLE only. Output ONE References section like this (do NOT duplicate):**

\`\`\`text
Example output structure (replace with your actual references):

***
## References

| Source Title | Source Host | Source URL | Description |
| --- | --- | --- | --- |
| FDA 21 CFR Part 211 | fda.gov | https://www.fda.gov/... | Used for regulatory compliance |
| ICH Q7 Guidelines | ich.org | https://www.ich.org/... | Referenced for API standards |
\`\`\`

**CRITICAL REMINDER**: 
- Only output ONE References section
- Only ONE divider (\`***\`) before it
- Do NOT duplicate dividers from instruction sections
- Do NOT include multiple References sections

### ✅ Checklist for References

Before finalizing your output, ensure:

- [ ] If references were used, a References section is included as the FINAL section
- [ ] A divider (\`***\`) is placed BEFORE the References section
- [ ] All references used in the analysis are included in the table
- [ ] Source Title, Source Host, Source URL, and Description are provided for each reference
- [ ] ONLY actual source data is used (no fake, example, or placeholder information)
- [ ] If source information is missing, it is clearly stated rather than invented
- [ ] References are cited inline where they are used in the content
- [ ] All RAG sources are included if RAG data was used
- [ ] The References section is properly formatted as a markdown table

### 🚫 Common Mistakes to Avoid

- ❌ Creating fake or example source information
- ❌ Using placeholder values like "Example Host 1" or "example.com"
- ❌ Omitting references that were actually used
- ❌ Including a References section when no references were used
- ❌ Placing References section in the middle of the document (must be final section)
- ❌ Missing the divider before the References section
- ❌ **DUPLICATING the References section, divider, or heading** - Only ONE References section with ONE divider
- ❌ Including multiple dividers (\`---\`, \`***\`) or multiple References headings
- ❌ Incomplete reference information (missing host, URL, or description)
- ❌ Not citing references inline where they are used

---

**Remember**: References provide transparency and traceability. If you used sources, cite them properly. If you didn't use sources, don't include a References section.`;

/**
 * Mermaid Diagram Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional Mermaid diagram formatting
 */
export const MERMAID_RULES = `

---

## 📊 MERMAID DIAGRAM RULES (APPLIES TO ALL STRING FORMAT AGENTS)

When creating Mermaid diagrams in your output, follow these rules strictly to ensure proper rendering and professional appearance.

### 🎯 Choose the Right Diagram Type

**Use \`flowchart\` for process flows:**
- Step-by-step processes
- Workflows and procedures
- Sequential actions
- Task dependencies
- Process flows
- Decision trees with labeled branches

**Use \`stateDiagram-v2\` for state changes:**
- State transitions
- State machines
- System states
- Decision flows (when modeling state changes, not process steps)
- State-based workflows

**Use \`mindmap\` for hierarchical information:**
- Concept mapping
- Brainstorming
- Knowledge organization
- Topic hierarchies
- Idea relationships
- Subject breakdowns

**Use \`timeline\` for chronological sequences:**
- Historical events
- Project phases
- Milestones over time
- Sequential events
- Development stages
- Time-based progressions

**Use \`journey\` for user experiences:**
- User journeys
- Process experiences
- Step-by-step experiences with actors
- Workflow experiences
- Customer journeys
- Task sequences with participants

### 📋 Flowchart Rules (for process flows)

**Syntax:**
\`\`\`mermaid
flowchart TD
    Start([Start]) --> Step1[Step 1: Action]
    Step1 --> Decision{Decision Point}
    Decision -->|Yes| Step2[Step 2: Action A]
    Decision -->|No| Step3[Step 3: Action B]
    Step2 --> End([End])
    Step3 --> End
\`\`\`

**Requirements:**
- Use \`flowchart TD\` (top-down) or \`flowchart LR\` (left-right)
- Use \`([Start])\` and \`([End])\` for start/end nodes (rounded rectangles)
- Use \`{Decision}\` for decision points (diamonds)
- Use \`[Action]\` for process steps (rectangles)
- Label edges/arrows clearly when needed: \`Node1 -->|Label| Node2\`
- Keep labels concise and descriptive
- Each statement MUST be on its own line with proper spacing
- Include all decision points, branches, and alternative flows
- Show complete workflows, not just happy paths
- Use descriptive node labels

### 📋 StateDiagram-v2 Rules (for state changes)

**Syntax:**
\`\`\`mermaid
stateDiagram-v2
    [*] --> Initial_State
    Initial_State --> Processing_State
    Processing_State --> Decision_Point
    Decision_Point --> Final_State : Success
    Decision_Point --> Error_State : Failure
    Final_State --> [*]
    Error_State --> [*]
\`\`\`

**Note**: If you need transition labels, use \`State1 --> State2 : Label\` syntax, NOT \`State1 -->|Label| State2\`

**CRITICAL REQUIREMENTS:**

1. **Start and End States:**
   - **ALWAYS use \`[*]\` for start and end states**
   - **NEVER use custom labels like "Start", "End", "Begin", or "Finish"**
   - Example: \`[*] --> Initial_State\` (correct)
   - Example: \`Start --> Initial_State\` (WRONG)

2. **Node Names:**
   - **NEVER use spaces in node names** - use underscores instead
   - Example: \`Check_Stop_Code\` (correct)
   - Example: \`Check Stop Code\` (WRONG - will cause errors)
   - Example: \`CheckStopCode\` (acceptable but underscores preferred)
   - All node names must be single words or use underscores to separate words
   - Keep node names short and descriptive

3. **Transitions:**
   - **NEVER use \`|Label|\` syntax in stateDiagram-v2** (this is for flowcharts only)
   - **If you need labels, use the colon syntax**: \`State1 --> State2 : Label\`
   - Simple transitions without labels: \`State1 --> State2\` (correct)
   - Labeled transitions: \`State1 --> State2 : Label\` (correct)
   - **WRONG**: \`State1 -->|Label| State2\` (this syntax causes parse errors in stateDiagram-v2)
   - **WRONG**: \`State1 -->|Label| State2\` (use \`State1 --> State2 : Label\` instead)
   - If you don't need labels, use simple transitions: \`State1 --> State2\`

4. **No Parentheses:**
   - **DO NOT include parentheses inside the diagram**
   - Do not use parentheses in node names or transitions
   - Example: \`Check_Stop_Code\` (correct)
   - Example: \`Check(Stop)Code\` (WRONG)

5. **Structure:**
   - Model decision points, not just steps
   - Reflect real-world branching behavior
   - Keep it minimal and readable
   - Use branching decisions
   - Include escalation and stop conditions

### 📋 Mindmap Rules (for hierarchical information)

**Syntax:**
\`\`\`mermaid
mindmap
  Root_Subject
    Branch1
      Leaf1
      Leaf2
    Branch2
      Leaf3
        SubLeaf1
\`\`\`

**Requirements:**
- Start with a root node (main subject)
- Use indentation to show hierarchy (2 spaces per level)
- Keep node names concise and descriptive
- Use underscores for multi-word nodes if needed
- Each level should be indented consistently
- Show relationships through hierarchy structure
- Each branch/leaf must be on its own line

### 📋 Timeline Rules (for chronological sequences)

**Syntax:**
\`\`\`mermaid
timeline
    title Timeline Title
    Phase 1 : Event 1
    Phase 2 : Event 2
             : Event 3
    Phase 3 : Event 4
\`\`\`

**Requirements:**
- Always include a title using \`title Timeline Title\`
- Use phases or time periods as main sections
- Multiple events can share the same phase (indent with spaces to align with the colon)
- Use colons (\`:\`) to separate phase from event
- Keep phase and event names concise
- Show chronological progression from top to bottom
- Each phase/event must be on its own line

### 📋 Journey Rules (for user experiences)

**Syntax:**
\`\`\`mermaid
journey
    title Journey Title
    section Section Name
      Action 1: 5: Actor1
      Action 2: 3: Actor1, Actor2
    section Next Section
      Action 3: 4: Actor2
\`\`\`

**Requirements:**
- Always include a title using \`title Journey Title\`
- Use \`section\` to group related actions
- Format: \`Action Name: Score: Actor1, Actor2\`
- Score is typically 1-5 (satisfaction, importance, effort, etc.)
- Multiple actors can be listed (comma-separated)
- Each action must be on its own line
- Use descriptive action names
- Show progression through sections
- Indent actions under their section (2 spaces)

### ✅ General Mermaid Requirements

**Formatting:**
- Each statement MUST be on its own line with proper spacing
- Use proper indentation for readability
- Include all decision points, branches, and alternative flows
- Show complete workflows, not just happy paths
- Use descriptive node/state labels

**Completeness:**
- Create complete, comprehensive diagrams
- Include all decision points, branches, loops, and end states
- Show all alternative paths, not just the happy path
- Include error handling and edge cases when relevant

**Code Block Format:**
- Always wrap Mermaid diagrams in code blocks with \`mermaid\` language identifier
- Format: \`\`\`mermaid followed by diagram code, then \`\`\`
- Ensure proper closing of code blocks

### 🚫 Common Mistakes to Avoid

- ❌ Using spaces in stateDiagram-v2 node names (use underscores)
- ❌ Using custom labels for start/end states instead of \`[*]\`
- ❌ Using \`|Label|\` syntax in stateDiagram-v2 (use \`State1 --> State2 : Label\` instead, or \`State1 --> State2\` without labels)
- ❌ Using parentheses in node names or diagrams
- ❌ Using \`stateDiagram-v2\` for process flows (use \`flowchart\` instead)
- ❌ Using \`flowchart\` for state machines (use \`stateDiagram-v2\` instead)
- ❌ Using wrong diagram type for the use case (choose flowchart, stateDiagram-v2, mindmap, timeline, or journey based on content)
- ❌ Incomplete diagrams (missing paths or decision points)
- ❌ Only showing happy paths without alternatives
- ❌ Not properly closing code blocks
- ❌ Mixing flowchart and stateDiagram syntax incorrectly

### 📝 Examples

**Correct Flowchart (process flow):**
\`\`\`mermaid
flowchart TD
    Start([Start]) --> Validate{Valid Input?}
    Validate -->|Yes| Process[Process Data]
    Validate -->|No| Error[Show Error]
    Process --> End([End])
    Error --> End
\`\`\`

**Correct StateDiagram-v2 (state changes):**
\`\`\`mermaid
stateDiagram-v2
    [*] --> Initial_State
    Initial_State --> Processing_State
    Processing_State --> Validation_State
    Validation_State --> Success_State : Valid
    Validation_State --> Error_State : Invalid
    Success_State --> [*]
    Error_State --> [*]
\`\`\`

**Note**: Use \`State1 --> State2 : Label\` for labeled transitions, NOT \`State1 -->|Label| State2\`

**Correct Mindmap (hierarchical information):**
\`\`\`mermaid
mindmap
  Subject
    Origins
      Long_history
      Popularisation
        British_author
    Research
      Effectiveness
      Automatic_creation
        Uses
          Creative_techniques
          Strategic_planning
\`\`\`

**Correct Timeline (chronological sequences):**
\`\`\`mermaid
timeline
    title History of Social Media Platform
    Phase 1 : LinkedIn
    Phase 2 : Facebook
             : Google
    Phase 3 : YouTube
    Phase 4 : Twitter
\`\`\`

**Correct Journey (user experiences):**
\`\`\`mermaid
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
\`\`\`

**Incorrect Examples:**
- \`Start --> State\` (should use \`[*] --> State\`)
- \`Check Stop Code\` (should use \`Check_Stop_Code\`)
- \`State1 -->|Label| State2\` (WRONG - use \`State1 --> State2 : Label\` for labeled transitions, or \`State1 --> State2\` without labels)
- \`State(With)Parentheses\` (should use \`State_With_Parentheses\`)

---

**Remember**: Choose the right diagram type based on your content:
- **flowchart** for process flows and workflows
- **stateDiagram-v2** for state changes and state machines
- **mindmap** for hierarchical information and concept mapping
- **timeline** for chronological sequences and historical events
- **journey** for user experiences and step-by-step experiences with actors

Follow syntax rules strictly, and create complete, comprehensive diagrams that show all paths and decision points.`;

/**
 * Load AI models from API route with caching
 * Performance: Cache models to avoid repeated API calls
 * Works on both client and server side
 */
async function loadAiModels(): Promise<any[]> {
  const now = Date.now();
  
  // Return cached models if still valid
  if (cachedModels !== null && (now - modelsCacheTime) < MODELS_CACHE_TTL) {
    return cachedModels;
  }

  try {
    // Determine API base URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const apiUrl = `${baseUrl}/api/ai-models`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for client-side requests
      cache: 'default',
    });

    if (!response.ok) {
      loggingCustom(LogType.INFRA_LOG, 'warn', `Failed to load AI models: ${response.status} ${response.statusText}`);
      cachedModels = [];
      modelsCacheTime = now;
      return cachedModels;
    }

    const result = await response.json();
    
    if (!result.success || !Array.isArray(result.data)) {
      loggingCustom(LogType.INFRA_LOG, 'warn', 'Invalid AI models API response format');
      cachedModels = [];
      modelsCacheTime = now;
      return cachedModels;
    }
    
    const models = result.data || [];
    cachedModels = models;
    modelsCacheTime = now;
    return models;
  } catch (error) {
    loggingCustom(LogType.INFRA_LOG, 'error', `Error loading AI models from API: ${error instanceof Error ? error.message : String(error)}`);
    cachedModels = [];
    modelsCacheTime = now;
    return cachedModels;
  }
}

/**
 * Calculate pricing for token usage
 */
async function calculatePricing(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): Promise<{
  inputPricePer1M: number;
  outputPricePer1M: number;
  inputPrice: number;
  outputPrice: number;
  totalPrice: number;
} | null> {
  const models = await loadAiModels();
  const model = models.find((m: any) => m.id === modelId);

  if (!model || !model.pricing) {
    return null;
  }

  const inputPricePerMillion = model.pricing.input || 0;
  const outputPricePerMillion = model.pricing.output || 0;

  // Calculate prices (pricing is per 1 million tokens)
  const inputPrice = (promptTokens / 1_000_000) * inputPricePerMillion;
  const outputPrice = (completionTokens / 1_000_000) * outputPricePerMillion;
  const totalPrice = inputPrice + outputPrice;

  return {
    inputPricePer1M: inputPricePerMillion,
    outputPricePer1M: outputPricePerMillion,
    inputPrice,
    outputPrice,
    totalPrice,
  };
}

/**
 * Process chat request
 */
export async function processChatRequest(
  agent: any,
  requestData: AgentRequestData,
  baseUrl?: string
): Promise<AgentResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Validate form fields if renderComponents exist
    if (agent.renderComponents && requestData.formValues) {
      const validationErrors = validateAgentFormFields(agent, requestData.formValues);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors,
        };
      }
    }

    // Build user prompt from form values or use provided userPrompt
    let userPrompt = requestData.userPrompt || '';
    
    if (requestData.formValues && agent.renderComponents) {
      const builtPrompt = buildStandardizedPrompt(agent, requestData.formValues);
      if (builtPrompt) {
        userPrompt = builtPrompt;
      }
    }

    // Security: Sanitize and validate prompt
    if (!userPrompt || typeof userPrompt !== 'string') {
      return {
        success: false,
        error: 'userPrompt is required and must be a string',
      };
    }

    userPrompt = sanitizePrompt(userPrompt);
    if (!userPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Extract bodyParams from requestData if available (for direct API calls)
    const bodyParams = requestData.body || {};
    
    // Append option descriptions to userPrompt when bodyParams contain option values
    // This ensures option descriptions are in the userPrompt (like AiBuilderForm does)
    // not just in the system prompt
    if (bodyParams && Object.keys(bodyParams).length > 0 && agent.renderComponents) {
      const optionDescriptionsParts: string[] = [];
      
      agent.renderComponents.forEach((field: any) => {
        const fieldName = field.name || field.id;
        const fieldValue = bodyParams[fieldName];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // For select fields, find the option and append its description
          if (field.component === 'select' && field.options) {
            const option = field.options.find(
              (opt: any) => opt.id === fieldValue || opt.value === fieldValue
            );
            
            if (option?.description) {
              const fieldLabel = field.label || fieldName;
              optionDescriptionsParts.push(`${fieldLabel} (${option.label || fieldValue}):\n${option.description}`);
            }
          }
        }
      });
      
      // Append option descriptions to userPrompt if any were found
      if (optionDescriptionsParts.length > 0) {
        userPrompt = `${userPrompt}\n\n${optionDescriptionsParts.join('\n\n')}`;
      }
    }
    
    // Build system prompt using centralized utility (handles preload routes internally)
    const { systemPrompt } = await buildSystemPrompt({
      agent,
      formValues: requestData.formValues,
      bodyParams,
      baseUrl,
    });

    // Format annotations in TOON-like format and add to user prompt
    let finalUserPrompt = userPrompt;
    if (
      requestData.annotations &&
      Array.isArray(requestData.annotations) &&
      requestData.annotations.length > 0 &&
      requestData.previousAiResponse
    ) {
      // Format annotations in TOON-like structure
      const annotationSections = requestData.annotations.map((ann) => {
        const changes = ann.annotations.map((a) => `- ${a.label}`).join('\n');
        return `${ann.schemaName}\n\n${changes}`;
      }).join('\n\n');

      // Build the modification request in user prompt
      const modificationRequest = `\n\n---\n\n## MODIFY EXISTING SCHEMA(S)\n\nPlease update the following schema(s) based on the requested modifications. Apply ONLY the specified changes while keeping everything else exactly the same.\n\nRequested Modifications:\n\n${annotationSections}\n\nPrevious Schema(s):\n\`\`\`json\n${requestData.previousAiResponse}\n\`\`\`\n\n---\n\nIMPORTANT: You are the world's best schema editor. Apply these modifications precisely while preserving all other aspects of the schema(s). Output the complete updated schema(s) in the same format (single object or array).`;

      finalUserPrompt = userPrompt + modificationRequest;
    }

    // Get model from agent config or use default
    const model = agent.model || 'gpt-4o-mini';

    // Call chat API using centralized utility
    const apiResult = await callChatApi({
      agent,
      systemPrompt,
      userPrompt: finalUserPrompt,
      model,
      responseFormat: (agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card')
        ? { type: 'json_object' }
        : undefined,
    });

    if (!apiResult.success) {
      return {
        success: false,
        error: apiResult.error || 'API call failed',
      };
    }

    // Calculate pricing for token usage
    const pricing = await calculatePricing(
      model,
      apiResult.tokenUsage?.prompt_tokens || 0,
      apiResult.tokenUsage?.completion_tokens || 0
    );

    const tokenUsage = apiResult.tokenUsage
      ? {
          ...apiResult.tokenUsage,
          pricing: pricing
            ? {
                input_price_per_1m: pricing.inputPricePer1M || 0,
                output_price_per_1m: pricing.outputPricePer1M || 0,
                input_cost: pricing.inputPrice,
                output_cost: pricing.outputPrice,
                total_cost: pricing.totalPrice,
                model_id: model,
              }
            : null,
        }
      : null;

    return {
      success: true,
      data: {
        response: apiResult.data,
        format: (agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card') ? 'json' : agent.requiredOutputFormat || 'string',
        tokenUsage,
        timing: apiResult.timing,
        agent: {
          id: agent.id,
          label: agent.label,
          description: agent.description,
          requiredOutputFormat: agent.requiredOutputFormat,
          nextAction: agent.nextAction,
        },
      },
    };
  } catch (error) {
    if (isDevelopment) {
      loggingCustom(LogType.INFRA_LOG, 'error', `Error in AI chat request: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}


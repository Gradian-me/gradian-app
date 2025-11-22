# AI Builder Architecture Documentation

## Overview

The AI Builder is a comprehensive system that enables users to generate structured content (like JSON schemas) using Large Language Models (LLMs). It provides an intuitive interface for creating prompts, managing AI agents, tracking usage, and reviewing history.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[AI Builder Page] --> B[useAiBuilder Hook]
        A --> C[ResponseCardViewer]
        A --> D[ResponseAnnotationViewer]
        A --> E[FormModal Preview]
        F[AI Prompts Page] --> G[useAiPrompts Hook]
        F --> H[AiPromptHistory Component]
    end

    subgraph "Domain Layer"
        B --> I[useAiAgents Hook]
        B --> J[useAiPrompts Hook]
        I --> K[ai-agents.json]
        J --> L[ai-prompts.json]
    end

    subgraph "API Layer"
        B --> M[/api/ai-builder]
        G --> N[/api/ai-prompts]
        I --> O[/api/ai-agents]
        M --> P[LLM API Service]
    end

    subgraph "External Services"
        P --> Q[OpenAI API]
        P --> R[OpenRouter API]
        P --> S[AvalAI API]
        P --> T[Other LLM Providers]
    end

    subgraph "Data Layer"
        K --> U[File System]
        L --> U
        V[application-variables.json] --> U
    end

    style A fill:#e1f5ff
    style F fill:#e1f5ff
    style M fill:#fff4e6
    style P fill:#ffe6e6
    style Q fill:#e6ffe6
    style R fill:#e6ffe6
    style S fill:#e6ffe6
```

## Component Flow

```mermaid
sequenceDiagram
    participant User
    participant AIBuilderPage
    participant useAiBuilder
    participant API
    participant LLM
    participant useAiPrompts
    participant Storage

    User->>AIBuilderPage: Enter prompt & select agent
    AIBuilderPage->>useAiBuilder: generateResponse()
    useAiBuilder->>API: POST /api/ai-builder
    API->>API: Load agent config
    API->>API: Preload routes (if configured)
    API->>API: Build system prompt
    API->>LLM: POST /chat/completions
    LLM-->>API: Response + token usage
    API->>API: Extract JSON (if needed)
    API->>API: Calculate pricing
    API-->>useAiBuilder: Response data
    useAiBuilder->>useAiPrompts: createPrompt()
    useAiPrompts->>Storage: Save to ai-prompts.json
    useAiBuilder-->>AIBuilderPage: Update state
    AIBuilderPage->>User: Display response cards
    User->>AIBuilderPage: Click card
    AIBuilderPage->>AIBuilderPage: Open FormModal preview
    User->>AIBuilderPage: Add annotations
    AIBuilderPage->>User: Show ResponseAnnotationViewer
```

## Data Flow

```mermaid
flowchart LR
    A[User Input] --> B[Agent Selection]
    B --> C[System Prompt + Preload Context]
    C --> D[LLM Request]
    D --> E[LLM Response]
    E --> F[JSON Extraction]
    F --> G[Response Cards]
    G --> H[Form Preview]
    H --> I[Annotations]
    I --> J[Apply Annotations]
    
    E --> K[Token Usage]
    K --> L[Pricing Calculation]
    L --> M[Prompt History]
    
    style A fill:#e1f5ff
    style D fill:#ffe6e6
    style E fill:#e6ffe6
    style G fill:#fff4e6
    style M fill:#f0e6ff
```

## AI Agent Configuration

```mermaid
graph TB
    A[ai-agents.json] --> B[Agent Definition]
    B --> C[System Prompt]
    B --> D[Preload Routes]
    B --> E[Response Cards Config]
    B --> F[Next Action]
    
    C --> G[Base Instructions]
    C --> H[Dynamic Context]
    
    D --> I[API Routes]
    D --> J[Query Parameters]
    D --> K[JSON Path Extraction]
    
    E --> L[Card ID Path]
    E --> M[Card Label Path]
    E --> N[Card Icon Path]
    E --> O[Schema Path]
    
    F --> P[Action Label]
    F --> Q[Action Icon]
    F --> R[Action Route]
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style D fill:#ffe6e6
    style E fill:#e6ffe6
```

## LLM Integration Architecture

```mermaid
graph TB
    subgraph "Request Preparation"
        A[User Prompt] --> B[Agent Selection]
        B --> C[Load Agent Config]
        C --> D[Preload Routes]
        D --> E[Build System Prompt]
        E --> F[Combine with User Prompt]
    end

    subgraph "LLM API Call"
        F --> G[Select Model]
        G --> H[Get API URL]
        H --> I[Get API Key]
        I --> J[POST to LLM API]
        J --> K[Wait for Response]
    end

    subgraph "Response Processing"
        K --> L[Extract Content]
        L --> M{Output Format?}
        M -->|JSON| N[Extract JSON]
        M -->|String| O[Use Raw Response]
        N --> P[Calculate Token Usage]
        O --> P
        P --> Q[Calculate Pricing]
        Q --> R[Return Response]
    end

    style A fill:#e1f5ff
    style J fill:#ffe6e6
    style K fill:#e6ffe6
    style R fill:#fff4e6
```

## Response Cards & Annotations Flow

```mermaid
sequenceDiagram
    participant User
    participant ResponseCardViewer
    participant FormModal
    participant ListInput
    participant ResponseAnnotationViewer

    User->>ResponseCardViewer: View generated schemas
    ResponseCardViewer->>ResponseCardViewer: Parse JSON response
    ResponseCardViewer->>ResponseCardViewer: Extract cards using JSON paths
    ResponseCardViewer->>User: Display clickable cards
    
    User->>ResponseCardViewer: Click card
    ResponseCardViewer->>FormModal: Open preview with schema
    FormModal->>FormModal: Render form (read-only)
    FormModal->>ListInput: Display annotation input
    User->>ListInput: Add/edit annotations
    ListInput->>FormModal: Update annotations state
    FormModal->>User: Close modal
    
    User->>ResponseAnnotationViewer: View all annotations
    ResponseAnnotationViewer->>ResponseAnnotationViewer: Show ListInput per schema
    User->>ResponseAnnotationViewer: Edit/remove annotations
    User->>ResponseAnnotationViewer: Click Apply button
    ResponseAnnotationViewer->>ResponseAnnotationViewer: Open summary dialog
    ResponseAnnotationViewer->>User: Show all annotations
```

## File Structure

```
src/
├── domains/
│   ├── ai-builder/
│   │   ├── components/
│   │   │   ├── AiBuilderForm.tsx          # Main form component
│   │   │   ├── AiBuilderResponse.tsx      # Response display
│   │   │   ├── ResponseCardViewer.tsx     # Schema cards
│   │   │   ├── ResponseAnnotationViewer.tsx # Annotations manager
│   │   │   ├── MessageDisplay.tsx         # Error/success messages
│   │   │   └── PromptPreviewSheet.tsx     # Prompt preview
│   │   ├── hooks/
│   │   │   ├── useAiBuilder.ts            # Main builder hook
│   │   │   └── useAiAgents.ts             # Agent management
│   │   └── types/
│   │       └── index.ts                   # TypeScript types
│   └── ai-prompts/
│       ├── components/
│       │   └── AiPromptHistory.tsx        # History viewer
│       └── hooks/
│           └── useAiPrompts.ts            # Prompts management
├── app/
│   ├── ai-builder/
│   │   └── page.tsx                      # Main builder page
│   ├── ai-prompts/
│   │   └── page.tsx                      # Prompts history page
│   └── api/
│       ├── ai-builder/
│       │   └── route.ts                  # LLM API endpoint
│       └── ai-prompts/
│           └── route.ts                  # Prompts CRUD API
└── data/
    ├── ai-agents.json                    # Agent configurations
    ├── ai-prompts.json                   # Prompt history
    └── application-variables.json        # App config (LLM API URL)
```

## Key Components

### 1. AI Builder Page (`/ai-builder`)

The main interface where users interact with AI agents to generate content.

**Features:**
- Agent selection dropdown
- Prompt input with auto-resize
- System prompt preview
- Response cards for generated schemas
- Form preview modal with annotations
- Annotation management
- Token usage and pricing display
- Approve/Submit actions

**Components:**
- `AiBuilderForm`: Input form with agent selection
- `AiBuilderResponse`: Displays AI response with cards and code viewer
- `ResponseCardViewer`: Shows clickable cards for each generated schema
- `ResponseAnnotationViewer`: Manages annotations across all schemas
- `FormModal`: Preview modal with form and annotation section

### 2. AI Prompts Page (`/ai-prompts`)

A comprehensive history viewer for all AI prompts and responses.

**Features:**
- **Search & Filter:**
  - Search by prompt text or response content
  - Filter by AI agent
  - Filter by user
  - Date range filtering
  - Real-time search updates

- **Display:**
  - Expandable prompt cards
  - Code viewer for responses
  - Token usage metrics
  - Pricing information
  - Response time tracking
  - Copy to clipboard functionality

- **Metrics:**
  - Total tokens used
  - Total cost
  - Average response time
  - Token breakdown (input/output)
  - Cost breakdown

- **User Experience:**
  - Expandable/collapsible cards
  - Responsive design
  - Loading states
  - Error handling
  - Empty states

**Components:**
- `AiPromptHistory`: Main history component with filters
- `MetricCard`: Displays usage statistics
- `CodeViewer`: Syntax-highlighted code display

## API Endpoints

### POST `/api/ai-builder`

Generates AI responses using configured LLM providers.

**Request:**
```json
{
  "userPrompt": "Create a project management schema",
  "agentId": "app-builder"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "{...}",
    "format": "json",
    "tokenUsage": {
      "prompt_tokens": 150,
      "completion_tokens": 500,
      "total_tokens": 650,
      "pricing": {
        "input_cost": 0.0001,
        "output_cost": 0.0005,
        "total_cost": 0.0006,
        "model_id": "gpt-4o-mini"
      }
    },
    "timing": {
      "responseTime": 1200,
      "duration": 1500
    }
  }
}
```

**Process:**
1. Load agent configuration from `ai-agents.json`
2. Preload routes if configured (fetch external data)
3. Build system prompt with preloaded context
4. Call LLM API (OpenAI/OpenRouter/AvalAI)
5. Extract and process response
6. Calculate token usage and pricing
7. Return formatted response

### GET `/api/ai-prompts`

Retrieves prompt history with optional filters.

**Query Parameters:**
- `username`: Filter by user
- `aiAgent`: Filter by agent ID
- `startDate`: Start date filter
- `endDate`: End date filter
- `search`: Search query

### POST `/api/ai-prompts`

Saves a new prompt to history.

**Request:**
```json
{
  "username": "user@example.com",
  "aiAgent": "app-builder",
  "userPrompt": "Create a schema...",
  "agentResponse": "{...}",
  "inputTokens": 150,
  "outputTokens": 500,
  "totalTokens": 650,
  "inputPrice": 0.0001,
  "outputPrice": 0.0005,
  "totalPrice": 0.0006
}
```

## Agent Configuration

Agents are defined in `data/ai-agents.json`:

```json
{
  "id": "app-builder",
  "label": "App Builder",
  "icon": "Sparkles",
  "description": "Generates complete app builder schemas",
  "requiredOutputFormat": "json",
  "model": "gpt-4o-mini",
  "systemPrompt": "Act as an experienced product manager...",
  "preloadRoutes": [
    {
      "route": "/api/schemas",
      "title": "Existing Schemas",
      "method": "GET",
      "jsonPath": "data",
      "queryParameters": {
        "summary": "true"
      }
    }
  ],
  "responseCards": [
    {
      "idPath": "$.id",
      "labelPath": "$.singular_name",
      "iconPath": "$.icon",
      "actionType": "openFormModal",
      "schemaPath": "$"
    }
  ],
  "nextAction": {
    "label": "Approve Response",
    "icon": "CheckCircle2",
    "route": "/api/schemas"
  }
}
```

## Preload Routes

Preload routes allow agents to fetch context data before generating responses:

1. **Route Configuration:**
   - `route`: API endpoint path
   - `method`: HTTP method (GET/POST)
   - `queryParameters`: Query string parameters
   - `body`: Request body (for POST)
   - `jsonPath`: JSON path to extract data

2. **Process:**
   - Routes are fetched in parallel
   - Data is extracted using JSON paths
   - Formatted into system prompt context
   - Included in LLM request

## Response Cards

Response cards enable users to preview generated schemas:

1. **Configuration:**
   - JSON paths to extract card data
   - Support for single objects and arrays
   - Icon and label extraction

2. **Features:**
   - Click to preview in form modal
   - Visual card display with icons
   - Handles multiple schemas in array responses

## Annotations System

Annotations allow users to add notes to generated schemas:

1. **Components:**
   - `ListInput`: Drag-and-drop annotation list
   - Inline editing and deletion
   - Reordering support

2. **Flow:**
   - Add annotations in preview modal
   - Manage all annotations in `ResponseAnnotationViewer`
   - Apply button shows summary dialog

## Token Usage & Pricing

The system tracks and calculates:

1. **Token Metrics:**
   - Input tokens (prompt)
   - Output tokens (completion)
   - Total tokens

2. **Pricing:**
   - Model-specific pricing from `ai-models.json`
   - Cost per million tokens (input/output)
   - Total cost calculation
   - Real-time cost display

3. **Display:**
   - `MetricCard` component
   - Token breakdown
   - Cost breakdown
   - Model information

## Error Handling

```mermaid
graph TB
    A[User Action] --> B{Validation}
    B -->|Invalid| C[Show Error Message]
    B -->|Valid| D[API Call]
    D --> E{API Response}
    E -->|Error| F[Handle API Error]
    E -->|Success| G[Process Response]
    G --> H{JSON Valid?}
    H -->|Invalid| I[Show JSON Error]
    H -->|Valid| J[Display Response]
    
    F --> C
    I --> C
    
    style C fill:#ffe6e6
    style F fill:#ffe6e6
    style I fill:#ffe6e6
    style J fill:#e6ffe6
```

## State Management

```mermaid
graph TB
    A[useAiBuilder Hook] --> B[User Prompt State]
    A --> C[AI Response State]
    A --> D[Token Usage State]
    A --> E[Loading State]
    A --> F[Error State]
    A --> G[Preload Context State]
    
    H[AI Builder Page] --> I[Preview Schema State]
    H --> J[Annotations State]
    
    K[useAiPrompts Hook] --> L[Prompts List State]
    K --> M[Filters State]
    K --> N[Loading State]
    
    style A fill:#e1f5ff
    style H fill:#fff4e6
    style K fill:#e6ffe6
```

## Security Considerations

1. **API Keys:**
   - Stored in environment variables
   - Never exposed to client
   - Server-side only access

2. **Input Validation:**
   - Prompt length limits
   - JSON validation
   - Agent ID validation

3. **Error Handling:**
   - Graceful error messages
   - No sensitive data exposure
   - Request cancellation support

## Performance Optimizations

1. **Preload Routes:**
   - Parallel fetching
   - Caching where possible
   - Error tolerance

2. **Response Processing:**
   - Async JSON extraction
   - Efficient token calculation
   - Minimal re-renders

3. **UI Optimizations:**
   - Lazy loading
   - Memoization
   - Debounced search

## Future Enhancements

1. **Streaming Responses:**
   - Real-time token streaming
   - Progressive rendering

2. **Advanced Annotations:**
   - Rich text annotations
   - Annotation templates
   - Export annotations

3. **Agent Marketplace:**
   - Shareable agent configs
   - Community agents
   - Agent versioning

4. **Analytics:**
   - Usage dashboards
   - Cost tracking
   - Performance metrics

## Related Documentation

- [Schema Builder Architecture](../../schema/SCHEMA_BUILDER_UPDATES.md)
- [Dynamic CRUD Architecture](../../architecture/DYNAMIC_CRUD_ARCHITECTURE.md)
- [Form Builder Documentation](../../gradian-ui/form-builder/docs/README.md)


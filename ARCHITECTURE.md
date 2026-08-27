# EngageAI — Architecture Documentation

## System Architecture

### High-Level Overview

```mermaid
graph TB
    subgraph External["External Sources"]
        E1["Email Inbox"]
        E2["Widget Embed"]
        E3["REST API"]
        E4["CSV Upload"]
        E5["Webhook"]
    end

    subgraph Gateway["API Gateway Layer"]
        GW["FastAPI + Uvicorn"]
        RL["Rate Limiter<br/>(slowapi + Redis)"]
        AUTH["JWT Auth<br/>+ RBAC"]
        VAL["Pydantic v2<br/>Validation"]
    end

    subgraph Processing["Processing Pipeline"]
        direction TB
        ING["Ingestion Service"]
        AI_PIPE["AI Pipeline"]
        EMB_PIPE["Embedding Pipeline"]
    end

    subgraph AIServices["AI/ML Services"]
        S1["Sentiment<br/>VADER"]
        S2["Classification<br/>TF-IDF + LR"]
        S3["Topic Detection<br/>LDA"]
        S4["Summarization<br/>LLM/Extractive"]
        S5["Priority Engine<br/>Weighted Hybrid"]
        S6["Duplicate Detection<br/>Cosine Similarity"]
        S7["Clustering<br/>HDBSCAN"]
        S8["Trend Analysis<br/>Z-Score/EWMA"]
        S9["Feature Extraction<br/>LLM/Regex"]
        S10["Insights<br/>LLM/Template"]
        S11["NL Query<br/>LLM/Keyword"]
    end

    subgraph DataStores["Data Stores"]
        PG[("PostgreSQL<br/>Structured Data")]
        CV[("ChromaDB<br/>Vector Store")]
        RD[("Redis<br/>Cache + Pub/Sub")]
    end

    subgraph AgentEngine["Agentic Engine (Celery Workers)"]
        ORCH["Orchestrator"]
        A1["Monitor Agent"]
        A2["Anomaly Agent"]
        A3["Priority Agent"]
        A4["Workflow Agent"]
        A5["Ticketing Agent"]
        A6["Notification Agent"]
        A7["Root Cause Agent"]
    end

    subgraph Integrations["External Integrations"]
        JIRA["Jira API"]
        LIN["Linear API"]
        SLK["Slack API"]
        SMTP_OUT["SMTP Email"]
    end

    subgraph RealTime["Real-Time Delivery"]
        WS["WebSocket Server"]
        SSE["SSE Endpoint"]
    end

    subgraph Frontend["React Dashboard"]
        DASH["Dashboard"]
        FE["Feedback Explorer"]
        AN["Analytics"]
        AC["Agent Control"]
    end

    External --> Gateway
    Gateway --> Processing
    Processing --> AIServices
    AIServices <--> CV
    Processing --> PG
    PG <--> AgentEngine
    RD <--> AgentEngine
    AgentEngine --> Integrations
    AgentEngine --> RealTime
    RealTime --> Frontend
```

---

## Data Flow: Feedback Ingestion Pipeline

```mermaid
sequenceDiagram
    participant Source as Feedback Source
    participant API as FastAPI Router
    participant Val as Pydantic Validator
    participant Svc as Feedback Service
    participant Sent as Sentiment Analyzer
    participant Class as Classifier
    participant Emb as Embedding Service
    participant Chroma as ChromaDB
    participant Dup as Duplicate Detector
    participant Prio as Priority Engine
    participant PG as PostgreSQL
    participant Bus as Redis Event Bus
    participant Agents as Agent Orchestrator

    Source->>API: POST /api/v1/feedback
    API->>Val: Validate request body
    Val->>Svc: Create feedback
    
    par AI Analysis (parallel)
        Svc->>Sent: analyze_sentiment(text)
        Sent-->>Svc: {polarity, confidence}
        Svc->>Class: classify(text)
        Class-->>Svc: {category, confidence}
        Svc->>Emb: generate_embedding(text)
        Emb-->>Svc: vector[384]
    end

    Svc->>Chroma: upsert(embedding, metadata)
    Chroma-->>Svc: embedding_id
    
    Svc->>Dup: check_duplicates(embedding)
    Dup->>Chroma: query(embedding, threshold=0.92)
    Chroma-->>Dup: similar_items
    Dup-->>Svc: {is_duplicate, similar_ids}
    
    Svc->>Prio: calculate_priority(sentiment, category, tier, text)
    Prio-->>Svc: {priority, reasoning}
    
    Svc->>PG: INSERT feedback record
    PG-->>Svc: feedback_id
    
    Svc->>Bus: PUBLISH feedback.new {feedback_id}
    Bus->>Agents: Event: feedback.new
    
    Agents->>Agents: Orchestrate agent chain
```

---

## Agent Orchestration Flow

```mermaid
stateDiagram-v2
    [*] --> MonitorAgent: Periodic Poll / Webhook

    MonitorAgent --> AnomalyAgent: New feedback batch
    AnomalyAgent --> PriorityAgent: Anomaly detected
    AnomalyAgent --> PriorityAgent: No anomaly (continue)
    
    PriorityAgent --> WorkflowAgent: Priority assigned
    
    WorkflowAgent --> TicketingAgent: Workflow: create_ticket
    WorkflowAgent --> NotificationAgent: Workflow: notify
    WorkflowAgent --> [*]: No matching workflow
    
    TicketingAgent --> NotificationAgent: Ticket created
    
    NotificationAgent --> [*]: Alert sent
    
    PriorityAgent --> RootCauseAgent: Priority = Very High
    RootCauseAgent --> NotificationAgent: Hypothesis generated
    
    state AnomalyAgent {
        [*] --> ComputeZScore
        ComputeZScore --> CheckThreshold
        CheckThreshold --> FlagAnomaly: Z > 2.5
        CheckThreshold --> Pass: Z <= 2.5
    }
    
    state PriorityAgent {
        [*] --> GatherSignals
        GatherSignals --> WeightedScore
        WeightedScore --> MapToTier
        MapToTier --> GenerateReasoning
    }
```

---

## Priority Classification Flow

```mermaid
flowchart TD
    INPUT["Feedback Input"] --> ANALYZE["Analyze Signals"]
    
    ANALYZE --> S1["Sentiment Score<br/>Weight: 0.30"]
    ANALYZE --> S2["Category Score<br/>Weight: 0.25"]
    ANALYZE --> S3["Customer Tier<br/>Weight: 0.25"]
    ANALYZE --> S4["Keyword Severity<br/>Weight: 0.20"]
    
    S1 & S2 & S3 & S4 --> COMPOSITE["Composite Score<br/>(Weighted Sum)"]
    
    COMPOSITE --> T1{"Score >= 0.85"}
    T1 -->|Yes| VH["🔴 Very High<br/>SLA: 1 hour"]
    T1 -->|No| T2{"Score >= 0.65"}
    T2 -->|Yes| H["🟠 High<br/>SLA: 4 hours"]
    T2 -->|No| T3{"Score >= 0.40"}
    T3 -->|Yes| L["🟡 Low<br/>SLA: 2 days"]
    T3 -->|No| N["🟢 Normal<br/>SLA: 5 days"]
    
    VH --> ROUTE_VH["Auto-ticket + On-call alert<br/>+ Escalate if unacked 30min"]
    H --> ROUTE_H["Auto-ticket + Team Slack<br/>+ Escalate at SLA breach"]
    L --> ROUTE_L["Backlog queue<br/>+ Weekly digest"]
    N --> ROUTE_N["Log + Analytics only"]
    
    ROUTE_VH & ROUTE_H & ROUTE_L & ROUTE_N --> STORE["Store Priority + Reasoning<br/>in PostgreSQL"]
```

---

## Database Schema (ER Diagram)

```mermaid
erDiagram
    USERS ||--o{ FEEDBACK : submits
    USERS }o--|| TEAMS : belongs_to
    TEAMS ||--o{ USERS : has_members
    
    FEEDBACK ||--o| TICKETS : generates
    FEEDBACK ||--o{ WORKFLOW_EXECUTIONS : triggers
    FEEDBACK }o--o{ FEEDBACK_CLUSTER_MEMBERS : grouped_in
    
    FEEDBACK_CLUSTERS ||--o{ FEEDBACK_CLUSTER_MEMBERS : contains
    
    WORKFLOWS ||--o{ WORKFLOW_EXECUTIONS : executes
    
    USERS {
        uuid id PK
        string email UK
        string hashed_password
        enum role "admin|manager|agent|viewer"
        uuid team_id FK
        timestamp created_at
    }
    
    TEAMS {
        uuid id PK
        string name
        jsonb notification_channels
    }
    
    FEEDBACK {
        uuid id PK
        enum source_channel
        text raw_text
        string customer_id
        enum customer_tier "free|pro|enterprise"
        float sentiment
        float sentiment_confidence
        enum category "bug|feature_request|complaint|praise|inquiry"
        enum priority "normal|low|high|very_high"
        text priority_reasoning
        enum status "new|triaged|in_progress|resolved|closed"
        string embedding_id
        timestamp created_at
        timestamp updated_at
    }
    
    FEEDBACK_CLUSTERS {
        uuid id PK
        string cluster_label
        text representative_summary
        int feedback_count
        timestamp created_at
    }
    
    FEEDBACK_CLUSTER_MEMBERS {
        uuid id PK
        uuid cluster_id FK
        uuid feedback_id FK
    }
    
    WORKFLOWS {
        uuid id PK
        jsonb trigger_condition
        enum action_type
        boolean is_active
    }
    
    WORKFLOW_EXECUTIONS {
        uuid id PK
        uuid workflow_id FK
        uuid feedback_id FK
        enum status
        timestamp executed_at
        jsonb result_payload
    }
    
    TICKETS {
        uuid id PK
        uuid feedback_id FK
        enum external_system "jira|linear"
        string external_ticket_id
        string url
        enum status
        boolean created_by_agent
    }
    
    NOTIFICATIONS {
        uuid id PK
        enum channel
        string recipient
        enum severity
        text message
        timestamp sent_at
        boolean acknowledged
    }
    
    ANALYTICS_SNAPSHOTS {
        uuid id PK
        enum metric_type
        timestamp time_bucket
        jsonb value
        timestamp computed_at
    }
    
    AUDIT_LOGS {
        uuid id PK
        string actor
        string action
        string entity_type
        uuid entity_id
        timestamp timestamp
    }
```

---

## Real-Time Communication

```mermaid
sequenceDiagram
    participant Client as React Frontend
    participant WS as WebSocket Server
    participant Redis as Redis Pub/Sub
    participant Agent as Agent Engine
    
    Client->>WS: Connect /ws/feedback-stream
    WS->>WS: Authenticate JWT
    WS->>Redis: SUBSCRIBE feedback.*
    
    Agent->>Redis: PUBLISH feedback.new
    Redis->>WS: Message: feedback.new
    WS->>Client: JSON: {type: "new_feedback", data: {...}}
    
    Agent->>Redis: PUBLISH feedback.priority_changed
    Redis->>WS: Message: feedback.priority_changed
    WS->>Client: JSON: {type: "priority_update", data: {...}}
    
    Note over Client: Zustand store updated<br/>Dashboard re-renders
```

---

## Deployment Architecture (Production)

```mermaid
graph TB
    subgraph Internet
        USERS["Users / Clients"]
    end
    
    subgraph LoadBalancer["Load Balancer"]
        NGINX["Nginx<br/>SSL Termination<br/>Reverse Proxy"]
    end
    
    subgraph AppServers["Application Servers"]
        API1["Uvicorn Worker 1"]
        API2["Uvicorn Worker 2"]
        API3["Uvicorn Worker N"]
    end
    
    subgraph Workers["Celery Workers"]
        W1["Worker 1"]
        W2["Worker 2"]
        W3["Worker N"]
    end
    
    subgraph DataLayer["Data Layer"]
        PG_PRIMARY["PostgreSQL Primary"]
        PG_REPLICA["PostgreSQL Replica(s)"]
        REDIS_CLUSTER["Redis Sentinel/Cluster"]
        CHROMA_CLUSTER["ChromaDB Cluster"]
    end
    
    subgraph CDN["Static Assets"]
        S3["S3 / CDN<br/>React Build"]
    end
    
    USERS --> NGINX
    NGINX --> AppServers
    NGINX --> CDN
    AppServers --> DataLayer
    Workers --> DataLayer
    PG_PRIMARY --> PG_REPLICA
```

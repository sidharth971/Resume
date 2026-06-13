const blogPosts = [
  {
    id: 1,
    title: "Building Agentic RAG Pipelines with LangChain and PGVector",
    date: "2026-06-10",
    tags: ["Python", "GenAI", "RAG", "PGVector"],
    excerpt: "How I architected production-grade retrieval pipelines with autonomous routing, tool calling, and PGVector embedding storage.",
    content: `
# Building Agentic RAG Pipelines with LangChain and PGVector

In the world of Retrieval-Augmented Generation (RAG), basic retrieve-then-read systems often fall short when dealing with complex, multi-step queries. Standard RAG retrieving chunks based purely on semantic similarity can fetch irrelevant information if the query is ambiguous. To solve this, we can implement **Agentic RAG**.

An Agentic RAG system treats retrieval as a tool within a larger reasoning loop (usually powered by an LLM). The agent decides whether to retrieve information, rewrite the query, look up web sources, or directly answer based on its state.

---

## 1. Architecture Overview

Here is the high-level architecture of our agentic pipeline:

1. **User Query Input**: The query is analyzed by an Agent routing node.
2. **Routing Decision**: The router determines if external knowledge is needed.
3. **Retrieval Tool**: If yes, it formats the query and executes a vector similarity search on **PGVector** with a HNSW (Hierarchical Navigable Small World) index.
4. **Re-ranking**: Results are re-ranked using a cross-encoder model to filter out low-relevance documents.
5. **Self-Correction (Evaluation)**: The agent checks if the retrieved documents are sufficient. If not, it rewrites the query and tries again.
6. **Final Synthesis**: The LLM synthesizes the answer and cites sources.

---

## 2. Ingestion & Embedding Storage in PGVector

First, we set up PostgreSQL with the \`pgvector\` extension. We use Python with SQLAlchemy and LangChain to chunk documents and store embeddings:

\`\`\`python
import os
from langchain_community.vectorstores import PGVector
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFDirectoryLoader

# Load PDF documents
loader = PyPDFDirectoryLoader("./documents")
docs = loader.load()

# Split documents into overlapping chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = text_splitter.split_documents(docs)

# Initialize OpenAI Embeddings and PGVector Store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
CONNECTION_STRING = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/rag_db")

db = PGVector.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="project_kb",
    connection_string=CONNECTION_STRING,
)
print(f"Successfully ingested {len(chunks)} document chunks into PGVector!")
\`\`\`

---

## 3. Designing the Agent Logic with LangGraph

We define the agent workflow using nodes and conditional edges. The router decides whether to query the vector database or directly answer:

\`\`\`python
from typing import Dict, TypedDict, List
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    query: str
    documents: List[str]
    response: str
    steps: List[str]

def retrieve_node(state: AgentState) -> Dict:
    print("---RETRIEVING FROM PGVECTOR---")
    query = state["query"]
    # Perform vector search
    retrieved_docs = db.similarity_search(query, k=4)
    doc_contents = [d.page_content for d in retrieved_docs]
    return {"documents": doc_contents, "steps": state["steps"] + ["retrieve"]}

def generate_node(state: AgentState) -> Dict:
    print("---GENERATING RESPONSE---")
    # Synthesis query + documents using LLM
    context = "\\n\\n".join(state["documents"])
    prompt = f"Context:\\n{context}\\n\\nQuery: {state['query']}"
    res = llm.invoke(prompt)
    return {"response": res.content, "steps": state["steps"] + ["generate"]}

# Constructing state graph
workflow = StateGraph(AgentState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

# Set entry point
workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

app = workflow.compile()
\`\`\`

---

## 4. Key Takeaways from Production Deployment

When deploying this architecture on **AWS Bedrock** (using Anthropic Claude 3.5 Sonnet) at Aumovio, we observed:
- **Response Accuracy**: Agentic routing increased correct document retrieval by 32% compared to standard single-shot search.
- **Latency Overheads**: Dynamic reasoning loops introduce latency. We optimized this by implementing client-side streaming responses and caching vector query results.
- **Memory Footprint**: Keeping session histories in PostgreSQL using JSONB columns allowed seamless context maintenance during long multi-turn sessions.
`
  },
  {
    id: 2,
    title: "Designing High-Performance APIs with FastAPI and PostgreSQL",
    date: "2026-05-18",
    tags: ["Python", "FastAPI", "PostgreSQL", "Backend"],
    excerpt: "Learn how to optimize Python async APIs, manage connection pools, and structure projects for massive concurrency.",
    content: `
# Designing High-Performance APIs with FastAPI and PostgreSQL

FastAPI is widely known for its speed and developer ergonomics. However, when connecting to databases under heavy load, performance can degrade quickly if connections are misconfigured. In this post, we'll examine advanced configurations to scale FastAPI backends.

---

## 1. Async vs Sync in Python Web Apps

FastAPI allows both synchronous (\`def\`) and asynchronous (\`async def\`) endpoint declarations. 
- Use \`async def\` when performing non-blocking operations, such as calling another service, querying an async database library (e.g. \`asyncpg\`), or reading files asynchronously.
- Use \`def\` for CPU-bound tasks or when using blocking libraries. FastAPI runs these inside an internal threadpool to prevent blocking the main event loop.

---

## 2. Setting Up an Optimized Async Database Pool

Using SQLAlchemy 2.0 with \`asyncpg\` is the industry standard for high-performance PostgreSQL connections. Here is the configuration I recommend:

\`\`\`python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi import Depends
from typing import AsyncGenerator

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"

engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,          # Minimum persistent connections
    max_overflow=10,       # Temporary connections beyond pool_size
    pool_timeout=30,       # Wait limit for connections before throwing error
    pool_recycle=1800,     # Reset connections every 30 mins to avoid leaks
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Dependency Injection for API routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
\`\`\`

---

## 3. Pydantic v2 Serialization and Validation

FastAPI leverages Pydantic for data validation. In Pydantic v2, the validation core was rewritten in Rust, which brings a **5x to 10x performance boost**. To fully utilize this:
- Avoid loops inside models; use Pydantic's built-in serializers.
- Use \`model_validate_json\` directly when loading payload strings to skip unnecessary Python dict intermediate steps.

---

## 4. Query Tuning and Indexing Checklist

No matter how fast your backend code is, a slow database query will bottleneck your application.
1. **Always Index Foreign Keys**: Prevents full table scans during joins.
2. **Analyze Slow Queries**: Use \`EXPLAIN ANALYZE\` on the database to check if the query planner is using index scans instead of sequential scans.
3. **Select Only Needed Columns**: Avoid \`SELECT * \`. In SQLAlchemy, use \`select(User.id, User.name)\` instead of fetching the whole model entity.
`
  },
  {
    id: 3,
    title: "Automating AWS Deployments for Python Web Apps with Docker & CI/CD",
    date: "2026-04-05",
    tags: ["AWS", "Docker", "Jenkins", "DevOps"],
    excerpt: "A step-by-step guide to dockerizing a Python backend and deploying it automatically to AWS ECS via Jenkins pipelines.",
    content: `
# Automating AWS Deployments for Python Web Apps with Docker & CI/CD

In my time at Continental and Aumovio, automated deployments have been critical in saving developer time and maintaining service reliability. This guide details a modern production-ready containerization and deployment process.

---

## 1. Multi-Stage Dockerfile for Python Services

A naive Dockerfile creates bloated images containing compiler utilities and build dependencies that aren't needed at runtime. Using **multi-stage builds**, we keep our final image slim and secure.

\`\`\`dockerfile
# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final runtime image
FROM python:3.11-slim as runner

WORKDIR /app

# Copy installed libraries from builder
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

---

## 2. Writing a Declarative Jenkinsfile for CI/CD

Jenkins pipelines automate linting, unit tests, building, and deploying. This structure ensures a build only hits production if all quality checks pass.

\`\`\`groovy
pipeline {
    agent any
    
    environment {
        AWS_REGISTRY_URL = '123456789012.dkr.ecr.us-east-1.amazonaws.com'
        IMAGE_NAME = 'my-fastapi-app'
        SERVICE_NAME = 'fastapi-service'
        CLUSTER_NAME = 'production-cluster'
    }
    
    stages {
        stage('Lint & Format') {
            steps {
                sh 'pip install flake8 black'
                sh 'black --check .'
                sh 'flake8 .'
            }
        }
        
        stage('Unit Tests') {
            steps {
                sh 'pip install pytest'
                sh 'pytest tests/'
            }
        }
        
        stage('Docker Build & Push') {
            steps {
                script {
                    sh 'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${AWS_REGISTRY_URL}'
                    sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .'
                    sh 'docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${AWS_REGISTRY_URL}/${IMAGE_NAME}:${BUILD_NUMBER}'
                    sh 'docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${AWS_REGISTRY_URL}/${IMAGE_NAME}:latest'
                    sh 'docker push ${AWS_REGISTRY_URL}/${IMAGE_NAME}:${BUILD_NUMBER}'
                    sh 'docker push ${AWS_REGISTRY_URL}/${IMAGE_NAME}:latest'
                }
            }
        }
        
        stage('Deploy to AWS ECS') {
            steps {
                script {
                    // Force deployment of new container image versions on ECS
                    sh 'aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --force-new-deployment --region us-east-1'
                }
            }
        }
    }
}
\`\`\`

---

## 3. Results and Metrics

Implementing this exact automation structure led to:
- **Zero-Downtime Updates**: Rolling updates on ECS swap tasks gradually, eliminating backend service disruptions.
- **Speed**: Reduced deployment cycles from over 25 minutes of manual SSH commands to just **4.5 minutes** from push-to-prod.
- **Validation**: Every build undergoes automatic testing, ensuring code compliance and keeping bugs away from production.
`
  },
  {
    id: 4,
    title: "A Deep Dive into Django's ORM and Database Query Optimization",
    date: "2026-02-28",
    tags: ["Python", "Django", "PostgreSQL", "Backend"],
    excerpt: "Eliminate N+1 queries, leverage select_related and prefetch_related, and master Django aggregation features.",
    content: `
# A Deep Dive into Django's ORM and Database Query Optimization

The Django Object-Relational Mapper (ORM) is incredibly powerful, enabling developers to query databases using clean Python code. However, it abstracts database transactions so heavily that it is easy to write highly inefficient queries. 

In this post, we discuss practical strategies to optimize Django ORM queries and minimize database roundtrips.

---

## 1. The Notorious N+1 Query Problem

An N+1 query problem occurs when your application runs one query to fetch parent records, and then runs additional queries for each child record to retrieve related data. 

For instance, consider displaying a list of books and their authors:
\`\`\`python
# Bad: Runs 1 query for books, and N queries for N authors.
books = Book.objects.all()
for book in books:
    print(book.title, "by", book.author.name)
\`\`\`

### The Solution: \`select_related\` and \`prefetch_related\`
- **\`select_related\`**: Performs an SQL JOIN. Use this for single-value relationships (e.g. ForeignKey, OneToOneField).
- **\`prefetch_related\`**: Performs a separate SQL lookup and joins the results in Python. Use this for multi-value relationships (e.g. ManyToManyField, reverse ForeignKeys).

\`\`\`python
# Optimized: Fetch authors alongside books in a single database join
books = Book.objects.select_related('author').all()
for book in books:
    print(book.title, "by", book.author.name)
\`\`\`

---

## 2. Using \`only()\` and \`defer()\`

By default, Django selects all columns from a table. If you have tables with large text blocks or JSON fields that are not needed in your view, use \`only()\` to select specific fields or \`defer()\` to omit others.

\`\`\`python
# Only fetch the book title and publication date
books = Book.objects.only('title', 'pub_date')
\`\`\`

---

## 3. Query Debugging Tools

During development, it is vital to inspect the queries generated by the ORM:
- **Django Debug Toolbar**: A visual overlay showing executed queries, execution times, and duplicate hits.
- **Logging Queries**: Add this logger configuration to your \`settings.py\` to print all queries straight to your terminal console:

\`\`\`python
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
\`\`\`
`
  },
  {
    id: 5,
    title: "Understanding Agentic AI: Building Autonomous Workflows",
    date: "2026-01-15",
    tags: ["GenAI", "Agentic AI", "Python"],
    excerpt: "An introduction to AI Agents, tool-use, reasoning loops, and multi-agent systems using LangChain and LangGraph.",
    content: `
# Understanding Agentic AI: Building Autonomous Workflows

Generative AI has shifted from static chat assistants to autonomous agents that plan, reason, and act. Instead of simply generating text, agents can use search engines, write code, interact with APIs, and collaborate to solve complex problems.

---

## 1. What Makes an AI "Agent"?

A typical LLM application is linear: User prompt -> LLM -> Output. An **Agentic workflow**, by contrast, introduces feedback loops:
1. **Planning**: Breaking down large tasks into sequential sub-tasks.
2. **Tool Use**: Equipping the LLM with interfaces to fetch external data (APIs, databases, web search).
3. **Reasoning Loop**: Evaluating its progress and correcting course if the tool outputs are unexpected.

---

## 2. Building a ReAct (Reason + Action) Loop from Scratch

The ReAct pattern outlines a simple framework for LLM execution loops: Think, Act, Observe. Here is a simplified implementation:

\`\`\`python
class SimpleAgent:
    def __init__(self, llm, tools):
        self.llm = llm
        self.tools = {t.name: t for t in tools}

    def run(self, prompt: str):
        steps = 0
        state = f"Task: {prompt}\\n"
        
        while steps < 5:
            # Tell LLM to output its Thought and next Action
            response = self.llm.predict(state + "Thought/Action:")
            print(f"\\n--- Agent Step {steps} ---")
            print(response)
            
            if "Final Answer:" in response:
                return response.split("Final Answer:")[1]
                
            # Parse action and run tool
            action_name, action_input = self.parse_action(response)
            tool_output = self.tools[action_name].run(action_input)
            
            state += f"\\nResponse: {response}\\nObservation: {tool_output}\\n"
            steps += 1
            
        return "Failed to find answer in maximum steps."
\`\`\`

---

## 3. Multi-Agent Coordination

For complex workflows, a single agent can become overwhelmed. Modern designs employ **Multi-Agent Systems** where agents have specialized roles (e.g. a Writer agent, a Fact-Checker agent, and a Coder agent) and communicate via a structured state graph. This isolation of concerns leads to higher success rates and simpler prompts.
`
  },
  {
    id: 6,
    title: "Scaling PGVector: Practical Lessons from Production Embeddings",
    date: "2025-11-20",
    tags: ["PGVector", "RAG", "PostgreSQL", "GenAI"],
    excerpt: "Index optimizations, similarity metrics, and query-speed scaling tips for high-dimensional vector search.",
    content: `
# Scaling PGVector: Practical Lessons from Production Embeddings

As RAG databases grow, similarity queries can slow down from milliseconds to seconds. This post explores optimization strategies for scaling **PGVector** databases to support millions of high-dimensional vectors.

---

## 1. Indexing: IVFFlat vs HNSW

PGVector supports two major index types:
- **IVFFlat (Inverted File Flat)**: Groups vectors into clusters. It is fast to build and uses low memory but offers lower recall if the database changes frequently.
- **HNSW (Hierarchical Navigable Small World)**: Creates a multi-layer graph of vectors. It yields superior query recall and query speeds, but takes longer to compile and consumes more RAM.

### How to Create an HNSW Index in SQL:
\`\`\`sql
-- For cosine similarity distance operator (<=>)
CREATE INDEX my_vector_hnsw_idx ON items 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
\`\`\`
- \`m\`: Maximum connections per graph node. Higher values improve recall but increase build time and memory.
- \`ef_construction\`: Size of the dynamic candidate list for index building. Higher values increase search accuracy at the cost of compilation time.

---

## 2. Choosing the Right Distance Metric

Ensure your index distance operator matches your query logic:
- **Cosine Distance (\`<=>\` )**: Best when vectors represent normalized semantic concepts where document length varies.
- **L2 Distance (\`<->\` )**: Euclidean distance, suited for physical geometries or raw unnormalized features.
- **Inner Product (\`<#>\` )**: Fastest metric if all embeddings are normalized to unit length, as distance is computed with simple dot products.

---

## 3. Server Configuration & Tuning

- **Work Memory (\`work_mem\` )**: Increase this parameter so PostgreSQL can build and query the HNSW graph entirely in RAM.
- **Shared Buffers (\`shared_buffers\` )**: Should be large enough to hold index files. A good rule of thumb is allocating 25% of system RAM.
`
  },
  {
    id: 7,
    title: "Automated Data Validation in Complex Python Pipelines",
    date: "2025-09-08",
    tags: ["Python", "FastAPI", "Testing"],
    excerpt: "How we achieved 95% data validation accuracy using Pytest, Pydantic schemas, and structured mocks.",
    content: `
# Automated Data Validation in Complex Python Pipelines

In data-driven backends, incoming payloads are often messy. At Continental, our validation layer processed thousands of daily telemetry data points, making automated testing crucial to prevent failures. Here is how we designed robust validation tests.

---

## 1. Declarative Schemas with Pydantic

Instead of writing custom conditional checks, we define validation logic inside Pydantic schemas:

\`\`\`python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class TelemetryPayload(BaseModel):
    device_id: str = Field(..., min_length=5, pattern="^DEV-\\d{4}$")
    timestamp: datetime
    reading: float = Field(..., ge=-40.0, le=120.0)  # Temperature bounds
    
    @field_validator('timestamp')
    @classmethod
    def validate_timestamp_not_future(cls, value: datetime) -> datetime:
        if value > datetime.utcnow():
            raise ValueError("Timestamp cannot be in the future")
        return value
\`\`\`

---

## 2. Writing Unit Tests with Pytest

We use Pytest parameterized fixtures to run tests across diverse valid and invalid payloads:

\`\`\`python
import pytest
from pydantic import ValidationError
from models import TelemetryPayload

def test_valid_payload():
    data = {
        "device_id": "DEV-1234",
        "timestamp": "2025-09-08T10:00:00Z",
        "reading": 25.5
    }
    payload = TelemetryPayload(**data)
    assert payload.device_id == "DEV-1234"
    assert payload.reading == 25.5

@pytest.mark.parametrize("invalid_data", [
    {"device_id": "DEV-12", "timestamp": "2025-09-08T10:00:00Z", "reading": 25.5},  # Device ID too short
    {"device_id": "DEV-1234", "timestamp": "2025-09-08T10:00:00Z", "reading": 130.0}, # Out of bounds
    {"device_id": "DEV-1234", "timestamp": "2026-09-08T10:00:00Z", "reading": 25.5}  # Future timestamp
])
def test_invalid_payloads(invalid_data):
    with pytest.raises(ValidationError):
        TelemetryPayload(**invalid_data)
\`\`\`

---

## 3. Results of Rigorous Validation

- **Error Catch Rate**: Reached 95% query accuracy in preventing malformed database records.
- **Regression Prevention**: Automated testing inside our CI/CD pipelines prevented developers from inadvertently introducing breaking API changes during hotfixes.
`
  }
];

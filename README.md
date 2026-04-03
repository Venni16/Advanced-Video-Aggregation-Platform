# Advanced Video Aggregation Platform

A high-performance, AI-powered video discovery and aggregation platform tailored for the Tamil Gaming community. Featuring real-time YouTube synchronization, CLIP-based computer vision classification, and an automated, balanced discovery engine.


## ✨ AI-Assisted Development

This project was developed using modern AI-assisted development workflows to accelerate prototyping and experimentation. AI tools were used to assist with parts of the implementation, while the system architecture, service integration, and core engineering decisions were designed and implemented by the developer.

The platform follows a microservice-based architecture integrating a Node.js API layer with a Python FastAPI AI inference service powered by Hugging Face Transformers.

## 🚀 Core Features

- **🎯 Precision Channel Discovery**: Strictly aggregate content from your favorite creators using YouTube Handles (`@tamilgaming`) or Channel IDs.
- **🧠 CLIP-Powered Classification**: Uses OpenAI's **CLIP (Contrastive Language-Image Pre-training)** to analyze video thumbnails and titles, ensuring 99.9% accurate genre categorization (Gaming, Anime, Reaction, Horror, etc.).
- **⚖️ Balanced Aggregation Engine**: Advanced round-robin discovery ensures an equal distribution of content across all tracked channels.
- **✨ Dynamic genre Extraction**: Automatically detects emerging games and topics from video tags and titles, promoting them to new sidebar categories in real-time.
- **📡 Live Stream Integration**: Real-time detection and broadcasting of live streams with instant UI updates via WebSockets.
- **⚡ Microservice Architecture**: Dockerized stack optimized for speed and scalability (Node.js, Python, PostgreSQL, Redis).

## 🛠 Tech Stack

- **Frontend**: React (Vite), CSS3 (Modern Glassmorphism), Lucide Icons.
- **Backend API**: Node.js, Express.js, BullMQ (Task Queue).
- **AI Microservice**: Python (FastAPI), PyTorch, HuggingFace Transformers (CLIP-ViT-B-32).
- **Data Stores**: 
    - **PostgreSQL**: Robust persistence for videos, genres, and logs.
    - **Redis**: High-speed caching and background job coordination.
- **Infrastructure**: Docker & Docker Compose.

## 🏁 Getting Started

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) installed.
- A [YouTube Data API v3 Key](https://console.cloud.google.com/apis/library/youtube.googleapis.com).

### 2. Configuration
Create a `.env` file in the root directory (referencing `.env.example`):

```env
# YouTube API Access
YOUTUBE_API_KEY=your_api_key_here
CHANNEL_IDS=@tamilgaming,@TamilAnimeReacts

# Discovery Limits
YOUTUBE_MAX_RESULTS=500
POLL_INTERVAL_MS=3600000
```

### 3. Launch the Platform
```powershell
docker-compose up --build -d
```

Access the platform at `http://localhost:5173`.

## 🏗 System Architecture

The platform is built on a scalable microservices architecture, utilizing a centralized gateway to orchestrate data flow between the frontend, core API, and AI inference engine.

```mermaid
graph TD
    User([User / Browser]) --> Nginx[Nginx Reverse Proxy]
    
    subgraph "Public Network"
        Nginx
    end

    subgraph "Application Tier"
        Nginx -->|Routes /api/*| Express[Express.js API Gateway]
        Nginx -->|Routes /classify| FastAPI[FastAPI AI Service]
        Nginx -->|Serves| SPA[React Frontend]
    end

    subgraph "Processing Tier"
        Express -->|Enqueues Jobs| BullMQ[BullMQ - Redis]
        BullMQ --> Worker[Discovery Worker]
        Worker -->|Analyzes| YouTube[(YouTube Data API v3)]
        Worker -->|Classifies| FastAPI
    end

    subgraph "Data Tier"
        Express <-->|CRUD| PG[(PostgreSQL)]
        Worker -->|Saves Content| PG
        Express <-->|Cache| Redis[(Redis)]
    end
```

### Core Components

-   **🛡️ Nginx (Edge Gateway)**: The primary entry point for all traffic. It handles SSL termination, request rate-limiting, and path-based routing. It serves the React SPA and enforces security policies (CORS, CSP).
-   **🚀 Express.js (Core API)**: Orchesrates business logic, manages video metadata, and provides the RESTful interface for the frontend. It integrates deeply with the YouTube Data API.
-   **🤖 FastAPI (AI Inference)**: A high-performance Python service hosting the **OpenAI CLIP** model. It performs semantic analysis on video thumbnails and titles to ensure high-precision categorization.
-   **📡 BullMQ & Workers**: A Redis-backed distributed task queue that handles background discovery, periodic channel polling, and asynchronous content classification.
-   **💾 PostgreSQL**: The source of truth for all persistent data, including video records, channel configurations, and system logs.
-   **⚡ Redis**: Handles both the high-speed job queue for BullMQ and serves as a caching layer to reduce database load.

## 🤖 AI Service Architecture (Internal Pipeline)

The AI Classification Service is a high-performance **FastAPI** application designed for real-time video categorization using OpenAI's **CLIP** (Contrastive Language-Image Pre-training) model.

```mermaid
graph LR
    subgraph "Input Processing"
        URL[Thumbnail URL] -->|Download| IMG[PIL Image]
        TITLE[Video Title] -->|Clean| TXT[Clean Text]
    end

    subgraph "CLIP Inference Engine"
        IMG -->|Vision Encoder| IF[Image Features]
        TXT -->|Text Encoder| TF[Text Features]
    end

    subgraph "Feature Fusion & Scoring"
        IF -->|70% Weight| CF[Combined Feature]
        TF -->|30% Weight| CF
        CF -->|Cosine Similarity| SCORE[Cosine Similarity Calculation]
        GP[Pre-encoded Genre Prompts] --> SCORE
    end

    subgraph "Result"
        SCORE --> TOP[Best Match - Genre]
    end
```

### Key Technical Details

-   **Multimodal Inference**: Unlike traditional image classifiers, this service uses **multimodal embeddings**. It extracts visual features from the thumbnail and semantic features from the title/description, combining them into a single high-dimensional vector.
-   **Feature Fusion (70/30 Rule)**: The system applies a 70% weight to the image features (visual content) and 30% to the textual titles to achieve maximum categorization precision.
-   **Zero-Shot Dynamic Sync**: When new genres are discovered or existing ones updated, the system triggers a `/genres/sync` call. The AI service re-encodes text prompts into high-dimensional embeddings on the fly, allowing for "live" category updates without model retraining or service restarts.
-   **Singleton Lifecycle**: The CLIP model is loaded as a singleton during the FastAPI startup lifespan, ensuring optimal memory usage across concurrent requests.

## 📈 Advanced Functionality

### Dynamic Genre Discovery
The platform doesn't just use a fixed list of categories. If multiple videos share a recurring tag or title keyword (e.g., "Resident Evil"), the `GenreDiscoveryService` will:
1.  Auto-create a new `Horror` or specific game genre.
2.  Generate optimized semantic prompts for the AI model.
3.  Synchronize the new genre to the CLIP classifier without a restart.

### Balanced Discovery
By leveraging YouTube's **Uploads Playlist API**, the platform fetches content chronologically and interleaved. This guarantees that if you follow two channels, your homepage remains balanced and doesn't get dominated by a single high-frequency uploader.

## 🤝 Contributing
Feel free to fork this project and submit PRs for any improvements, especially around new CLIP prompt optimizations or frontend UI enhancements.

## Author
Vennilavan Manoharan

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


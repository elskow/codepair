# Pair-to-Pair Code Interview System Design with Video Chat

## 1. System Overview
A lightweight system designed for real-time code interviews involving two users (interviewer and reviewer), with support for real-time collaboration and integrated video chat. Key features include:

- **Real-Time Code Collaboration**: Allows both users to work on code together simultaneously.
- **Code Execution Environment**: Provides a secure environment for running and evaluating code.
- **Video Chat**: Enables video and audio communication between interviewer and reviewer.
- **Minimal User Management**: Basic authentication and role management.
- **Simple Persistence Layer**: Stores user profiles and interview session data.

---

## 2. Key Components

### A. Backend (Golang)

#### 1. WebSocket Server
- **Purpose**: Enables real-time, bi-directional communication between the interviewer and reviewer for code collaboration.
- **Library**: Go’s `gorilla/websocket` package.
- **Functionality**:
  - Real-time text synchronization (code editing) between interviewer and reviewer.
  - Simple chat system for exchanging messages.
  - Manage WebRTC signaling (video/audio chat setup).

#### 2. Code Execution API
- **Containerized Execution**: Execute code securely within Docker containers.
  - **Tech**: Docker for isolation with resource limits (CPU, memory).
- **Supported Languages**: Go, Python, Java.
- **Execution Process**: Submit code via WebSocket, run it in a container, and return the result to both users.

#### 3. User Authentication
- **JWT-based Authentication**: Token-based authentication for both interviewer and reviewer.
- **Role Management**: Two roles: `Interviewer` and `Reviewer`.

#### 4. Data Storage
- **Relational Database (PostgreSQL)**: Store minimal data, including:
  - User profiles (username, roles).
  - Interview history (date, participants).
  - Code submissions for future reference.

---

### B. Frontend

#### 1. Real-Time Code Collaboration UI
- **Code Editor**: Use Monaco or Ace editor for real-time code editing.
  - **Features**:
    - Real-time code synchronization between interviewer and reviewer.
    - Syntax highlighting for supported languages.
    - Submit code for execution and view results.
  
#### 2. Video Chat Integration
- **WebRTC**: Use WebRTC for peer-to-peer video and audio communication.
  - **Signaling**: Handle signaling for establishing WebRTC connections via the WebSocket server.
  - **Video/Audio Stream**: Allow the interviewer and reviewer to communicate via a video stream within the interface.
  
#### 3. UI Features
- **Video Window**: Displays video chat alongside the code editor.
- **Chat Box**: Simple text-based chat for non-verbal communication during the session.
- **Code Execution Result Panel**: Displays execution results next to the code editor.

---

### C. Code Execution Service

#### 1. Isolated Execution Environment
- **Containerization**: Use Docker containers to isolate and run user-submitted code.
- **Basic Resource Limits**: Set limits on CPU, memory, and execution time to prevent abuse.

#### 2. Language Support
- **Supported Languages**: Go, Python, Java.

---

### D. Real-Time Features

#### 1. WebSockets
- **Purpose**: Facilitate real-time communication for code synchronization, signaling for WebRTC, and chat.
  - **Library**: Use Go’s `gorilla/websocket` package for WebSocket connections.
  
#### 2. WebRTC for Video Chat
- **Peer-to-Peer Communication**: Use WebRTC for direct video/audio streaming between the interviewer and reviewer.
- **Signaling Process**: 
  - WebSocket is used to exchange signaling messages (SDP, ICE candidates) between peers to establish the WebRTC connection.
  - Once the connection is established, video/audio data streams directly between users.
  
---

## 3. System Design Example

### A. Flow of a Code Interview Session with Video Chat
1. **Session Start**: The interviewer and reviewer log in and join the session.
2. **WebSocket Connection**: Both users connect to the WebSocket server for real-time code collaboration and WebRTC signaling.
3. **WebRTC Setup**: The WebSocket server handles signaling messages (SDP/ICE candidates) to establish a peer-to-peer WebRTC connection for video chat.
4. **Live Coding**: The reviewer writes code while the interviewer observes in real-time.
5. **Code Execution**: The reviewer submits the code, which is executed in a Docker container, and the result is returned.
6. **Video Chat**: Both users communicate via live video while working on the code.

---

## 4. Tech Stack

#### Backend
- **Golang**: Core logic for WebSocket handling, authentication, and code execution.
- **gorilla/websocket**: For WebSocket communication.
- **Docker**: For containerized code execution.
- **PostgreSQL**: Relational database for user and session data.
- **WebRTC**: For video and audio communication.

#### Frontend
- **React.js**: Basic UI framework.
- **Monaco/Ace Editor**: For live code editing.
- **WebRTC API**: Browser-based WebRTC for peer-to-peer video communication.
- **WebSockets**: For real-time collaboration and signaling.

---

## 5. Security Considerations

### A. Code Execution Security
- **Sandboxing**: Isolate code execution in Docker containers.
- **Resource Limits**: Enforce CPU, memory, and execution time limits to prevent misuse.

### B. WebSocket Security
- **TLS Encryption**: Ensure WebSocket connections are secure using TLS.
- **JWT Authentication**: Authenticate WebSocket connections using JWT tokens.

### C. WebRTC Security
- **Encryption**: WebRTC streams are encrypted by default for security.
- **Secure Signaling**: Ensure that the WebSocket server used for signaling is secured using TLS and authenticated with JWT tokens.

---

## 6. Features to Add Later

1. **Session Recording**: Option to record video calls and code submissions.
2. **Interview Analytics**: Basic stats on interviews conducted and code submissions.
3. **Problem Templates**: Pre-defined coding problems that can be assigned by the interviewer.

---


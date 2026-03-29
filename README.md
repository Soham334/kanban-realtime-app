# Kanban Realtime  
*Modern, lightning-fast Kanban board with real-time collaboration*

<p align="center">
  <img src="https://img.shields.io/badge/Realtime-Firebase-orange?style=for-the-badge&logo=firebase">
  <img src="https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel">
  <img src="https://img.shields.io/badge/Frontend-JavaScript-yellow?style=for-the-badge&logo=javascript">
</p>

---

## 🚀 Features

- 🔄 **Real-time Collaboration** — Instant updates across all users via Firestore listeners  
- 🧩 **Kanban Workflow** — Organize tasks into customizable columns  
- 🖱️ **Smooth Drag & Drop** — Effortlessly move tasks between stages  
- ✏️ **Task CRUD** — Create, edit, delete tasks with minimal friction  
- 📊 **WIP Limits** — Enforce productivity constraints per column  
- 🔗 **Shareable Boards** — Access boards via unique URLs (no login required)  
- ⚙️ **Board Settings** — Configure columns, limits, and behavior  
- 📈 **Live Metrics UI** — Visual indicators for task distribution  

---

## 🧠 How It Works

This app is built as a **real-time client-first application** powered by Firebase.

### ⚡ Architecture

```

Frontend (JS UI)
↓
Firestore (Realtime DB)
↓
Live Sync to all clients

````

### 🔄 Flow

1. User opens a board using a unique URL  
2. App connects to Firebase Firestore  
3. Real-time listeners (`onSnapshot`) subscribe to board data  
4. Any change (drag, edit, create) updates Firestore  
5. All users instantly see updates  

---

## 🛠 Tech Stack

| Layer       | Technology |
|------------|-----------|
| Frontend    | HTML, CSS, JavaScript |
| Backend     | Firebase Firestore |
| Hosting     | Vercel |
| Realtime    | Firestore Listeners (`onSnapshot`) |

---

## 📸 UI Overview

### 🧭 Header
- Board title  
- Settings access  
- Shareable link  

### 📋 Kanban Board
- Multiple columns (e.g., To Do, In Progress, Done)  
- Drag-and-drop task cards  
- WIP limit indicators  

### 📊 Metrics Panel
- Task counts per column  
- Progress visualization  

### 🧾 Modals
- Task creation/edit modal  
- Board settings modal  

---

## ⚙️ Installation / Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/kanban-realtime.git
cd kanban-realtime
````

### 2️⃣ Install Dependencies

```bash
npm install
```

*(If it's a pure HTML/JS project, this step may not be required)*

---

### 3️⃣ Firebase Setup

1. Go to Firebase Console
2. Create a new project
3. Enable **Firestore Database**
4. Copy your config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};
```

5. Replace config in your project

---

### 4️⃣ Run Locally

```bash
npm run dev
```

or simply open `index.html` in your browser if no build tool is used.

---

## 🔥 Usage

* Open the app via URL
* Create or join a board
* Add tasks inside columns
* Drag tasks between columns
* Edit or delete tasks
* Share the URL with others for collaboration

---

## 🌐 Deployment

This project is optimized for **Vercel**:

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo directly to Vercel for auto-deploy.

---

## 📌 Future Improvements

* 🔐 Authentication (Google / Email login)
* 🧑‍🤝‍🧑 Multi-user presence indicators
* 💬 Comments & activity history
* 🏷️ Labels, tags, and priority levels
* 📅 Due dates & reminders
* 📱 Mobile responsiveness improvements
* 📊 Advanced analytics dashboard
* 📴 Offline support with sync

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a new branch

   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes
4. Push to your branch
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

<p align="center">
  Built with ⚡ speed, 🔥 real-time sync, and 💡 simplicity
</p>
```

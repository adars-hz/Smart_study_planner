# 📚 Smart Study Planner — AI-Powered Timetable Generator

An intelligent, web-based study planner that uses **Machine Learning (Decision Tree Regression)** to predict subject priority scores and automatically allocate optimal study time across subjects. Built with **Flask**, **Scikit-Learn**, and a premium dark-themed UI.

---

## 🌟 Features

- **AI-Driven Priority Prediction** — Uses a trained Decision Tree Regressor to predict how much priority each subject needs based on difficulty, preparation level, and days remaining.
- **Smart Time Allocation** — Automatically distributes your available study hours proportionally based on ML-predicted priority scores.
- **Modern Web Interface** — Glassmorphism-styled dark UI with animated background orbs, smooth micro-animations, and responsive design.
- **Real-Time Interaction** — Add subjects, generate timetables, and clear data without page reloads (async API calls).
- **Toast Notifications** — Non-intrusive feedback for all user actions (success, error, warnings).
- **Responsive Design** — Fully optimized for desktop and mobile viewports.

---

## 🛠️ Tech Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| **Backend**  | Python 3, Flask 3.0.2                            |
| **ML Model** | Scikit-Learn 1.4.1 — Decision Tree Regressor     |
| **Data**     | Pandas 2.2.1, NumPy 1.26.4                      |
| **Frontend** | HTML5, Vanilla CSS (Glassmorphism), JavaScript ES6 |
| **Font**     | Google Fonts — Inter                             |

---

## 📁 Project Structure

```
adarsh project/
│
├── app.py                                # Flask backend — routes, ML model training & prediction
├── study_planner_priority_dataset.csv    # Training dataset (301 records, 5 features)
├── requirements.txt                      # Python dependencies
├── README.md                             # Project documentation (this file)
│
├── templates/
│   └── index.html                        # Main HTML template (Jinja2)
│
└── static/
    ├── style.css                         # Premium dark-theme stylesheet
    └── script.js                         # Client-side logic (API calls, DOM rendering)
```

---

## 📊 Dataset

The file `study_planner_priority_dataset.csv` contains **301 training records** with the following columns:

| Column              | Description                              | Range  |
| ------------------- | ---------------------------------------- | ------ |
| `Difficulty`        | Subject difficulty level                 | 1 – 5  |
| `Days_Left`         | Days remaining until the exam            | 1 – 60 |
| `Preparation_Level` | Student's current preparation level      | 1 – 5  |
| `Available_Hours`   | Available study hours (used in training) | 2 – 10 |
| `Priority_Score`    | Target priority score (label)            | 2.3 – 10.0 |

The model trains on **Difficulty**, **Preparation_Level**, and **Days_Left** as input features to predict the **Priority_Score**.

---

## ⚙️ How It Works

### Machine Learning Pipeline

1. **Training Phase** — On server startup, the Decision Tree Regressor (`max_depth=6`, `random_state=42`) is trained on the CSV dataset.
2. **Prediction Phase** — When the user clicks "Generate Timetable," each subject's features are fed into the trained model to predict its priority score.
3. **Allocation Phase** — Study hours are distributed proportionally:
   ```
   allocated_hours = (subject_priority / total_priority) × total_hours
   ```

### Application Flow

```
User adds subjects (name, difficulty, prep level, days left)
        │
        ▼
User enters total study hours & clicks "Generate Timetable"
        │
        ▼
Flask API receives data → ML model predicts priority scores
        │
        ▼
Hours allocated proportionally → Results displayed in table
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** installed on your system
- **pip** (Python package manager)

### Installation

1. **Clone or download** this project:
   ```bash
   cd "adarsh project"
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application:**
   ```bash
   python app.py
   ```

4. **Open your browser** and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

---

## 🔌 API Endpoints

| Method | Endpoint                  | Description                              |
| ------ | ------------------------- | ---------------------------------------- |
| `GET`  | `/`                       | Serve the main web page                  |
| `POST` | `/api/add_subject`        | Add a subject with difficulty, prep level, days left |
| `POST` | `/api/generate_timetable` | Generate AI-predicted timetable          |
| `POST` | `/api/clear`              | Clear all subjects from memory           |
| `GET`  | `/api/subjects`           | Retrieve current list of subjects        |

### Example — Add Subject

```json
POST /api/add_subject
Content-Type: application/json

{
  "subject": "Mathematics",
  "difficulty": 8,
  "prep_level": 3,
  "days_left": 14
}
```

### Example — Generate Timetable

```json
POST /api/generate_timetable
Content-Type: application/json

{
  "total_hours": 6
}
```

### Example Response

```json
{
  "message": "Timetable generated successfully!",
  "subjects": [
    {
      "subject": "Mathematics",
      "difficulty": 8,
      "prep_level": 3,
      "days_left": 14,
      "priority": 9.85,
      "allocated_time": "3h 45m"
    }
  ]
}
```

---

## 🎨 UI Design Highlights

- **Dark Theme** with a curated color palette (deep purples, indigo accents)
- **Glassmorphism Cards** — Semi-transparent backgrounds with backdrop blur
- **Animated Background Orbs** — Three floating gradient orbs with smooth animation
- **Micro-Animations** — Row slide-in effects, button hover transforms, bouncing empty state icon
- **Toast Notifications** — Spring-animated popups with contextual icons
- **Responsive Grid** — CSS Grid layout that adapts from multi-column to single-column on mobile

---

## 📦 Dependencies

```
flask==3.0.2
pandas==2.2.1
numpy==1.26.4
scikit-learn==1.4.1.post1
```

Install all at once:

```bash
pip install -r requirements.txt
```

---

## 📝 Usage Guide

1. **Add Subjects** — Fill in the subject name, difficulty (1–10), preparation level (1–10), and days remaining until the exam. Click **"Add Subject"**.
2. **Review Entries** — Added subjects appear in the results table with pending priority and time slots.
3. **Generate Timetable** — Enter your total available study hours for the day and click **"Generate Timetable"**. The AI model will predict priorities and allocate time.
4. **Clear & Restart** — Click **"Clear All"** to remove all subjects and start fresh.

---

## 🧠 Algorithm Details

### 📅 Intelligent Scheduling Logic (Exam Gaps & Priority)
The core logic of the Smart Study Planner revolves around handling real-world exam schedules, specifically focusing on the gaps between exams:
1. **Immediate Urgency:** Exams that are approaching first naturally receive the highest priority to ensure you are ready in time.
2. **Short Gaps (1-2 Days):** If two exams are back-to-back or have a very short gap between them, the system understands that you cannot cram for the second exam during that tiny gap. Therefore, it increases the priority of the second exam *earlier* in your schedule.
3. **Long Gaps:** If there is a large gap of days after one exam and before the next, the system deprioritizes the later exam right now. It knows you can utilize those empty gap days exclusively for that specific subject after the first exam is over.

**Decision Tree Regressor** was chosen for this project because:

- ✅ Handles non-linear relationships between features
- ✅ Provides interpretable decisions (tree structure)
- ✅ Works well with small-to-medium datasets
- ✅ No need for feature scaling or normalization
- ✅ Fast prediction time suitable for real-time web applications

**Hyperparameters:**
- `max_depth = 6` — Prevents overfitting while capturing patterns
- `random_state = 42` — Ensures reproducible results

---

## 📄 License

This project is developed for academic purposes.

---

> **Smart Study Planner © 2026** — Powered by Scikit-Learn Decision Tree Regression

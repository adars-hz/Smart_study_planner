from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
import uuid
from sklearn.tree import DecisionTreeRegressor
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# ── Global state ──────────────────────────────────────────────────────────────
model = None
subjects_data = []  # list of dicts stored in memory


def train_model():
    """Load dataset and train the Decision Tree Regressor model."""
    global model
    dataset_file = os.path.join(os.path.dirname(__file__), 'study_planner_priority_dataset.csv')

    if not os.path.exists(dataset_file):
        print(f"[ERROR] Dataset '{dataset_file}' not found.")
        return

    data = pd.read_csv(dataset_file)

    # Features: Difficulty, Preparation Level, Days Left, Gap Days
    X = data[['Difficulty', 'Preparation_Level', 'Days_Left', 'Gap_Days']]
    # Target: Priority Score
    y = data['Priority_Score']

    # Decision Tree Regressor as described in the project synopsis
    model = DecisionTreeRegressor(random_state=42, max_depth=6)
    model.fit(X, y)
    print("[INFO] Model trained successfully.")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/api/add_subject', methods=['POST'])
def add_subject():
    """Add a subject with its details."""
    data = request.get_json()

    try:
        subject = data.get('subject', '').strip()
        if not subject:
            return jsonify({'error': 'Subject name cannot be empty.'}), 400

        difficulty = float(data.get('difficulty', 0))
        prep_level = float(data.get('prep_level', 0))
        days_left = float(data.get('days_left', 0))

        if not (1 <= difficulty <= 10):
            return jsonify({'error': 'Difficulty must be between 1 and 10.'}), 400
        if not (1 <= prep_level <= 10):
            return jsonify({'error': 'Preparation Level must be between 1 and 10.'}), 400
        if days_left <= 0:
            return jsonify({'error': 'Days left must be greater than 0.'}), 400

        entry = {
            'id': uuid.uuid4().hex,
            'subject': subject,
            'difficulty': difficulty,
            'prep_level': prep_level,
            'days_left': days_left,
            'priority': None,
            'allocated_time': None
        }
        subjects_data.append(entry)

        return jsonify({'message': 'Subject added successfully.', 'subjects': subjects_data})

    except (ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400


@app.route('/api/generate_timetable', methods=['POST'])
def generate_timetable():
    """Use the ML model to predict priorities and allocate study hours, adjusting for exam gaps."""
    if not subjects_data:
        return jsonify({'error': 'Please add at least one subject first.'}), 400

    if model is None:
        return jsonify({'error': 'Model not trained. Dataset may be missing.'}), 500

    data = request.get_json()
    try:
        total_hours = float(data.get('total_hours', 0))
        if total_hours <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({'error': 'Please enter a valid positive number for study hours.'}), 400

    # Phase 1: Calculate Gaps & Strategy Notes
    # Sort a temporary list by days_left to analyze chronological gaps
    sorted_subjects = sorted(subjects_data, key=lambda x: x['days_left'])

    for i, curr in enumerate(sorted_subjects):
        if i == 0:
            curr['gap_days'] = 0
            curr['strategy_note'] = "Next Exam! Highest Priority."
        else:
            prev = sorted_subjects[i-1]
            gap = curr['days_left'] - prev['days_left']
            curr['gap_days'] = max(0, float(gap))

            if gap <= 2:
                curr['strategy_note'] = f"Short gap after {prev['subject']}. Study now."
            elif gap >= 4:
                curr['strategy_note'] = f"Study during gap after {prev['subject']} exam."
            else:
                curr['strategy_note'] = "Balanced prep."

    # Phase 2: ML Priority Prediction (now natively using Gap_Days!)
    for entry in subjects_data:
        features = pd.DataFrame(
            [[entry['difficulty'], entry['prep_level'], entry['days_left'], entry.get('gap_days', 0)]],
            columns=['Difficulty', 'Preparation_Level', 'Days_Left', 'Gap_Days']
        )
        # The trained ML model predicts the priority shift automatically based on the gap!
        entry['base_priority'] = max(0.1, model.predict(features)[0])
        
        # Cleanup temporary key
        if 'gap_days' in entry:
            del entry['gap_days']

    # Phase 3: Distribute hours proportionally
    total_priority = sum(entry['base_priority'] for entry in subjects_data)
    if total_priority <= 0: 
        total_priority = 1 # Fallback to prevent division by zero

    for entry in subjects_data:
        priority = entry['base_priority']
        allocated = (priority / total_priority) * total_hours
        hours = int(allocated)
        minutes = int((allocated - hours) * 60)

        entry['priority'] = round(priority, 2)
        entry['allocated_time'] = f"{hours}h {minutes}m"
        
        # Cleanup temporary key
        del entry['base_priority']

    return jsonify({
        'message': 'Timetable generated successfully!',
        'subjects': subjects_data
    })


@app.route('/api/import_subjects', methods=['POST'])
def import_subjects():
    """Import subjects from a JSON payload."""
    global subjects_data
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Invalid format. Expected a list of subjects.'}), 400
    
    # Ensure every imported subject has an id just in case
    for s in data:
        if 'id' not in s:
            s['id'] = uuid.uuid4().hex

    subjects_data = data
    return jsonify({'message': 'Subjects restored successfully.', 'subjects': subjects_data})


@app.route('/api/clear', methods=['POST'])
def clear_subjects():
    """Clear all subjects from memory."""
    subjects_data.clear()
    return jsonify({'message': 'All subjects cleared.', 'subjects': []})


@app.route('/api/delete_subject/<subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    """Delete a subject by its ID."""
    global subjects_data
    subjects_data = [s for s in subjects_data if s.get('id') != subject_id]
    return jsonify({'message': 'Subject deleted.', 'subjects': subjects_data})


@app.route('/api/edit_subject/<subject_id>', methods=['PUT'])
def edit_subject(subject_id):
    """Edit an existing subject."""
    data = request.get_json()
    for s in subjects_data:
        if s.get('id') == subject_id:
            s['subject'] = data.get('subject', s['subject'])
            s['difficulty'] = float(data.get('difficulty', s['difficulty']))
            s['prep_level'] = float(data.get('prep_level', s['prep_level']))
            s['days_left'] = float(data.get('days_left', s['days_left']))
            # Reset generated properties
            s['priority'] = None
            s['allocated_time'] = None
            if 'strategy_note' in s:
                del s['strategy_note']
            break
    return jsonify({'message': 'Subject updated.', 'subjects': subjects_data})


@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    """Return the current list of subjects."""
    return jsonify({'subjects': subjects_data})


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    train_model()
    app.run(debug=True, port=5000)

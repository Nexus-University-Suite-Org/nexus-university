"""
Smart Study Plan Generator - Real ML Models
Uses actual student data from messaging backend to predict effort, prioritize tasks, and generate optimized study schedules
"""

import json
import os
import pickle
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import math

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, roc_auc_score, mean_squared_error
import joblib

import logging

log = logging.getLogger(__name__)

MODEL_DIR = Path("models/study_plan")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

class StudyPlanMLService:
    def __init__(self):
        self.effort_model = None
        self.priority_model = None
        self.on_time_model = None
        self.scaler = StandardScaler()
        self.models_trained = False
        self.feature_columns = [
            'points_weight', 'days_until_due_log', 'days_until_due_exp',
            'course_gpa', 'student_course_gpa', 'relative_performance',
            'on_time_rate', 'avg_grade_point', 'assignment_completion_rate',
            'deadline_clustering', 'workload_pressure_7d', 'is_quiz',
            'quiz_avg_score_pct', 'submission_lead_time_norm'
        ]
        self.load_models()
    
    def load_models(self):
        try:
            if (MODEL_DIR / "effort_model.pkl").exists():
                self.effort_model = joblib.load(MODEL_DIR / "effort_model.pkl")
            if (MODEL_DIR / "on_time_model.pkl").exists():
                self.on_time_model = joblib.load(MODEL_DIR / "on_time_model.pkl")
            if (MODEL_DIR / "scaler.pkl").exists():
                self.scaler = joblib.load(MODEL_DIR / "scaler.pkl")
            self.models_trained = self.effort_model is not None
            log.info(f"Loaded ML models - trained: {self.models_trained}")
        except Exception as e:
            log.warning(f"Could not load models: {e}")
            self.models_trained = False
    
    def save_models(self):
        try:
            if self.effort_model:
                joblib.dump(self.effort_model, MODEL_DIR / "effort_model.pkl")
            if self.on_time_model:
                joblib.dump(self.on_time_model, MODEL_DIR / "on_time_model.pkl")
            joblib.dump(self.scaler, MODEL_DIR / "scaler.pkl")
            log.info("Models saved successfully")
        except Exception as e:
            log.error(f"Error saving models: {e}")
    
    def extract_student_features(self, student_id: str, data: Dict) -> Dict:
        """Extract comprehensive student-level features from historical data"""
        submissions = [s for s in data.get('submissions', []) if str(s.get('student_id')) == str(student_id)]
        grades = [g for g in data.get('grades', []) if str(g.get('student_id')) == str(student_id)]
        quiz_attempts = [qa for qa in data.get('quiz_attempts', []) if str(qa.get('student_id')) == str(student_id)]
        assignments = data.get('assignments', [])
        enrollments = [e for e in data.get('enrollments', []) if str(e.get('student_id')) == str(student_id) and e.get('status') == 'approved']
        
        features = {}
        
        # Submission timeliness
        on_time_count = 0
        total_submitted = 0
        lead_times = []
        for sub in submissions:
            total_submitted += 1
            assign_id = sub.get('assignment_id')
            assign = next((a for a in assignments if str(a.get('id')) == str(assign_id)), None)
            if assign and sub.get('submitted_at') and assign.get('due_date'):
                try:
                    sub_time = datetime.fromisoformat(str(sub['submitted_at']).replace('Z', '+00:00').replace('+00:00', ''))
                    due_time = datetime.fromisoformat(str(assign['due_date']).replace('Z', '+00:00').replace('+00:00', ''))
                    if sub_time <= due_time:
                        on_time_count += 1
                    lead_times.append((due_time - sub_time).total_seconds() / 3600)
                except:
                    pass
        
        features['on_time_rate'] = (on_time_count / total_submitted) if total_submitted > 0 else 0.75
        features['avg_lead_time_hours'] = np.mean(lead_times) if lead_times else 24
        features['assignment_completion_rate'] = min(1.0, total_submitted / max(1, len([a for a in assignments if any(e.get('course_id') == a.get('course_id') for e in enrollments)])))
        
        # Grade performance
        if grades:
            gps = []
            course_gpas = {}
            for g in grades:
                gp = g.get('gp') or g.get('grade_point') or 0
                try:
                    gp_f = float(gp)
                    gps.append(gp_f)
                    cid = g.get('course_id')
                    if cid:
                        if cid not in course_gpas:
                            course_gpas[cid] = []
                        course_gpas[cid].append(gp_f)
                except:
                    pass
            features['avg_grade_point'] = np.mean(gps) if gps else 3.0
            features['course_gpas'] = {k: np.mean(v) for k, v in course_gpas.items()}
        else:
            features['avg_grade_point'] = 3.0
            features['course_gpas'] = {}
        
        # Quiz performance
        if quiz_attempts:
            scores = []
            for qa in quiz_attempts:
                if qa.get('score') is not None:
                    scores.append(float(qa['score']))
            features['quiz_avg_score_pct'] = (np.mean(scores) / 100.0) if scores else 0.7
        else:
            features['quiz_avg_score_pct'] = 0.7
        
        # Workload pressure
        today = datetime.now()
        upcoming_7d = 0
        for a in assignments:
            if any(e.get('course_id') == a.get('course_id') for e in enrollments):
                due = a.get('due_date')
                if due:
                    try:
                        due_dt = datetime.fromisoformat(str(due).replace('Z', '+00:00').replace('+00:00', ''))
                        if 0 <= (due_dt - today).days <= 7:
                            upcoming_7d += 1
                    except:
                        pass
        features['workload_pressure_7d'] = min(1.0, upcoming_7d / 5.0)
        
        return features
    
    def extract_task_features(self, task: Dict, student_features: Dict, all_tasks: List[Dict]) -> np.ndarray:
        """Extract features for a specific task"""
        features = []
        today = datetime.now()
        
        # Task weight
        points = float(task.get('total_points', 100))
        points_weight = points / 100.0
        features.append(points_weight)
        
        # Urgency
        due_date = task.get('due_date') or task.get('end_date')
        if due_date:
            try:
                due_dt = datetime.fromisoformat(str(due_date).replace('Z', '+00:00').replace('+00:00', ''))
                days_left = max(0, (due_dt - today).days)
                features.append(math.log1p(days_left) / math.log1p(30))  # log normalized
                features.append(math.exp(-days_left / 3.5) / math.exp(0))  # exponential urgency
            except:
                features.append(0.5)
                features.append(0.5)
        else:
            features.append(0.5)
            features.append(0.3)
        
        # Course performance
        course_id = task.get('course_id', '')
        course_gpas = student_features.get('course_gpas', {})
        course_gpa = course_gpas.get(course_id, student_features.get('avg_grade_point', 3.0))
        features.append(course_gpa / 4.0)
        features.append(course_gpa / 4.0)
        features.append((course_gpa - student_features.get('avg_grade_point', 3.0)) / 4.0)  # relative
        
        # Student history
        features.append(student_features.get('on_time_rate', 0.75))
        features.append(student_features.get('avg_grade_point', 3.0) / 4.0)
        features.append(student_features.get('assignment_completion_rate', 0.8))
        
        # Deadline clustering
        clustering = 0
        if due_date:
            try:
                due_dt = datetime.fromisoformat(str(due_date).replace('Z', '+00:00').replace('+00:00', ''))
                for t in all_tasks:
                    if t == task:
                        continue
                    td = t.get('due_date') or t.get('end_date')
                    if td:
                        tdt = datetime.fromisoformat(str(td).replace('Z', '+00:00').replace('+00:00', ''))
                        if abs((tdt - due_dt).days) <= 2:
                            clustering += 1
            except:
                pass
        features.append(min(1.0, clustering / 3.0))
        features.append(student_features.get('workload_pressure_7d', 0.3))
        
        # Task type
        features.append(1.0 if task.get('type') == 'quiz' or task.get('total_points', 100) < 50 else 0.0)
        features.append(student_features.get('quiz_avg_score_pct', 0.7))
        features.append(min(1.0, student_features.get('avg_lead_time_hours', 24) / 72.0))
        
        return np.array(features)
    
    def predict_effort_hours(self, task: Dict, student_features: Dict, all_tasks: List[Dict]) -> float:
        """Predict study hours needed using ML model"""
        features = self.extract_task_features(task, student_features, all_tasks).reshape(1, -1)
        
        if self.models_trained and self.effort_model:
            try:
                features_scaled = self.scaler.transform(features)
                pred = self.effort_model.predict(features_scaled)[0]
                # Ensure reasonable bounds
                pred = max(0.5, min(6.0, pred))
                return round(pred, 1)
            except Exception as e:
                log.warning(f"ML prediction failed, using heuristic: {e}")
        
        # Fallback heuristic based on data
        points = float(task.get('total_points', 100))
        course_id = task.get('course_id', '')
        course_gpa = student_features.get('course_gpas', {}).get(course_id, student_features.get('avg_grade_point', 3.0))
        difficulty_factor = max(0.7, 4.0 / max(1.0, course_gpa))
        efficiency = 1.0 / max(0.6, student_features.get('on_time_rate', 0.75))
        base_hours = (points / 100.0) * 2.5
        pred = base_hours * difficulty_factor * efficiency
        return round(max(0.5, min(6.0, pred)), 1)
    
    def predict_on_time_probability(self, task: Dict, student_features: Dict, all_tasks: List[Dict]) -> float:
        """Predict probability of on-time completion"""
        features = self.extract_task_features(task, student_features, all_tasks).reshape(1, -1)
        
        if self.models_trained and self.on_time_model:
            try:
                features_scaled = self.scaler.transform(features)
                prob = self.on_time_model.predict_proba(features_scaled)[0][1]
                return round(prob, 3)
            except:
                pass
        
        # Heuristic
        days_left = 7
        due_date = task.get('due_date') or task.get('end_date')
        if due_date:
            try:
                due_dt = datetime.fromisoformat(str(due_date).replace('Z', '+00:00').replace('+00:00', ''))
                days_left = max(0, (due_dt - datetime.now()).days)
            except:
                pass
        
        base_prob = student_features.get('on_time_rate', 0.75)
        urgency_penalty = min(0.3, (7 - days_left) * 0.05) if days_left < 7 else 0
        course_id = task.get('course_id', '')
        course_gpa = student_features.get('course_gpas', {}).get(course_id, 3.0)
        difficulty_penalty = max(0, (3.5 - course_gpa) * 0.1)
        prob = max(0.1, base_prob - urgency_penalty - difficulty_penalty)
        return round(prob, 3)
    
    def calculate_ml_priority(self, task: Dict, student_features: Dict, all_tasks: List[Dict]) -> float:
        """Calculate priority using ML-informed scoring"""
        on_time_prob = self.predict_on_time_probability(task, student_features, all_tasks)
        features = self.extract_task_features(task, student_features, all_tasks)
        
        # ML-enhanced priority
        urgency = features[2] * 10  # exponential urgency
        importance = features[0] * 10  # points weight
        risk = (1 - on_time_prob) * 10  # risk factor
        difficulty = max(0, (0.75 - features[6])) * 10  # based on relative performance
        
        priority = 0.4 * urgency + 0.25 * importance + 0.25 * risk + 0.1 * difficulty
        return round(min(10.0, max(1.0, priority)), 2)
    
    def train_models(self, training_data: Dict):
        """Train ML models on historical data"""
        try:
            submissions = training_data.get('submissions', [])
            grades = training_data.get('grades', [])
            assignments = training_data.get('assignments', [])
            
            X_effort = []
            y_effort = []
            X_ontime = []
            y_ontime = []
            
            # Build training samples from historical submissions
            for sub in submissions:
                student_id = sub.get('student_id')
                assign_id = sub.get('assignment_id')
                assign = next((a for a in assignments if str(a.get('id')) == str(assign_id)), None)
                if not assign or not student_id:
                    continue
                
                student_features = self.extract_student_features(str(student_id), training_data)
                
                # Create task representation
                task = {**assign, 'type': 'assignment'}
                
                features = self.extract_task_features(task, student_features, assignments)
                
                # Target for on-time prediction
                if sub.get('submitted_at') and assign.get('due_date'):
                    try:
                        sub_time = datetime.fromisoformat(str(sub['submitted_at']).replace('Z', '+00:00').replace('+00:00', ''))
                        due_time = datetime.fromisoformat(str(assign['due_date']).replace('Z', '+00:00').replace('+00:00', ''))
                        on_time = 1 if sub_time <= due_time else 0
                        X_ontime.append(features)
                        y_ontime.append(on_time)
                    except:
                        pass
                
                # Target for effort - proxy from points and difficulty
                if sub.get('score') is not None:
                    points = float(assign.get('total_points', 100))
                    course_gpa = student_features.get('course_gpas', {}).get(assign.get('course_id'), 3.0)
                    effort_proxy = (points / 100.0) * 2.5 * (4.0 / max(1.0, course_gpa))
                    effort_proxy = max(0.5, min(6.0, effort_proxy))
                    X_effort.append(features)
                    y_effort.append(effort_proxy)
            
            if len(X_effort) >= 10:
                X_eff = np.array(X_effort)
                y_eff = np.array(y_effort)
                X_eff_scaled = self.scaler.fit_transform(X_eff)
                self.effort_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
                self.effort_model.fit(X_eff_scaled, y_eff)
                log.info(f"Trained effort model on {len(X_eff)} samples")
            
            if len(X_ontime) >= 10:
                X_ot = np.array(X_ontime)
                y_ot = np.array(y_ontime)
                X_ot_scaled = self.scaler.transform(X_ot)
                self.on_time_model = GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
                self.on_time_model.fit(X_ot_scaled, y_ot)
                log.info(f"Trained on-time model on {len(X_ot)} samples, AUC: {roc_auc_score(y_ot, self.on_time_model.predict_proba(X_ot_scaled)[:,1]):.3f}")
            
            self.models_trained = self.effort_model is not None
            self.save_models()
            return {"status": "trained", "effort_samples": len(X_effort), "ontime_samples": len(X_ontime)}
        except Exception as e:
            log.error(f"Training error: {e}")
            return {"status": "error", "message": str(e)}
    
    def generate_schedule(self, tasks_with_scores: List[Dict], available_hours: int = 4) -> List[Dict]:
        """Generate optimized study schedule"""
        schedule = []
        current_time = datetime.strptime("09:00", "%H:%M")
        max_minutes = available_hours * 60
        total_used = 0
        
        sorted_tasks = sorted(tasks_with_scores, key=lambda x: x['priority_score'], reverse=True)
        
        for task in sorted_tasks:
            if total_used >= max_minutes:
                break
            
            duration_hours = task.get('estimated_hours', 1.0)
            duration_mins = int(duration_hours * 60)
            duration_mins = min(duration_mins, 90, max_minutes - total_used)
            
            if duration_mins < 15:
                continue
            
            session_start = current_time.strftime("%H:%M")
            reason = f"Priority {task['priority_score']:.1f}/10 | {task['on_time_prob']:.0%} on-time prob"
            if task['on_time_prob'] < 0.6:
                reason += " | AT RISK"
            
            schedule.append({
                "task_id": task['id'],
                "suggested_start": session_start,
                "suggested_duration_minutes": duration_mins,
                "reason": reason,
                "course_code": task.get('course_code', ''),
                "title": task.get('title', '')
            })
            
            current_time += timedelta(minutes=duration_mins + 10)
            total_used += duration_mins + 10
        
        return schedule
    
    def generate_plan(self, request_data: Dict) -> Dict:
        """Generate complete ML-powered study plan"""
        student_id = str(request_data.get('student_id'))
        data = request_data
        
        student_features = self.extract_student_features(student_id, data)
        
        # Get enrollments for student
        enrollments = [e for e in data.get('enrollments', []) if str(e.get('student_id')) == student_id and e.get('status') == 'approved']
        enrolled_course_ids = [e.get('course_id') for e in enrollments]
        course_map = {c['id']: c for c in data.get('course_units', [])}
        
        tasks = []
        all_upcoming = []
        today = datetime.now()
        
        # Process assignments
        for assignment in data.get('assignments', []):
            if assignment.get('course_id') not in enrolled_course_ids:
                continue
            due_date = assignment.get('due_date')
            if not due_date:
                continue
            try:
                due_dt = datetime.fromisoformat(str(due_date).replace('Z', '+00:00').replace('+00:00', ''))
                days_left = (due_dt - today).days
                if days_left < 0 or days_left > 21:
                    continue
            except:
                continue
            
            task = {**assignment, 'type': 'assignment'}
            all_upcoming.append(task)
            
            estimated_hours = self.predict_effort_hours(task, student_features, all_upcoming)
            on_time_prob = self.predict_on_time_probability(task, student_features, all_upcoming)
            priority_score = self.calculate_ml_priority(task, student_features, all_upcoming)
            
            course = course_map.get(assignment.get('course_id'), {})
            tasks.append({
                'id': f"assign_{assignment['id']}",
                'original_id': assignment['id'],
                'title': assignment.get('title', 'Assignment'),
                'course_id': assignment.get('course_id'),
                'course_title': course.get('name', 'Course'),
                'course_code': course.get('code', ''),
                'type': 'assignment',
                'due_date': due_date,
                'priority_score': priority_score,
                'estimated_hours': estimated_hours,
                'on_time_prob': on_time_prob,
                'points': assignment.get('total_points', 100)
            })
        
        # Process quizzes
        for quiz in data.get('quizzes', []):
            if quiz.get('course_id') not in enrolled_course_ids:
                continue
            end_date = quiz.get('end_date') or quiz.get('start_date')
            if not end_date:
                continue
            try:
                end_dt = datetime.fromisoformat(str(end_date).replace('Z', '+00:00').replace('+00:00', ''))
                days_left = (end_dt - today).days
                if days_left < 0 or days_left > 14:
                    continue
            except:
                continue
            
            task = {**quiz, 'type': 'quiz', 'due_date': end_date, 'total_points': quiz.get('total_points', 50)}
            all_upcoming.append(task)
            
            estimated_hours = self.predict_effort_hours(task, student_features, all_upcoming)
            on_time_prob = self.predict_on_time_probability(task, student_features, all_upcoming)
            priority_score = self.calculate_ml_priority(task, student_features, all_upcoming) * 0.95
            
            course = course_map.get(quiz.get('course_id'), {})
            tasks.append({
                'id': f"quiz_{quiz['id']}",
                'original_id': quiz['id'],
                'title': f"{quiz.get('title', 'Quiz')} - Prep",
                'course_id': quiz.get('course_id'),
                'course_title': course.get('name', 'Course'),
                'course_code': course.get('code', ''),
                'type': 'quiz_prep',
                'due_date': end_date,
                'priority_score': priority_score,
                'estimated_hours': estimated_hours,
                'on_time_prob': on_time_prob,
                'points': quiz.get('total_points', 50)
            })
        
        tasks.sort(key=lambda x: x['priority_score'], reverse=True)
        schedule = self.generate_schedule(tasks, data.get('available_hours_per_day', 4))
        
        total_hours = sum(t['estimated_hours'] for t in tasks)
        avg_completion_prob = np.mean([t['on_time_prob'] for t in tasks]) if tasks else 0.9
        
        recommendations = []
        at_risk = [t for t in tasks if t['on_time_prob'] < 0.6]
        if at_risk:
            recommendations.append(f"{len(at_risk)} task(s) at risk of being late - prioritize them first")
        if student_features['workload_pressure_7d'] > 0.7:
            recommendations.append("High workload this week - consider starting early")
        struggling_courses = [cid for cid, gpa in student_features['course_gpas'].items() if gpa < 2.5]
        if struggling_courses:
            recommendations.append("Extra focus needed on courses where you're struggling")
        if not recommendations:
            recommendations.append("You're on track - maintain consistent study habits")
        
        return {
            "student_id": student_id,
            "generated_at": datetime.now().isoformat(),
            "plan_date": today.strftime("%Y-%m-%d"),
            "ml_model_version": "1.0",
            "models_trained": self.models_trained,
            "tasks": tasks,
            "schedule": schedule,
            "total_study_hours": round(total_hours, 1),
            "completion_probability": round(avg_completion_prob, 3),
            "recommendations": recommendations,
            "insights": {
                "courses_with_deadlines": len(set(t['course_id'] for t in tasks)),
                "high_priority_count": len([t for t in tasks if t['priority_score'] > 7]),
                "at_risk_count": len(at_risk),
                "avg_priority": round(np.mean([t['priority_score'] for t in tasks]), 1) if tasks else 0,
                "workload_pressure": round(student_features['workload_pressure_7d'], 2),
                "on_time_rate_historical": round(student_features['on_time_rate'], 2)
            },
            "student_profile": {
                "avg_grade_point": round(student_features['avg_grade_point'], 2),
                "on_time_rate": round(student_features['on_time_rate'], 2)
            }
        }

# Global instance
study_plan_ml = StudyPlanMLService()

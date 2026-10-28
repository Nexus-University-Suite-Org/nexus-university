"""
Study Plan API Router
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

from app.services.study_plan_ml import study_plan_ml

log = logging.getLogger(__name__)

router = APIRouter()

class GeneratePlanRequest(BaseModel):
    student_id: str
    assignments: List[Dict[str, Any]] = []
    quizzes: List[Dict[str, Any]] = []
    submissions: List[Dict[str, Any]] = []
    grades: List[Dict[str, Any]] = []
    course_units: List[Dict[str, Any]] = []
    enrollments: List[Dict[str, Any]] = []
    quiz_attempts: List[Dict[str, Any]] = []
    profiles: List[Dict[str, Any]] = []
    available_hours_per_day: int = 4
    study_days: List[str] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    preferred_start_time: str = "09:00"

class TrainRequest(BaseModel):
    submissions: List[Dict[str, Any]] = []
    grades: List[Dict[str, Any]] = []
    assignments: List[Dict[str, Any]] = []
    quiz_attempts: List[Dict[str, Any]] = []

class FeedbackRequest(BaseModel):
    student_id: str
    task_id: str
    completed: bool
    actual_hours: Optional[float] = None
    rating: Optional[int] = None

@router.post("/study-plan/generate")
async def generate_study_plan(req: GeneratePlanRequest):
    """Generate ML-powered study plan using real student data"""
    try:
        log.info(f"Generating study plan for student {req.student_id}")
        plan = study_plan_ml.generate_plan(req.dict())
        return plan
    except Exception as e:
        log.error(f"Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/study-plan/train")
async def train_study_plan_models(req: TrainRequest):
    """Train ML models on historical student data"""
    try:
        log.info("Training study plan models")
        result = study_plan_ml.train_models(req.dict())
        return result
    except Exception as e:
        log.error(f"Error training models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/study-plan/health")
async def study_plan_health():
    return {
        "status": "ok",
        "models_trained": study_plan_ml.models_trained,
        "model_dir": str(study_plan_ml.MODEL_DIR)
    }

@router.post("/study-plan/feedback")
async def record_feedback(feedback: FeedbackRequest):
    """Record plan adherence for continuous learning"""
    try:
        # Store feedback for future training (simple file-based for now)
        feedback_data = feedback.dict()
        feedback_file = "models/study_plan/feedback.jsonl"
        os.makedirs("models/study_plan", exist_ok=True)
        import os
        with open(feedback_file, "a") as f:
            import json
            f.write(json.dumps(feedback_data) + "\n")
        return {"status": "recorded"}
    except Exception as e:
        log.error(f"Error recording feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

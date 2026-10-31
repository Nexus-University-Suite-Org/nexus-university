import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Clock, Calendar, Target, AlertCircle, CheckCircle, Play, Pause, RotateCcw, Sparkles, TrendingUp, BookOpen } from 'lucide-react';
import { getMessagingBackend } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MLTask {
  id: string;
  original_id: string;
  title: string;
  course_id: string;
  course_title: string;
  course_code: string;
  type: string;
  due_date: string;
  priority_score: number;
  estimated_hours: number;
  on_time_prob: number;
  points: number;
}

interface MLSchedule {
  task_id: string;
  suggested_start: string;
  suggested_duration_minutes: number;
  reason: string;
  course_code: string;
  title: string;
}

interface MLPlan {
  student_id: string;
  generated_at: string;
  plan_date: string;
  ml_model_version: string;
  models_trained: boolean;
  tasks: MLTask[];
  schedule: MLSchedule[];
  total_study_hours: number;
  completion_probability: number;
  recommendations: string[];
  insights: any;
  student_profile: any;
}

const SmartStudyPlan: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<MLPlan | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentTask, setCurrentTask] = useState<MLTask | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchMLStudyPlan();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setSessionTime((prev) => prev + 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      toast.success('Study session completed!');
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const fetchMLStudyPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get student profile
      const profiles = await getMessagingBackend<any[]>('/api/profiles/');
      const studentProfile = profiles.find((p: any) => p.email === user?.email);
      
      if (!studentProfile) {
        setError('Student profile not found');
        setLoading(false);
        return;
      }

      const messengerStudentId = studentProfile.id;
      
      // Fetch all required data
      const [students, enrollments, courseUnits, assignments, quizzes, submissions, grades, quizAttempts] = await Promise.all([
        getMessagingBackend<any[]>('/api/students/'),
        getMessagingBackend<any[]>('/api/enrollments/'),
        getMessagingBackend<any[]>('/api/course-units/'),
        getMessagingBackend<any[]>('/api/assignments/'),
        getMessagingBackend<any[]>('/api/quizzes/'),
        getMessagingBackend<any[]>(`/api/submissions/?student_id=${messengerStudentId}`),
        getMessagingBackend<any[]>(`/api/student-grades/?student_id=${messengerStudentId}`),
        getMessagingBackend<any[]>(`/api/quiz-attempts/?student_id=${messengerStudentId}`)
      ]);

      // Find actual student record
      const student = students.find((s: any) => s.user_id === user?.id || s.email === user?.email);
      const studentId = student?.id || messengerStudentId;

      // Call ML service
      const response = await fetch(`${ML_SERVICE_URL}/api/study-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          assignments,
          quizzes,
          submissions,
          grades,
          course_units: courseUnits,
          enrollments,
          quiz_attempts: quizAttempts,
          profiles,
          available_hours_per_day: 4
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate ML study plan');
      }

      const mlPlan = await response.json();
      setPlan(mlPlan);
      toast.success('ML-powered study plan generated!');
    } catch (err: any) {
      console.error('Error fetching study plan:', err);
      setError(err.message || 'Failed to generate study plan');
      toast.error('Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (task: MLTask) => {
    setCurrentTask(task);
    setTimeLeft(task.estimated_hours * 60 * 60);
    setSessionTime(0);
    setTimerActive(true);
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    if (currentTask) {
      setTimeLeft(currentTask.estimated_hours * 60 * 60);
    } else {
      setTimeLeft(25 * 60);
    }
    setTimerActive(false);
    setSessionTime(0);
  };

  const getPriorityColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800';
    if (score >= 6) return 'bg-orange-100 text-orange-800';
    if (score >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRiskColor = (prob: number) => {
    if (prob < 0.6) return 'text-red-600';
    if (prob < 0.75) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-600" />
            <p className="text-lg font-semibold">Generating ML-powered study plan...</p>
            <p className="text-sm text-gray-600 mt-2">Analyzing your academic history with machine learning</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-semibold mb-2">Failed to generate study plan</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchMLStudyPlan}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Smart Study Plan
            <Badge className="ml-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Sparkles className="h-3 w-3 mr-1" />
              ML-Powered
            </Badge>
          </h1>
          <p className="text-gray-600 mt-1">AI-optimized schedule based on your academic performance history</p>
        </div>
        <Button onClick={fetchMLStudyPlan} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Regenerate Plan
        </Button>
      </div>

      {/* Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Study Hours</p>
                <p className="text-2xl font-bold">{plan.total_study_hours}h</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Time Success Rate</p>
                <p className="text-2xl font-bold">{(plan.completion_probability * 100).toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority Tasks</p>
                <p className="text-2xl font-bold">{plan.insights.high_priority_count}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At-Risk Tasks</p>
                <p className="text-2xl font-bold text-red-600">{plan.insights.at_risk_count}</p>
              </div>
              <Target className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ML Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {plan.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <p className="text-sm">{rec}</p>
              </div>
            ))}
          </div>
          {plan.models_trained && (
            <p className="text-xs text-gray-500 mt-3">
              ✨ Using trained ML models on your historical academic data
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prioritized Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Prioritized Study Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.tasks.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No upcoming tasks in the next 21 days</p>
            ) : (
              plan.tasks.map((task, idx) => (
                <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-500">#{idx + 1}</span>
                        <h4 className="font-semibold">{task.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {task.course_code} - {task.course_title}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(task.priority_score)}>
                      Priority {task.priority_score.toFixed(1)}/10
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">Due</p>
                      <p className="font-medium">{new Date(task.due_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Est. Time</p>
                      <p className="font-medium">{task.estimated_hours}h</p>
                    </div>
                    <div>
                      <p className="text-gray-500">On-Time Prob.</p>
                      <p className={`font-medium ${getRiskColor(task.on_time_prob)}`}>
                        {(task.on_time_prob * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="mt-3 w-full" 
                    onClick={() => startTimer(task)}
                    disabled={timerActive}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Study Session
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Study Timer & Schedule */}
        <div className="space-y-6">
          {/* Focus Timer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Focus Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {currentTask && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-sm">{currentTask.title}</p>
                  <p className="text-xs text-gray-600">{currentTask.course_code}</p>
                </div>
              )}
              <div className="text-5xl font-bold mb-6 font-mono">
                {formatTime(timeLeft)}
              </div>
              <div className="flex gap-2 justify-center mb-4">
                <Button onClick={toggleTimer}>
                  {timerActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {timerActive ? 'Pause' : 'Start'}
                </Button>
                <Button onClick={resetTimer} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Session time: {Math.floor(sessionTime / 60)}m {sessionTime % 60}s
              </div>
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Optimized Daily Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.schedule.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No schedule generated</p>
              ) : (
                plan.schedule.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="text-center min-w-[60px]">
                      <p className="font-semibold">{item.suggested_start}</p>
                      <p className="text-xs text-gray-500">{item.suggested_duration_minutes}min</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.course_code}</p>
                      <p className="text-xs text-blue-600 mt-1">{item.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Model Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span className="font-semibold">ML Model Info</span>
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>Version: {plan.ml_model_version}</span>
              <span>Status: {plan.models_trained ? 'Trained on Historical Data' : 'Heuristic Fallback'}</span>
              <span>Generated: {new Date(plan.generated_at).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartStudyPlan;

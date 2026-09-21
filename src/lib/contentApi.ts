import { getBackend, postBackend } from "@/lib/backendApi";
import type { ContentItem, CourseUnit } from "@/types/course";

export async function fetchEnrolledCourses(studentId: string): Promise<CourseUnit[]> {
  return getBackend<CourseUnit[]>(`/api/v1/students/${encodeURIComponent(studentId)}/courses`, true);
}

export async function fetchAllUnits(): Promise<CourseUnit[]> {
  return getBackend<CourseUnit[]>("/api/v1/courses/units", true);
}

export async function fetchUnit(unitId: string | number): Promise<CourseUnit> {
  return getBackend<CourseUnit>(`/api/v1/courses/units/${unitId}`, true);
}

export async function fetchUnitContent(unitId: string | number): Promise<ContentItem[]> {
  return getBackend<ContentItem[]>(`/api/v1/courses/units/${unitId}/content`, true);
}

export async function enrollInUnit(studentId: string, courseUnitId: number): Promise<CourseUnit> {
  return postBackend<CourseUnit>(
    `/api/v1/students/${encodeURIComponent(studentId)}/enrollments`,
    { courseUnitId },
    true,
  );
}
export type ContentType = "FILE" | "PAGE" | "URL" | "BOOK" | "LABEL";

export interface CourseUnit {
  id: number;
  code: string;
  name: string;
  courseCode: string;
  courseName: string;
  semester: number | null;
  year: number | null;
  credits: number | null;
  description: string | null;
}

export interface ContentItem {
  id: number;
  courseUnitId: number;
  section: string;
  title: string;
  type: ContentType;
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  displayOrder: number;
}
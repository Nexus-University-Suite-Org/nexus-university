import { getBackend } from "@/lib/backendApi";
import type { ContentItem, CourseUnit } from "@/types/course";

export interface PlatformStats {
  courseUnits: number | null;
  learningResources: number | null;
  programmes: number | null;
}

const EMPTY: PlatformStats = {
  courseUnits: null,
  learningResources: null,
  programmes: null,
};

/**
 * Derives public, verifiable counts from the live catalogue API.
 *
 * Every field is nullable on purpose: when the backend is unreachable the
 * landing page renders an em dash rather than an invented number. The counts
 * are aggregated from real records, so they stay honest as the catalogue grows.
 */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const units = await getBackend<CourseUnit[]>("/api/v1/courses/units");

    if (!Array.isArray(units) || units.length === 0) {
      return EMPTY;
    }

    const content = await Promise.all(
      units.map((unit) =>
        getBackend<ContentItem[]>(
          `/api/v1/courses/units/${unit.id}/content`,
        ).catch(() => [] as ContentItem[]),
      ),
    );

    const programmes = new Set(
      units.map((unit) => unit.courseCode).filter(Boolean),
    );

    return {
      courseUnits: units.length,
      learningResources: content.reduce(
        (total, items) => total + items.length,
        0,
      ),
      programmes: programmes.size,
    };
  } catch {
    return EMPTY;
  }
}

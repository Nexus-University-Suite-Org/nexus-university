# Nexus University Platform
## System Analysis, Modular Monolith Architecture & Commercial Product Plan

**Document version:** 3.0 — August 2026 (updated with registrar-hub repository analysis)
**Target stack:** Java 21 · Spring Boot 3.3+ · Spring Modulith · PostgreSQL 16 · Flyway
**Team:** 4 backend engineers, frontend complete
**Business goal:** MVP → sellable multi-tenant product for educational institutions

---

# SECTION A — CURRENT SYSTEM ANALYSIS

## A1. Repository Inventory

```
Nexusfull_view/
├── Nexus-Application-Portal/        REPO 1: Public institutional website
│   ├── src/                         React/Vite frontend (Firebase Firestore for content)
│   ├── otp_service.py               Standalone Python OTP microservice (port 5055)
│   └── supabase/                    Partial Supabase setup (mostly unused)
│
└── nexus-university/                REPO 2: The LMS
    ├── backend/                     Django/DRF REST API (port 8000) — THE MAIN BACKEND
    ├── src/                         React/Vite frontend (student + lecturer + registrar portals)
    └── registrar-hub/               (empty placeholder in the original folder)

registrar-hub/                       REPO 3: Standalone Registrar application (delivered separately)
    └── src/                         React/Vite frontend — NO backend of its own;
                                     calls the same Django API on port 8000
```

**Finding on Repo 3:** `registrar-hub` is a complete, standalone registrar frontend (~10,300 lines across 16 pages). It has no backend — every call goes to the same Django API. This confirms the platform's actual shape: **one backend, three frontend applications** (public portal, LMS, registrar hub). There is also a partial duplicate: the nexus-university frontend contains its own `Registrar*.tsx` pages hitting the same endpoints. The teams should decide which registrar UI survives — recommendation: keep `registrar-hub` as the dedicated registrar application (it is more complete) and delete the duplicated registrar pages from the LMS frontend, so each portal has one owner and one purpose.

**Registrar Hub capabilities (all served by existing Django endpoints):**

| Page | Function | Notes for the new backend |
|------|----------|---------------------------|
| Students | Full CRUD on student profiles, status lifecycle (Active/Inactive/Graduated/Suspended), stats | Uses /profiles/?role=student |
| Lecturers | Full CRUD, status (Active/Inactive/Retired), assign course units | Uses /profiles/?role=lecturer + /sign-ups/ |
| Courses | Courses + course units CRUD, per-year fee structure entries | Fee entry: semester 1/2 tuition, recess, functional fees per academic year |
| Results | View/edit marks per student per term, auto-calculate grade+GP from marks, CGPA classification filters | Contains the official grading scale (captured in C6) |
| Transcripts | Generate transcript per student | Currently client-side HTML + window.print — must become server-side PDF |
| Reports | Enrollment analytics (by department/program/year/status), academic analytics (GPA distribution, top performers, at-risk students, department/program performance), CSV export | ~1,700 lines of aggregation running in the browser — must move server-side |
| Fees | Fee assignment CRUD | /fee-assignments/ |
| Calendar | Academic events CRUD | /academic-calendar/ |
| Notifications | List, mark-read, mark-all-read | /notifications/ |
| Settings | Branding (site name, logo, colors) | Hook exists with TODO stubs — confirms tenant branding API is required |
| Auth | Registrar login + self-signup + password-reset OTP | Two defects: see A5 items 10–12 |

## A2. What the System Is

A complete University Management System (UMS) with four functional surfaces on one backend:

| Surface | Users | Capabilities |
|---------|-------|-------------|
| Public Portal | Prospective students, donors, public | Programs catalog, news, gallery, FAQs, applications, donations, contact |
| Student Portal | Enrolled students | Dashboard, results/GPA, assignments, quizzes, timetable, fees, webmail, ID card |
| Lecturer Portal | Teaching staff | Assignments, quizzes, grading, classrooms, live sessions, announcements, gradebook |
| Registrar Portal | Administration | Student records, enrollments, programs, course units, fee structures, transcripts, reports, lecturer assignments, audit log |

## A3. Complete Domain Model (25 entities in current Django backend)

### Identity & Access
| Entity | Purpose | Key fields |
|--------|---------|-----------|
| StudentRecord | Pre-loaded official student registry; gateway to signup | registration_number + student_number (unique together), email, programme, college, year, blood_type |
| OtpVerification | Email OTP for signup | otp_hash (SHA-256 of email\|otp\|nonce\|secret), 4-digit, 10 min TTL, 5 max attempts, 5/hour rate limit |
| Profile | Student/lecturer extended profile | role, student_number, lecturer_number, assigned_course_units (JSON) |
| Registrar | Registrar staff profile | user_id, employee_id, department, college |
| UserSettings | Per-user preferences | theme, notifications, privacy_level, language (en/sw), 2FA flag |

### Academic Structure
| Entity | Purpose | Key fields |
|--------|---------|-----------|
| Program | Institution's academic programs | title, code, department, status (running/closed/archived) |
| Course | Degree program / course of study | code, name, college, department, duration_years, fee_structure (JSON) |
| CourseUnit | Module within a course | FK→Course, code, name, semester, year, credits |
| AcademicEvent | Calendar events | title, date, due_date, type, is_active |
| Schedule | Weekly timetable slot | course_id, day_of_week, start/end_time, room, building |

### Teaching & Assessment
| Entity | Purpose | Key fields |
|--------|---------|-----------|
| Assignment | Lecturer-created coursework | lecturer_id, course_id, due_date, total_points, instruction_document_url, status |
| Submission | Student submission of assignment | assignment_id + student_id (unique together), status, score, feedback |
| Quiz | Timed MCQ quiz | time_limit_minutes, max_attempts, passing_score, show_answers, status (draft/active/closed), start/end dates |
| QuizQuestion | MCQ question | FK→Quiz, question, options (JSON array), correct_answer (index), points, explanation |
| QuizAttempt | Scored attempt | FK→Quiz, student_id, answers (JSON), score, time_taken |
| LiveSession | Scheduled online class | course_id, scheduled_at, duration, meet_link |
| Classroom | Virtual classroom | name, join_code (unique), instructor_id |
| ClassroomEnrollment | Membership | FK→Classroom + student_id (unique together), role |
| SignUp | Lecturer↔CourseUnit assignment by registrar | lecturer_id, course_unit_id, assigned_by |

### Records & Finance
| Entity | Purpose | Key fields |
|--------|---------|-----------|
| Enrollment | Student enrolled in course/unit | student_id, course_id, status (approved/pending/completed/cancelled), grade |
| ExamResult | Full mark breakdown per course per term | assignment1, assignment2, midterm, participation, final_exam, marks, grade, grade_point, remark |
| StudentGrade | Term summary | total, grade, gp per course per term |
| FeeAssignment | Fee structure item | item_name, category, year_level, semester, amount, currency (UGX), college |
| StudentFee | Student's fee record | amount, paid_amount, due_date, semester |

### Communication
| Entity | Purpose | Key fields |
|--------|---------|-----------|
| Message | Internal webmail | from/to user, subject, body, is_read/starred/archived, per-side soft delete, attachment |
| MessageDraft | Saved draft | user_id, partial fields |
| Announcement | Course/system announcement | course_id, author_id, priority (high/normal/low) |
| Notification | System notification | user_id, type, title, related_id, link, is_read |
| Activity | Audit trail | action, entity, entity_id, user, timestamp |

### Content (currently in Firebase Firestore — Repo 1)
news, events, gallery, courses (catalog), faqs, faculty, partners, student_stories, programs (catalog), research_opportunities, alumni, scholarships, legal_pages, quick_links, contact_submissions

## A4. Complete API Surface (65 endpoints in current Django backend)

```
AUTH        health, validate-student-record, send-signup-otp, verify-signup-otp,
            signup, login, logout, me, reset-password
STUDENTS    list, profile, settings (GET/POST), results, results/exams,
            results/quizzes, dashboard (large aggregate)
COURSES     courses CRUD, course-units CRUD, programs, academic-calendar
ASSESSMENT  assignments CRUD + update, submissions list + grade,
            quizzes CRUD + detail + submit (auto-scored)
REGISTRAR   profiles CRUD, profiles/by-user, registrars CRUD, fee-assignments CRUD,
            academic-events CRUD, student-grades, activities, sign-ups CRUD
MESSAGING   messages (inbox/sent/starred/archived + search), detail, send, action
            (star/archive/delete/read), drafts CRUD
NOTIFY      notifications list/create, mark-read, mark-all-read
CLASSROOM   classrooms CRUD, enroll, join (by code), live-sessions, enrollments
FINANCE     student-fees, schedules, lecturer/summary
```

## A5. Critical Defects in the Current Backend (must not carry over)

1. **Zero authorization.** Every view declares `authentication_classes = []` and `permission_classes = []`. The entire API is publicly accessible — any anonymous caller can read any student's grades, delete assignments, or grade submissions. This is the single most important fix.
2. **Role inferred from email domain.** `@lecturer.com` → lecturer, `@registrar.com` → registrar. Anyone registering with such an email obtains that role. Roles must be stored explicitly and assigned through controlled flows.
3. **String foreign keys.** `student_id`, `course_id`, `lecturer_id` are CharFields with no referential integrity. All relations become proper FK constraints.
4. **JSON blobs for structured data.** Quiz options and fee structures live in JSON columns; they become proper tables.
5. **SQLite in production path.** Replaced by PostgreSQL from day one.
6. **Two competing OTP systems.** Django's internal OTP and the standalone Python `otp_service.py`. Consolidated into one module.
7. **Content on Firebase Firestore.** The public portal's content (news, gallery, FAQs…) lives in Google's Firestore, creating a second data platform, a vendor dependency, and no single source of truth. All content moves into PostgreSQL behind the same API.
8. **No pagination anywhere.** Every list endpoint returns the full table. All list endpoints become paginated.
9. **God-view dashboard.** `StudentDashboardView` performs ~8 unindexed query groups with N+1 patterns. Becomes a service-layer aggregation over indexed queries.
10. **Registrar self-signup.** Registrar Hub's Auth page lets anyone create a registrar account by POSTing to `/registrars/` — combined with defect 1 (no auth), any visitor can become an administrator. In the new system, REGISTRAR accounts are created only by an existing REGISTRAR/ADMIN or during tenant provisioning.
11. **Phantom endpoint.** Registrar Hub calls `/auth/send-reset-otp/` for password-reset OTP — this endpoint does not exist in the Django backend; the flow silently fails. The new identity module implements password-reset OTP properly (same OTP machinery as signup, purpose=RESET).
12. **Analytics computed in the browser.** Registrar Hub's Reports page downloads entire tables (all profiles, all grades, all courses) and aggregates them client-side. This leaks full datasets to the client, cannot paginate, and will collapse at scale. All report aggregation moves into the `reporting` module as SQL/service-layer queries returning computed results only.

---

# SECTION B — ARCHITECTURE DECISION

## B1. Repository Strategy: One Monorepo

The current three-repo split exists by accident, not by design. The new structure is a single monorepo:

```
nexus-platform/
├── backend/                         Spring Boot modular monolith (one deployable)
├── frontend-portal/                 Public website (from Nexus-Application-Portal)
├── frontend-university/             Student + Lecturer LMS (from nexus-university, registrar pages removed)
├── frontend-registrar/              Registrar application (from registrar-hub)
├── docs/                            Architecture decision records, API docs, runbooks
├── infra/                           Docker Compose, deployment configs, CI/CD
└── README.md
```

**Why monorepo, concretely:**
- One backend serves three frontends. Splitting the backend's consumers across repos guarantees version drift between API and clients.
- Atomic changes: an API change and all frontend adaptations land in one pull request, reviewed together.
- One CI pipeline, one issue tracker, one place a new engineer clones.
- The team is 6–7 people. Multi-repo coordination overhead is a cost paid for organizational scale you do not have. Google, Meta, and Shopify run monorepos at thousands of engineers; at your size the question is not even close.

**When to split later:** if you ever sell the frontend as a separately versioned white-label product, extract `frontend-portal` then. The git history moves with it. Never pre-split.

## B2. Backend Architecture: Modular Monolith with Spring Modulith

This is the correct call, and the industry agrees. <cite index="3-1">In 2019 you justified not doing microservices; in 2026 you justify doing them — microservices are now framed as a specialized tool for large organizations with autonomous teams, and the modular monolith is the default starting point</cite>. <cite index="1-1">42% of organizations that adopted microservices have consolidated services back into larger deployable units</cite>, and <cite index="1-1">Shopify processed a peak of 30TB/minute during Black Friday 2025 on a modular monolith</cite>.

**The tool:** Spring Modulith — Spring's official framework for this pattern. <cite index="4-1">It enforces module boundaries at development time, provides event-driven communication between modules, and generates architectural documentation automatically</cite>. <cite index="2-1">Packages are modules, `internal` sub-packages are encapsulated, structure tests detect violations automatically, and each module can be tested in isolation with @ApplicationModuleTest</cite>.

**Version guidance:** <cite index="8-1">Spring Modulith 2.0.x targets Spring Boot 4; on Spring Boot 3.5 use 1.4.x — the API is nearly identical</cite>. Start on Spring Boot 3.3/3.5 + Modulith 1.4.x (mature, stable, most documentation targets it); upgrading to Boot 4 + Modulith 2.0 later is a version bump, not a rewrite.

**Why this beats both alternatives:**

| | Big-ball monolith | Modular monolith (chosen) | Microservices |
|---|---|---|---|
| Deploy complexity | 1 unit | 1 unit | N services + gateway + discovery + tracing |
| Team of 4 can run it | yes but degrades | **yes, sustainably** | no — operational burden eats the team |
| Enforced boundaries | none | **compile/test-time enforced** | network-enforced |
| Refactor cost | grows forever | low | very high (cross-service changes) |
| Path to scale-out | rewrite | **extract module → service when a metric demands it** | already there, paid upfront |
| Transactions | trivial | trivial within module, events across | distributed saga pain |

**Communication rule between modules** (this is the discipline that makes it work): <cite index="3-1">events for side effects, direct calls for queries and tight transactional invariants</cite>. Example: when `assessment` grades a submission, it publishes `SubmissionGradedEvent`; the `notification` module listens and notifies the student. `assessment` never imports `notification` classes.

## B3. Commercial Architecture: Multi-Tenancy from Day One

You are building a product to sell to institutions, not a bespoke system for one school. That decision changes the data model **now** — retrofitting multi-tenancy is one of the most expensive migrations in software.

**Chosen strategy: shared database, shared schema, tenant discriminator column.**

Every tenant-owned table carries `tenant_id BIGINT NOT NULL REFERENCES tenant(id)`, and every query is automatically filtered by the current tenant via a Hibernate filter — application code never writes `WHERE tenant_id = ?` by hand.

| Strategy | Cost per tenant | Isolation | Ops burden | Verdict |
|---|---|---|---|---|
| **Shared schema + tenant_id** | near zero | logical (enforced by Hibernate filter + tests) | one database to run | **chosen — right for MVP through first ~50 institutions** |
| Schema per tenant | low | strong | migrations × N schemas | offer later as "Enterprise dedicated schema" upsell |
| Database per tenant | high | strongest | full ops per tenant | only if a government/enterprise contract demands it |

The `tenant` table also carries the institution's branding (name, logo_url, primary_color, domain) so each customer's portals render with their identity — the frontend already has a `SiteBrandingTab`, confirming this was anticipated.

**Implementation core (every engineer must understand this):**

```java
// 1. Resolve tenant per request (from subdomain or X-Tenant-ID header)
public class TenantContext {
    private static final ThreadLocal<Long> CURRENT = new ThreadLocal<>();
    public static void set(Long tenantId) { CURRENT.set(tenantId); }
    public static Long get() { return CURRENT.get(); }
    public static void clear() { CURRENT.remove(); }
}

// 2. Base class for all tenant-owned entities
@MappedSuperclass
@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = Long.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public abstract class TenantAwareEntity {
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private Long tenantId;

    @PrePersist
    void applyTenant() { this.tenantId = TenantContext.get(); }
}

// 3. Enable the filter on every Hibernate session (via an interceptor/aspect)
session.enableFilter("tenantFilter").setParameter("tenantId", TenantContext.get());
```

A dedicated architecture test asserts every `@Entity` except platform-level ones (`Tenant`, `PlatformAdmin`) extends `TenantAwareEntity`. Cross-tenant data leakage is the one bug class that kills a B2B product; it gets automated defense, not code-review hope.

## B4. Licensing & Editions: How the Code Handles What You Sell

Editions are **feature flags resolved per tenant**, not separate builds. One codebase, one deployable, entitlements decide what each customer's instance exposes.

```java
public enum Feature {
    // CORE (every edition)
    STUDENT_PORTAL, RESULTS_GPA, COURSE_MANAGEMENT, ANNOUNCEMENTS, ACADEMIC_CALENDAR,
    // STANDARD
    ASSESSMENT_ENGINE,      // assignments + quizzes + auto-grading
    MESSAGING,              // internal webmail
    FEE_MANAGEMENT,         // fee structures + student fees
    LIVE_SESSIONS,          // classroom + meet links
    // PREMIUM
    TRANSCRIPT_GENERATION,  // PDF transcripts + reports
    PUBLIC_CMS,             // public website content management
    AUDIT_LOG,              // full activity trail
    ANALYTICS_DASHBOARD,    // registrar analytics
    // ENTERPRISE
    API_ACCESS,             // external API keys for integration
    CUSTOM_BRANDING,        // white-label theming
    SSO,                    // SAML/OIDC (future)
    DEDICATED_SCHEMA        // isolation upsell (future)
}

@Entity
public class TenantEntitlement {   // which features a tenant has, with expiry
    private Long tenantId;
    private Feature feature;
    private LocalDate validUntil;
}
```

Enforcement is one annotation on controllers, backed by an aspect:

```java
@RequiresFeature(Feature.TRANSCRIPT_GENERATION)
@GetMapping("/api/v1/registrar/transcripts/{studentId}")
public TranscriptResponse getTranscript(...) { ... }
// Aspect returns 402 PAYMENT_REQUIRED with an upgrade message if the tenant lacks the feature.
```

**Suggested commercial packages** (map directly to the flags above — pricing is your call, structure is the engineering contract):

| Package | Target customer | Features | Modules involved |
|---|---|---|---|
| **Starter** | Small vocational institutes | Core set: student portal, results, courses, calendar, announcements | identity, academic, enrollment, records |
| **Standard** | Growing colleges | + assessments/quizzes, messaging, fees, live sessions | + assessment, messaging, finance, classroom |
| **Premium** | Established institutions | + transcripts/reports, public website CMS, audit, analytics | + reporting, content, audit |
| **Enterprise** | Universities, government | + API access, white-label branding, SSO, dedicated schema, SLA | + platform extensions |

This mapping is why module boundaries matter commercially: **each sellable capability is a module**. Sales conversations become "which modules do you want," and engineering effort maps 1:1 to revenue lines.

---

# SECTION C — BACKEND DESIGN

## C1. Module Layout (Spring Modulith)

Package-by-business-capability, not package-by-layer. <cite index="7-1">The typical config/entities/services/web layout organized by technical layer causes the coupling problems this architecture exists to prevent</cite>. Each top-level package below is a Modulith module; its `internal` package is invisible to other modules; its root package classes and `api` events are its public surface.

```
com.nexus.platform/
├── NexusApplication.java
│
├── shared/                          # Allowed dependency for all modules
│   ├── tenancy/                     # TenantContext, TenantAwareEntity, tenant filter
│   ├── security/                    # JWT provider/filter, CustomUserDetails, @CurrentUser
│   ├── entitlement/                 # Feature enum, @RequiresFeature aspect
│   ├── exception/                   # Global handler, typed exceptions (404/401/403/409/422/429)
│   ├── event/                       # Base domain event types
│   └── util/                        # GpaCalculator, JoinCodeGenerator, OtpHashUtil
│
├── tenant/                          # MODULE: tenant lifecycle (the "sell a customer" module)
│   ├── TenantService.java           # provision tenant, branding, entitlements
│   ├── api/ TenantProvisionedEvent
│   └── internal/ Tenant, TenantEntitlement, TenantBranding, repos, admin controller
│
├── identity/                        # MODULE: users, auth, OTP, roles, settings
│   ├── IdentityService.java         # public API for other modules (lookup user summaries)
│   ├── api/ UserRegisteredEvent, PasswordResetEvent
│   └── internal/
│       ├── User, Role(enum: STUDENT|LECTURER|REGISTRAR|ADMIN|PLATFORM_ADMIN)
│       ├── StudentRecord, OtpVerification, UserSettings
│       ├── AuthController, AuthService, OtpService
│       └── repositories, DTOs
│
├── academic/                        # MODULE: programs, courses, units, calendar, schedule
│   ├── AcademicService.java         # course/unit lookups for other modules
│   ├── api/ CourseUnitCreatedEvent
│   └── internal/ Program, Course, CourseUnit, AcademicEvent, Schedule,
│                 LecturerAssignment (was SignUp), controllers, services, repos
│
├── enrollment/                      # MODULE: who studies what
│   ├── EnrollmentService.java       # "is student X enrolled in unit Y" for other modules
│   ├── api/ StudentEnrolledEvent
│   └── internal/ Enrollment, controllers, services, repos
│
├── assessment/                      # MODULE: assignments, submissions, quizzes  [SELLABLE: Standard]
│   ├── api/ SubmissionGradedEvent, QuizCompletedEvent, AssignmentCreatedEvent
│   └── internal/ Assignment, Submission, Quiz, QuizQuestion, QuizOption,
│                 QuizAttempt, auto-scoring service, controllers, repos
│
├── records/                         # MODULE: results, grades, GPA/CGPA  [core]
│   ├── RecordsService.java          # GPA data for dashboard
│   ├── api/ ResultPublishedEvent
│   └── internal/ ExamResult, StudentGrade, GPA aggregation, controllers, repos
│
├── finance/                         # MODULE: fee structures, student fees  [SELLABLE: Standard]
│   ├── api/ FeeAssignedEvent, PaymentRecordedEvent
│   └── internal/ FeeAssignment, StudentFee, controllers, services, repos
│
├── classroom/                       # MODULE: classrooms, live sessions  [SELLABLE: Standard]
│   ├── api/ SessionScheduledEvent
│   └── internal/ Classroom, ClassroomEnrollment, LiveSession, join-code logic
│
├── messaging/                       # MODULE: internal webmail  [SELLABLE: Standard]
│   └── internal/ Message, MessageDraft, inbox/sent/starred/archived logic
│
├── notification/                    # MODULE: notifications + announcements
│   ├── api/ (none — this module only consumes events)
│   └── internal/ Notification, Announcement, listeners for events from
│                 assessment/records/finance/classroom, controllers, repos
│
├── reporting/                       # MODULE: transcripts, PDF reports, analytics  [SELLABLE: Premium]
│   └── internal/ TranscriptGenerator (OpenPDF/JasperReports),
│                 EnrollmentReportService (by department/program/year/status),
│                 AcademicReportService (GPA distribution, top performers,
│                 at-risk students, department/program performance),
│                 CSV/PDF exporters — replaces Registrar Hub's browser-side analytics
│
├── content/                         # MODULE: public website CMS  [SELLABLE: Premium]
│   └── internal/ NewsArticle, GalleryItem, Faq, Partner, Scholarship,
│                 StudentStory, FacultyMember, Alumni, LegalPage, QuickLink,
│                 ContactSubmission, public + admin controllers
│
├── audit/                           # MODULE: activity trail  [SELLABLE: Premium]
│   └── internal/ AuditLog + listeners on all modules' events, query controller
│
├── dashboard/                       # MODULE: aggregation for student/lecturer/registrar dashboards
│   └── internal/ composes via other modules' public services (queries, not events)
│
└── storage/                         # MODULE: file uploads (avatars, assignment documents, logos)
    └── internal/ StorageService (local disk for MVP, S3-compatible interface),
                  upload controller — Registrar Hub already calls POST /upload/
```

**Boundary enforcement is automated, not aspirational:**

```java
@Test
void verifyModularStructure() {
    ApplicationModules.of(NexusApplication.class).verify();
}
// Fails the build if any module reaches into another module's internal package.
```

<cite index="1-1">Add Spring Modulith's Documenter to the build so architecture diagrams ship with every build</cite> — the module diagram in `docs/` regenerates itself and never goes stale.

## C2. Persistence & Migrations

- PostgreSQL 16, Flyway migrations, one migration folder per module (`db/migration/identity`, `db/migration/academic`, …) so a module's schema travels with the module.
- All IDs `BIGSERIAL`. All tenant-owned tables: `tenant_id BIGINT NOT NULL`, composite indexes lead with `tenant_id` (e.g. `(tenant_id, student_id)`, `(tenant_id, course_unit_id, due_date)`).
- Migration order: V1 tenant → V2 identity → V3 academic → V4 enrollment → V5 assessment → V6 records → V7 finance → V8 classroom → V9 messaging → V10 notification → V11 content → V12 audit → V13 indexes → V14 seed (roles, demo tenant).
- Quiz options move from JSON to a `quiz_option` table (id, question_id FK, option_text, display_order); `correct_option_index` stays on the question.
- Fee structure moves from JSON on Course to rows in `fee_assignment` (already exists as a model — the JSON field is simply dropped).

## C3. Security Design

**Authentication:** stateless JWT (access token 30–60 min + refresh token 14 days, refresh rotation). BCrypt password hashing. The 4-step student signup flow from the Django system is kept — it is genuinely good design:

```
1. POST /api/v1/auth/validate-student   reg_number + student_number + email → verify against StudentRecord
2. POST /api/v1/auth/otp/send           4-digit OTP, SHA-256(email|otp|nonce|secret), 10 min TTL,
                                        60s resend cooldown, 5/hour cap, email via JavaMailSender
3. POST /api/v1/auth/otp/verify         max 5 attempts per verification
4. POST /api/v1/auth/signup             create User(role=STUDENT, BCrypt), link StudentRecord, issue JWT
```

**Authorization — three layers, all mandatory:**

1. **Route rules** (SecurityFilterChain): public endpoints explicitly listed (`/api/v1/auth/**`, `GET /api/v1/content/**`, `GET /api/v1/programs`); everything else authenticated; role families per path prefix (`/api/v1/registrar/** → REGISTRAR`).
2. **Method rules**: `@PreAuthorize("hasRole('LECTURER')")` on write operations in assessment/classroom; `@RequiresFeature(...)` for entitlement gating.
3. **Ownership checks in services**: a student reads only their own dashboard/results/fees; a lecturer edits only their own assignments/quizzes; enforced in the service layer with the authenticated principal, never trusted from request parameters. The Django version trusted `?student_id=` query params — that pattern is banned.

**Roles:** stored on the `users` table, assigned only through controlled flows: STUDENT via the validated signup, LECTURER and REGISTRAR created by a REGISTRAR/ADMIN, PLATFORM_ADMIN (your company, cross-tenant) seeded and managed internally.

## C4. API Design

Versioned base path `/api/v1`. Consistent REST resource naming. Every list endpoint paginated (`Page<T>`, default size 20, max 100). Errors follow RFC 7807 problem+json via the global exception handler. Springdoc OpenAPI serves Swagger UI at `/swagger-ui.html` — this doubles as your sales-demo API documentation for Enterprise API access.

Representative surface (full mapping mirrors Section A4, one v1 route per legacy capability):

```
POST  /api/v1/auth/{validate-student|otp/send|otp/verify|signup|login|logout|reset-password}
GET   /api/v1/auth/me
GET   /api/v1/students/{id}/{dashboard|results|enrollments|fees}      [self or REGISTRAR]
PUT   /api/v1/students/{id}/settings                                  [self]
CRUD  /api/v1/courses, /api/v1/courses/{id}/units                     [read: authenticated; write: REGISTRAR]
CRUD  /api/v1/assignments        POST /api/v1/assignments/{id}/submit  [STUDENT]
GET   /api/v1/assignments/{id}/submissions  POST /api/v1/submissions/{id}/grade  [LECTURER]
CRUD  /api/v1/quizzes            POST /api/v1/quizzes/{id}/submit      [auto-scored]
CRUD  /api/v1/classrooms         POST /api/v1/classrooms/join
GET/POST /api/v1/messages?view=inbox|sent|starred|archived&search=
CRUD  /api/v1/registrar/{students|profiles|fee-assignments|academic-events|lecturer-assignments}
GET   /api/v1/registrar/transcripts/{studentId}                        [Premium, server-side PDF]
GET   /api/v1/registrar/reports/enrollment                             [Premium, aggregated server-side]
GET   /api/v1/registrar/reports/academic                               [Premium, aggregated server-side]
GET   /api/v1/registrar/reports/{type}/export?format=csv|pdf           [Premium]
POST  /api/v1/auth/reset-otp/send   POST /api/v1/auth/reset-otp/verify [fixes phantom endpoint]
POST  /api/v1/storage/upload                                            [authenticated]
CRUD  /api/v1/content/{news|gallery|faqs|partners|scholarships|...}    [read: public; write: ADMIN, Premium]
GET   /api/v1/activities                                               [REGISTRAR/ADMIN, Premium]
PLATFORM (your company only):
CRUD  /api/v1/platform/tenants   PUT /api/v1/platform/tenants/{id}/entitlements
```

## C5. Cross-Module Event Flows (the ones that matter)

```
assessment: SubmissionGradedEvent   → notification (notify student), audit (log)
assessment: QuizCompletedEvent      → records (optionally roll into grades), notification, audit
records:    ResultPublishedEvent    → notification (results available), audit
finance:    FeeAssignedEvent        → notification (fee due), audit
classroom:  SessionScheduledEvent   → notification (upcoming class), audit
identity:   UserRegisteredEvent     → notification (welcome), audit
tenant:     TenantProvisionedEvent  → identity (create first registrar account)
```

Use Modulith's `@ApplicationModuleListener` — <cite index="2-1">persisted events with a processing guarantee</cite>, so a crashed listener retries instead of silently losing a notification.

**Direct-call (query) dependencies — kept minimal and one-directional:**
`dashboard → {enrollment, assessment, records, classroom, academic}` (read-only composition), `assessment → enrollment` (verify student enrolled before accepting submission), `* → identity` (user summaries), `* → shared`.

## C6. Key Algorithms to Preserve

**Grading scale** (from Registrar Hub's Results page — this is the institution's official marks-to-grade conversion and belongs in the `records` module as the single authoritative implementation; per-tenant configurable scales become an Enterprise feature later):
```
marks ≥ 80 → A  (4.0)     65–69 → B  (3.0)     50–54 → C  (2.0)     35–39 → D  (1.0)
75–79     → A- (3.7)     60–64 → B- (2.7)     45–49 → C- (1.7)     < 35  → F  (0.0)
70–74     → B+ (3.3)     55–59 → C+ (2.3)     40–44 → D+ (1.3)
```

**CGPA classification** (used by Registrar Hub filters and transcripts):
```
CGPA ≥ 4.5 Excellent · 4.0–4.49 Very Good · 3.5–3.99 Good · 3.0–3.49 Satisfactory · < 3.0 Below
```

**GPA/CGPA** (from the Django dashboard, verified correct and consistent with Registrar Hub's client-side computation):
```
term GPA  = Σ(grade_point × credits) / Σ(credits)          per (academic_year, semester)
CGPA      = Σ(term_gpa × term_credits) / Σ(all credits)
```

**Quiz auto-scoring:** for each question, award `points` if the submitted option index equals `correct_option_index`; persist attempt with score, total, time_taken; enforce `max_attempts` and the active window (`start_date ≤ now ≤ end_date`) **server-side** — the Django version enforced attempts only in the UI.

**OTP hashing:** `SHA-256(email + "|" + otp + "|" + nonce + "|" + secret)` with a per-verification random nonce.

---

# SECTION D — TEAM & EXECUTION PLAN

## D1. Module Ownership (4 backend engineers)

Ownership means: writes the code, reviews all PRs touching the module, owns its migrations and tests. Everyone can read everything; the boundary tests keep coupling honest.

| Engineer | Owns | Rationale |
|---|---|---|
| **E1 (lead)** | shared, tenant, identity | Security and tenancy are the foundation; most senior person owns them |
| **E2** | academic, enrollment, records, dashboard | The academic core — one coherent data story |
| **E3** | assessment, classroom, reporting, storage | The teaching/learning engine and its outputs |
| **E4** | finance, messaging, notification, content, audit | The supporting services — mostly independent CRUD + listeners |

Weekly 30-minute architecture sync: review the auto-generated module diagram, any new cross-module dependency must be defended there.

## D2. Delivery Phases

**Phase 0 — Foundation (Week 1) — whole team together**
Repo scaffold, Spring Boot + Modulith + Flyway + PostgreSQL via Docker Compose, CI (build + `modulith:verify` + tests), shared package (tenancy, security skeleton, exceptions), tenant + identity migrations. Everyone pairs on this so the whole team internalizes the tenancy and security patterns before splitting up.

**Phase 1 — Auth + Academic Core (Weeks 2–3)**
E1: full auth flows (signup, OTP, login, JWT, refresh). E2: academic + enrollment modules. E3: assessment entities + assignment CRUD. E4: notification skeleton + settings.
*Milestone: student signs up, logs in, sees enrolled units.*

**Phase 2 — The Learning Loop (Weeks 4–5)**
E2: records + GPA + dashboard aggregation. E3: submissions, grading, quiz engine with auto-scoring. E4: messaging + notifications wired to events. E1: entitlement system + platform tenant admin.
*Milestone: full student ↔ lecturer academic workflow end-to-end.*

**Phase 3 — Registrar + Money (Weeks 6–7)**
E2: registrar student management, lecturer assignments. E3: classroom + live sessions, transcript PDF generation, server-side enrollment/academic reports (replacing Registrar Hub's browser aggregation), storage module. E4: finance module, audit module. E1: security hardening pass — pen-test checklist against every endpoint, registrar account creation locked to ADMIN flows, password-reset OTP implemented.
*Milestone: registrar runs the institution from Registrar Hub; this is the client demo build.*

**Phase 4 — Content + Frontend Cutover (Weeks 8–9)**
E4: content module (kills Firebase). E1: tenant branding endpoints (Registrar Hub's useBranding hook already has the client shape waiting — site name, logo, favicon, primary color). E2+E3: support frontend team switching all three React apps to the new API; remove the duplicated registrar pages from frontend-university; contract-test the DTOs against what the frontends actually consume.
*Milestone: all three frontends on the Spring backend, Firebase and Django retired.*

**Phase 5 — Productization (Week 10)**
Seed demo tenant with realistic data, entitlement-gated demo of all four editions, load test the dashboard and quiz-submit paths, deployment runbook, backup/restore drill.
*Milestone: sellable MVP — you can provision a new institution in minutes.*

## D3. Engineering Standards (non-negotiable, enforced in CI)

1. `ApplicationModules.verify()` in the test suite — build fails on boundary violations.
2. Architecture test: every `@Entity` outside `tenant`/platform extends `TenantAwareEntity`.
3. No controller returns a JPA entity — DTOs only (MapStruct).
4. Every service write method `@Transactional`; every list endpoint paginated.
5. Test pyramid: unit tests for services (JUnit 5 + Mockito), `@ApplicationModuleTest` per module, Testcontainers-PostgreSQL for repository and flow tests. Target: the learning loop (signup → enroll → assign → submit → grade → GPA) covered by an end-to-end test.
6. Code review: module owner approves; anything touching shared/ or crossing modules needs E1.
7. Conventional commits; PRs small enough to review in 15 minutes.

## D4. Deployment (MVP)

Docker image (multi-stage build), Docker Compose for local dev (app + PostgreSQL + Mailpit for OTP emails), Render.com or a VPS for the MVP deployment — one container, one managed PostgreSQL. Micrometer + Actuator health/metrics endpoints from day one; <cite index="1-1">instrument module boundaries with Micrometer spans</cite> so when you later need to know whether a module deserves extraction into a service, you'll have the numbers instead of a guess. Backups: nightly `pg_dump` retained 14 days, restore tested before first customer.

## D5. What Makes This Sellable — Engineering Checklist

- [ ] New tenant provisioned via one API call (institution live in minutes, not a deployment)
- [ ] Tenant branding (name, logo, colors) reflected in both frontends
- [ ] Entitlements toggle features per tenant without redeploy
- [ ] Cross-tenant isolation covered by automated tests (the deal-breaker bug class)
- [ ] Swagger/OpenAPI docs presentable to a technical evaluator
- [ ] Demo tenant with realistic seeded data for sales demos
- [ ] Transcript/report PDFs carry the tenant's branding (registrars buy this feature)
- [ ] Data export per tenant (institutions will ask "can we get our data out" — the answer must be yes)
- [ ] Audit log demonstrable (procurement departments ask for it)
- [ ] Uptime/health dashboard you can show (Actuator + a status page)

---

# APPENDIX — Legacy → New Mapping Quick Reference

| Django (legacy) | New module | Notes |
|---|---|---|
| StudentRecord, OtpVerification, Profile, Registrar, UserSettings, auth views | identity | Profile splits into role-specific data on User + StudentRecord link |
| Program, Course, CourseUnit, AcademicEvent, Schedule, SignUp | academic | SignUp renamed LecturerAssignment |
| Enrollment | enrollment | status enum kept |
| Assignment, Submission, Quiz, QuizQuestion, QuizAttempt | assessment | options JSON → quiz_option table |
| ExamResult, StudentGrade | records | GPA logic moves to service |
| FeeAssignment, StudentFee | finance | fee_structure JSON on Course dropped |
| Classroom, ClassroomEnrollment, LiveSession | classroom | join-code generation kept |
| Message, MessageDraft | messaging | view filters kept (inbox/sent/starred/archived) |
| Notification, Announcement | notification | becomes event-driven |
| Activity | audit | becomes event listeners, append-only |
| Firebase Firestore collections (15) | content | all into PostgreSQL |
| otp_service.py (standalone) | identity.OtpService | retired as separate process |
| StudentDashboardView | dashboard | composition over module query services |
| registrar-hub Reports.tsx (browser analytics) | reporting | aggregation moves to SQL/service layer |
| registrar-hub Transcripts (window.print) | reporting | server-side branded PDF |
| registrar-hub grading table (Results.tsx) | records | authoritative marks→grade→GP scale |
| registrar-hub useBranding (TODO stubs) | tenant | branding endpoints |
| registrar-hub /upload/ calls | storage | file upload module |
| registrar self-signup (Auth.tsx) | removed | registrars created by ADMIN only |

*End of document.*

package org.nexus.nubackend.configuration;

import org.nexus.nubackend.model.ContentItem;
import org.nexus.nubackend.model.CourseUnit;
import org.nexus.nubackend.model.StudentCourseEnrollment;
import org.nexus.nubackend.repository.ContentItemRepository;
import org.nexus.nubackend.repository.CourseUnitRepository;
import org.nexus.nubackend.repository.StudentCourseEnrollmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final CourseUnitRepository unitRepo;
    private final StudentCourseEnrollmentRepository enrollmentRepo;
    private final ContentItemRepository contentRepo;

    public DataSeeder(CourseUnitRepository unitRepo,
                      StudentCourseEnrollmentRepository enrollmentRepo,
                      ContentItemRepository contentRepo) {
        this.unitRepo = unitRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.contentRepo = contentRepo;
    }

    @Override
    public void run(String... args) {
        if (unitRepo.count() > 0) {
            return;
        }
        seedUnits();
        seedContent();
        seedEnrollments();
    }

    private CourseUnit unit(String code, String name, String courseCode, String courseName,
                            Integer semester, Integer year, Integer credits, String description) {
        CourseUnit u = new CourseUnit();
        u.setCode(code);
        u.setName(name);
        u.setCourseCode(courseCode);
        u.setCourseName(courseName);
        u.setSemester(semester);
        u.setAcademicYear(year);
        u.setCredits(credits);
        u.setDescription(description);
        return unitRepo.save(u);
    }

    private void seedUnits() {
        unit("CSC2101", "Data Structures and Algorithms",
            "BCSC", "Bachelor of Computer Science", 2, 2, 4,
            "Lists, stacks, queues, trees, graphs and algorithm analysis with practical implementation in Java.");
        unit("CSC2102", "Database Systems",
            "BCSC", "Bachelor of Computer Science", 2, 2, 4,
            "Relational modelling, SQL, transactions, indexing and an introduction to query optimisation.");
        unit("CSC2103", "Object-Oriented Programming",
            "BCSC", "Bachelor of Computer Science", 2, 2, 3,
            "Advanced Java: inheritance, polymorphism, generics, collections and design patterns.");
        unit("MAT2101", "Discrete Mathematics II",
            "BCSC", "Bachelor of Computer Science", 2, 2, 3,
            "Counting, recurrence relations, graph theory and their application to computer science.");
        unit("CSC2204", "Software Engineering",
            "BCSC", "Bachelor of Computer Science", 2, 1, 4,
            "Requirements analysis, UML, agile process, testing and project management foundations.");
        unit("FRE2101", "Communication Skills",
            "BCSC", "Bachelor of Computer Science", 2, 1, 2,
            "Academic writing, oral presentation and professional communication for engineers.");
    }

    private void seedContent() {
        String pdfBase = "https://universityportal2026.web.app/samples/";
        addContent("CSC2101", "Course Overview",
            "PAGE", "Welcome to Data Structures and Algorithms",
            "<p>This unit introduces the fundamental data structures used across computer science and the algorithms that operate on them.</p><p>By the end of the semester you will be able to implement core data structures from scratch and analyse their time and space complexity using Big-O notation.</p><p>Assessment: lab exercises (20%), mid-semester exam (20%), assignments (20%) and final exam (40%).</p>",
            null, null, null, 1);
        addContent("CSC2101", "Course Overview",
            "URL", "Unit syllabus (official)",
            null, "https://docs.moodle.org/sample/syllabus.pdf", null, null, 2);
        addContent("CSC2101", "Lecture Notes",
            "FILE", "Lecture 1 - Arrays and Linked Lists",
            null, null, pdfBase + "CSC2101-lecture1.pdf", "CSC2101-lecture1.pdf", 3);
        addContent("CSC2101", "Lecture Notes",
            "FILE", "Lecture 2 - Stacks and Queues",
            null, null, pdfBase + "CSC2101-lecture2.pdf", "CSC2101-lecture2.pdf", 4);
        addContent("CSC2101", "Lecture Notes",
            "PAGE", "Lecture 3 - Trees (notes page)",
            "<h3>Trees</h3><p>A tree is a hierarchical structure of nodes connected by edges. Binary trees, binary search trees and heaps are the most commonly used trees in competitive and academic settings.</p><ul><li>Binary tree: each node has at most two children.</li><li>BST: left subtree keys smaller, right subtree keys larger.</li><li>Heap: complete tree with heap property.</li></ul>",
            null, null, null, 5);
        addContent("CSC2101", "Readings",
            "FILE", "Textbook chapter 1-3 (PDF)",
            null, null, pdfBase + "CSC2101-textbook.pdf", "CSC2101-textbook.pdf", 6);
        addContent("CSC2101", "Readings",
            "URL", "Khan Academy - Algorithms",
            null, "https://www.khanacademy.org/computing/computer-science/algorithms", null, null, 7);
        addContent("CSC2102", "Course Overview",
            "PAGE", "Welcome to Database Systems",
            "<p>A hands-on introduction to designing, building and querying relational databases.</p><p>You will work with PostgreSQL throughout, learning SQL by writing it on real datasets.</p>",
            null, null, null, 1);
        addContent("CSC2102", "Lecture Notes",
            "FILE", "Lecture 1 - Relational Model",
            null, null, pdfBase + "CSC2102-lecture1.pdf", "CSC2102-lecture1.pdf", 2);
        addContent("CSC2102", "Lecture Notes",
            "FILE", "Lecture 2 - SQL Fundamentals",
            null, null, pdfBase + "CSC2102-lecture2.pdf", "CSC2102-lecture2.pdf", 3);
        addContent("CSC2102", "Labs",
            "LABEL", "Lab environment: PostgreSQL 16 is installed on the lab machines. Use it for all practical work.",
            null, null, null, null, 4);
        addContent("CSC2103", "Course Overview",
            "PAGE", "Welcome to Object-Oriented Programming",
            "<p>This course solidifies your Java skills and introduces professional software design practices.</p>",
            null, null, null, 1);
        addContent("CSC2103", "Lecture Notes",
            "BOOK", "Course reader - chapters 1-5",
            "<p>Online book content coming soon. Chapters cover classes, interfaces, generics, collections and basic patterns.</p>",
            null, null, null, 2);
        addContent("MAT2101", "Course Overview",
            "PAGE", "Welcome to Discrete Mathematics II",
            "<p>We build on foundations: counting and combinatorics, recurrence relations and graph theory.</p><p>Much of this material directly supports the analysis you perform in CSC2101.</p>",
            null, null, null, 1);
        addContent("MAT2101", "Lecture Notes",
            "FILE", "Lecture 1 - Counting Principles",
            null, null, pdfBase + "MAT2101-lecture1.pdf", "MAT2101-lecture1.pdf", 2);
    }

    private void addContent(String unitCode, String section, String type, String title,
                            String content, String url, String fileUrl, String fileName, int order) {
        CourseUnit unit = unitRepo.findByCode(unitCode).orElseThrow();
        ContentItem item = new ContentItem();
        item.setCourseUnit(unit);
        item.setSection(section);
        item.setType(type);
        item.setTitle(title);
        item.setContent(content);
        item.setUrl(url);
        item.setFileUrl(fileUrl);
        item.setFileName(fileName);
        item.setDisplayOrder(order);
        contentRepo.save(item);
    }

    private void seedEnrollments() {
        List<String> demoStudents = List.of("1", "2", "3");
        for (String studentId : demoStudents) {
            for (CourseUnit unit : unitRepo.findAll()) {
                if (enrollmentRepo.existsByStudentIdAndCourseUnitId(studentId, unit.getId())) {
                    continue;
                }
                StudentCourseEnrollment e = new StudentCourseEnrollment();
                e.setStudentId(studentId);
                e.setCourseUnit(unit);
                e.setStatus("approved");
                enrollmentRepo.save(e);
            }
        }
    }
}
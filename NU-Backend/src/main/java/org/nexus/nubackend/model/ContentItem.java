package org.nexus.nubackend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "content_item")
public class ContentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_unit_id", nullable = false)
    private CourseUnit courseUnit;

    @Column(nullable = false)
    private String section;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String type;

    @Column(length = 10000)
    private String content;

    private String url;

    private String fileUrl;

    private String fileName;

    @Column(nullable = false)
    private Integer displayOrder = 0;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public ContentItem() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CourseUnit getCourseUnit() { return courseUnit; }
    public void setCourseUnit(CourseUnit courseUnit) { this.courseUnit = courseUnit; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
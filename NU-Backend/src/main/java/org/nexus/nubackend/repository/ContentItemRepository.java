package org.nexus.nubackend.repository;

import org.nexus.nubackend.model.ContentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContentItemRepository extends JpaRepository<ContentItem, Long> {
    List<ContentItem> findByCourseUnitIdOrderByDisplayOrderAscIdAsc(Long courseUnitId);
}
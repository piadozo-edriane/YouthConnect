package com.youthconnect.youthconnect_id.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.youthconnect.youthconnect_id.models.User;

@Repository
public interface UserRepo extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findByYouthId(int youthId);
    List<User> findByStatus(String status);
    List<User> findByStatusAndIsActive(String status, boolean isActive);
    List<User> findByStatusOrderByCreatedAtDesc(String status);
    Optional<User> findByResetToken(String resetToken);
    long countByIsActiveTrue();
}

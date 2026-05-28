package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.AdministratorResponse;
import com.youthconnect.youthconnect_id.dto.AdminSkOfficialRequest;
import com.youthconnect.youthconnect_id.dto.AdminUserUpdateRequest;
import com.youthconnect.youthconnect_id.dto.AdminYouthProfileUpdateRequest;
import com.youthconnect.youthconnect_id.models.Administrator;
import com.youthconnect.youthconnect_id.models.Role;
import com.youthconnect.youthconnect_id.models.SkOfficialsUser;
import com.youthconnect.youthconnect_id.models.User;
import com.youthconnect.youthconnect_id.models.YouthClassification;
import com.youthconnect.youthconnect_id.models.YouthProfile;
import com.youthconnect.youthconnect_id.repositories.AdministratorRepo;
import com.youthconnect.youthconnect_id.repositories.RoleRepo;
import com.youthconnect.youthconnect_id.repositories.SkOfficialRepo;
import com.youthconnect.youthconnect_id.repositories.UserRepo;
import com.youthconnect.youthconnect_id.repositories.YouthClassificationRepo;
import com.youthconnect.youthconnect_id.repositories.YouthProfileRepo;
import com.youthconnect.youthconnect_id.services.AdminManagementService;

@Service
public class AdminManagementServiceImpl implements AdminManagementService {

    private static final String PASSWORD_POLICY_REGEX =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{8,64}$";

    @Autowired
    private AdministratorRepo administratorRepo;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private YouthProfileRepo youthProfileRepo;

    @Autowired
    private YouthClassificationRepo youthClassificationRepo;

    @Autowired
    private SkOfficialRepo skOfficialsRepo;

    @Autowired
    private RoleRepo roleRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    // ── Administrators ───────────────────────────────────
    @Override
    public long getAdministratorCount() {
        return administratorRepo.count();
    }

    @Override
    public List<AdministratorResponse> getAllAdministrators() {
        return administratorRepo.findAll().stream()
                .map(this::toAdministratorResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AdministratorResponse createAdministrator(String username, String email, String password) {
        String normalizedUsername = username == null ? "" : username.trim();
        String normalizedEmail = email == null ? "" : email.trim();
        String normalizedPassword = password == null ? "" : password.trim();

        if (normalizedUsername.isEmpty() || normalizedEmail.isEmpty() || normalizedPassword.isEmpty()) {
            throw new IllegalArgumentException("Username, email, and password are required.");
        }

        validatePasswordPolicy(normalizedPassword);

        if (administratorRepo.existsByUsername(normalizedUsername)) {
            throw new IllegalArgumentException("Username is already in use.");
        }

        if (administratorRepo.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already in use.");
        }

        Administrator administrator = new Administrator();
        administrator.setUsername(normalizedUsername);
        administrator.setEmail(normalizedEmail);
        administrator.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        administrator.setActive(true);
        administrator.setCreatedAt(LocalDateTime.now());

        Administrator savedAdministrator = administratorRepo.save(administrator);
        return toAdministratorResponse(savedAdministrator);
    }

    @Override
    @Transactional
    public AdministratorResponse updateAdministrator(int administratorId, String username, String email, boolean active,
            String password) {
        Administrator administrator = administratorRepo.findById(administratorId)
                .orElseThrow(() -> new RuntimeException("Administrator not found"));

        String normalizedUsername = username == null ? "" : username.trim();
        String normalizedEmail = email == null ? "" : email.trim();
        String normalizedPassword = password == null ? "" : password.trim();

        administrator.setUsername(normalizedUsername);
        administrator.setEmail(normalizedEmail);
        administrator.setActive(active);

        if (!normalizedPassword.isEmpty()) {
            validatePasswordPolicy(normalizedPassword);
            administrator.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        }

        Administrator savedAdministrator = administratorRepo.save(administrator);
        return toAdministratorResponse(savedAdministrator);
    }

    @Override
    @Transactional
    public void deleteAdministrator(int administratorId) {
        Administrator administrator = administratorRepo.findById(administratorId)
                .orElseThrow(() -> new RuntimeException("Administrator not found"));
        administratorRepo.delete(administrator);
    }

    @Override
    @Transactional
    public AdministratorResponse setAdministratorActiveStatus(int administratorId, boolean active) {
        Administrator administrator = administratorRepo.findById(administratorId)
                .orElseThrow(() -> new RuntimeException("Administrator not found"));
        administrator.setActive(active);
        Administrator savedAdministrator = administratorRepo.save(administrator);
        return toAdministratorResponse(savedAdministrator);
    }

    private AdministratorResponse toAdministratorResponse(Administrator administrator) {
        return new AdministratorResponse(
                administrator.getAdministratorId(),
                administrator.getUsername(),
                administrator.getEmail(),
                administrator.isActive(),
                administrator.getCreatedAt());
    }

    private void validatePasswordPolicy(String password) {
        if (!password.matches(PASSWORD_POLICY_REGEX)) {
            throw new IllegalArgumentException(
                    "Password must be 8-64 characters and include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.");
        }
    }

    // ── Users ─────────────────────────────────────────────
    @Override
    public List<User> getAllUsers() {
        return userRepo.findAll();
    }

    @Override
    public User getUserById(int userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    @Transactional
    public User updateUser(int userId, AdminUserUpdateRequest request) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }

        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }

        if (request.getRoleId() != null) {
            user.setRoleId(request.getRoleId());
        }

        if (User.STATUS_APPROVED.equalsIgnoreCase(user.getStatus())) {
            user.setActive(true);
        } else if (User.STATUS_REJECTED.equalsIgnoreCase(user.getStatus())) {
            user.setActive(false);
        }

        return userRepo.save(user);
    }

    @Override
    public void deleteUser(int userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        userRepo.delete(user);
    }

    @Override
    @Transactional
    public User approveUser(int userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(User.STATUS_APPROVED);
        user.setActive(true);
        return userRepo.save(user);
    }

    @Override
    @Transactional
    public User rejectUser(int userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(User.STATUS_REJECTED);
        user.setActive(false);
        return userRepo.save(user);
    }

    @Override
    @Transactional
    public User deactivateUser(int userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        return userRepo.save(user);
    }

    @Override
    @Transactional
    public User reactivateUser(int userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(true);
        return userRepo.save(user);
    }

    // ── Youth Profile ─────────────────────────────────────
    @Override
    public List<YouthProfile> getAllYouthProfiles() {
        return youthProfileRepo.findAll();
    }

    @Override
    public YouthProfile getYouthProfileById(int youthId) {
        return youthProfileRepo.findById(youthId)
                .orElseThrow(() -> new RuntimeException("Youth profile not found"));
    }

    @Override
    @Transactional
    public YouthProfile updateYouthProfile(int youthId, AdminYouthProfileUpdateRequest request) {
        YouthProfile profile = youthProfileRepo.findById(youthId)
                .orElseThrow(() -> new RuntimeException("Youth profile not found"));
        profile.setFirstName(request.getFirstName());
        profile.setMiddleName(request.getMiddleName());
        profile.setLastName(request.getLastName());
        profile.setSuffix(request.getSuffix());
        profile.setGender(request.getGender());
        profile.setBirthday(request.getBirthday());
        profile.setContactNumber(request.getContactNumber());
        profile.setCompleteAddress(request.getCompleteAddress());
        profile.setCivilStatus(request.getCivilStatus());
        profile.setUpdatedAt(LocalDateTime.now());
        if (request.getBirthday() != null) {
            profile.setAge(Period.between(request.getBirthday(),
                    LocalDateTime.now().toLocalDate()).getYears());
        }

        if (request.getYouthClassification() != null) {
            AdminYouthProfileUpdateRequest.YouthClassificationUpdateRequest classificationRequest = request.getYouthClassification();

            YouthClassification classification = youthClassificationRepo.findById(youthId)
                    .orElseGet(() -> {
                        YouthClassification newClassification = new YouthClassification();
                        newClassification.setYouthId(youthId);
                        return newClassification;
                    });

            classification.setYouthClassification(classificationRequest.getYouthClassification());
            classification.setEducationBackground(classificationRequest.getEducationBackground());
            classification.setWorkStatus(classificationRequest.getWorkStatus());
            classification.setSkVoter(Boolean.TRUE.equals(classificationRequest.getSkVoter()));
            classification.setNationalVoter(Boolean.TRUE.equals(classificationRequest.getNationalVoter()));
            classification.setPastVoter(Boolean.TRUE.equals(classificationRequest.getPastVoter()));
            classification.setNumAttended(classificationRequest.getNumAttended() == null ? 0 : classificationRequest.getNumAttended());
            classification.setNonAttendedReason(classificationRequest.getNonAttendedReason());

            youthClassificationRepo.save(classification);
        }

        return youthProfileRepo.save(profile);
    }

    @Override
    @Transactional
    public User deactivateYouthProfile(int youthId) {
        YouthProfile profile = youthProfileRepo.findById(youthId)
                .orElseThrow(() -> new RuntimeException("Youth profile not found"));

        User user = userRepo.findByYouthId(profile.getYouthId())
                .orElseThrow(() -> new RuntimeException("Linked user account not found"));

        user.setActive(false);
        return userRepo.save(user);
    }

    @Override
    public void deleteYouthProfile(int youthId) {
        YouthProfile profile = youthProfileRepo.findById(youthId)
                .orElseThrow(() -> new RuntimeException("Youth profile not found"));
        youthProfileRepo.delete(profile);
    }

    // ── SK Officials ──────────────────────────────────────
    @Override
    public List<SkOfficialsUser> getAllSkOfficials() {
        return skOfficialsRepo.findAll();
    }

    @Override
    public SkOfficialsUser getSkOfficialById(int adminId) {
        return skOfficialsRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("SK Official not found"));
    }

    @Override
    @Transactional
    public SkOfficialsUser createSkOfficial(AdminSkOfficialRequest request) {
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        SkOfficialsUser official = new SkOfficialsUser();
        official.setFirstName(request.getFirstName());
        official.setLastName(request.getLastName());
        official.setEmail(request.getEmail());
        official.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        official.setRole(role);
        official.setActive(request.isActive());
        official.setCreatedAt(LocalDateTime.now());
        return skOfficialsRepo.save(official);
    }

    @Override
    @Transactional
    public SkOfficialsUser updateSkOfficial(int adminId, AdminSkOfficialRequest request) {
        SkOfficialsUser official = skOfficialsRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("SK Official not found"));
        Role role = roleRepo.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));
        official.setFirstName(request.getFirstName());
        official.setLastName(request.getLastName());
        official.setEmail(request.getEmail());
        official.setRole(role);
        official.setActive(request.isActive());
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            official.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        return skOfficialsRepo.save(official);
    }

    @Override
    public void deleteSkOfficial(int adminId) {
        SkOfficialsUser official = skOfficialsRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("SK Official not found"));
        skOfficialsRepo.delete(official);
    }

    @Override
    @Transactional
    public SkOfficialsUser deactivateSkOfficial(int adminId) {
        SkOfficialsUser official = skOfficialsRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("SK Official not found"));
        official.setActive(false);
        return skOfficialsRepo.save(official);
    }

    @Override
    @Transactional
    public SkOfficialsUser activateSkOfficial(int adminId) {
        SkOfficialsUser official = skOfficialsRepo.findById(adminId)
                .orElseThrow(() -> new RuntimeException("SK Official not found"));
        official.setActive(true);
        return skOfficialsRepo.save(official);
    }
}
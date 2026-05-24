package com.youthconnect.youthconnect_id.services.implementation;

import java.time.LocalDateTime;
import java.time.Period;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.youthconnect.youthconnect_id.dto.LoginRequest;
import com.youthconnect.youthconnect_id.dto.LoginResponse;
import com.youthconnect.youthconnect_id.dto.RegistrationRequest;
import com.youthconnect.youthconnect_id.dto.RegistrationResponse;
// import com.youthconnect.youthconnect_id.enums.DocumentType;
import com.youthconnect.youthconnect_id.models.User;
import com.youthconnect.youthconnect_id.models.YouthClassification;
// import com.youthconnect.youthconnect_id.models.YouthDocuments;
import com.youthconnect.youthconnect_id.models.YouthProfile;
import com.youthconnect.youthconnect_id.repositories.UserRepo;
import com.youthconnect.youthconnect_id.repositories.YouthClassificationRepo;
// import com.youthconnect.youthconnect_id.repositories.YouthDocumentsRepo;
import com.youthconnect.youthconnect_id.repositories.YouthProfileRepo;
import com.youthconnect.youthconnect_id.security.JwtUtil;
import com.youthconnect.youthconnect_id.services.EmailService;
import com.youthconnect.youthconnect_id.services.UserService;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private YouthProfileRepo youthProfileRepo;

    @Autowired
    private YouthClassificationRepo youthClassificationRepo;

    // @Autowired
    // private YouthDocumentsRepo youthDocumentsRepo;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    @Override
    @Transactional
    public RegistrationResponse registerUser(RegistrationRequest request) {
        // Check if user exists
        Optional<User> existingUserOpt = userRepo.findByEmail(request.getEmail());
        
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            
            // If user is rejected, allow them to re-register by updating their info
            if (User.STATUS_REJECTED.equalsIgnoreCase(existingUser.getStatus())) {
                return updateRejectedUserRegistration(existingUser, request);
            }
            
            // If user is pending or approved, don't allow re-registration
            return new RegistrationResponse(false, "Email already exists");
        }

        if (request.getYouthClassification() == null || request.getEducationBackground() == null 
            || request.getWorkStatus() == null) {
            return new RegistrationResponse(false, "Youth classification, education background, and work status are required");
        }

        // if (request.getDocuments() == null || request.getDocuments().isEmpty()) {
        //     return new RegistrationResponse(false, "At least one document is required");
        // }

        YouthProfile youthProfile = new YouthProfile();
        youthProfile.setFirstName(request.getFirstName());
        youthProfile.setMiddleName(request.getMiddleName());
        youthProfile.setLastName(request.getLastName());
        youthProfile.setSuffix(request.getSuffix());
        youthProfile.setGender(request.getGender());
        youthProfile.setBirthday(request.getBirthday());
        youthProfile.setContactNumber(request.getContactNumber());
        youthProfile.setCompleteAddress(request.getCompleteAddress());
        youthProfile.setCivilStatus(request.getCivilStatus());
        youthProfile.setCreatedAt(LocalDateTime.now());
        youthProfile.setUpdatedAt(LocalDateTime.now());
        
        if (request.getBirthday() != null) {
            youthProfile.setAge(Period.between(request.getBirthday(), LocalDateTime.now().toLocalDate()).getYears());
        }

        YouthProfile savedProfile = youthProfileRepo.save(youthProfile);
        int youthId = savedProfile.getYouthId();

        YouthClassification classification = new YouthClassification();
        classification.setYouthId(youthId);
        classification.setYouthClassification(request.getYouthClassification());
        classification.setEducationBackground(request.getEducationBackground());
        classification.setWorkStatus(request.getWorkStatus());
        classification.setSkVoter(request.isSkVoter());
        classification.setNationalVoter(request.isNationalVoter());
        classification.setPastVoter(request.isPastVoter());
        classification.setNumAttended(request.getNumAttended());
        classification.setNonAttendedReason(request.getNonAttendedReason());
        
        youthClassificationRepo.save(classification);

        // Create YouthDocuments
        // for (RegistrationRequest.DocumentUpload doc : request.getDocuments()) {
        //     YouthDocuments document = new YouthDocuments();
        //     document.setYouthId(youthId);
        //     document.setDocumentType(DocumentType.fromValue(doc.getDocumentType()));
        //     document.setFilePath(doc.getFilePath());
        //     document.setUploadedAt(LocalDateTime.now());
            
        //     youthDocumentsRepo.save(document);
        // }

        // Create User
        User user = new User();
        user.setYouthId(youthId);
        user.setRoleId(1); // Default role for youth
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(false); // Inactive until approved
        user.setCreatedAt(LocalDateTime.now());
        user.setStatus(User.STATUS_PENDING);

        User savedUser = userRepo.save(user);

        // Send registration confirmation email to the youth user
        try {
            System.out.println("=== Attempting to send registration confirmation email ===");
            System.out.println("To: " + savedUser.getEmail());
            System.out.println("Name: " + savedProfile.getFirstName());
            
            emailService.sendRegistrationConfirmationEmail(
                savedUser.getEmail(), 
                savedProfile.getFirstName()
            );
            
            System.out.println("✅ Registration confirmation email sent successfully");
        } catch (Exception e) {
            System.err.println("❌ Failed to send registration confirmation email: " + e.getMessage());
            e.printStackTrace();
        }

        // Build response
        RegistrationResponse response = new RegistrationResponse(true, "Registration successful. Awaiting approval.");
        response.setUserId(savedUser.getUserId());
        response.setYouthId(savedUser.getYouthId());
        response.setEmail(savedUser.getEmail());

        return response;
    }

    @Override
    public LoginResponse loginUser(LoginRequest request) {
        // Find user by email
        Optional<User> userOptional = userRepo.findByEmail(request.getEmail());
        
        if (userOptional.isEmpty()) {
            return new LoginResponse(false, "Invalid email or password");
        }

        User user = userOptional.get();

        // Check if password matches
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return new LoginResponse(false, "Invalid email or password");
        }

        // Check if user is approved
        if (!User.STATUS_APPROVED.equalsIgnoreCase(user.getStatus())) {
            if (User.STATUS_REJECTED.equalsIgnoreCase(user.getStatus())) {
                return new LoginResponse(false, "Your account has been rejected. Please contact administrator for more information.");
            } else {
                return new LoginResponse(false, "Your account is pending approval. Please wait for administrator approval.");
            }
        }

        // Check if user is active
        if (!user.isActive()) {
            return new LoginResponse(false, "Account is inactive. Please contact administrator.");
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(user.getEmail(), user.getUserId(), user.getRoleId());

        // Build response
        LoginResponse response = new LoginResponse(true, "Login successful");
        response.setToken(token);
        response.setUserId(user.getUserId());
        response.setYouthId(user.getYouthId());
        response.setEmail(user.getEmail());
        response.setRoleId(user.getRoleId());
        response.setStatus(user.getStatus());
        response.setApproved(User.STATUS_APPROVED.equalsIgnoreCase(user.getStatus()));

        return response;
    }

    @Transactional
    private RegistrationResponse updateRejectedUserRegistration(User existingUser, RegistrationRequest request) {
        try {
            // Get existing youth profile
            Optional<YouthProfile> profileOpt = youthProfileRepo.findById(existingUser.getYouthId());
            if (profileOpt.isEmpty()) {
                return new RegistrationResponse(false, "Profile not found");
            }

            YouthProfile youthProfile = profileOpt.get();
            
            // Update youth profile with new information
            youthProfile.setFirstName(request.getFirstName());
            youthProfile.setMiddleName(request.getMiddleName());
            youthProfile.setLastName(request.getLastName());
            youthProfile.setSuffix(request.getSuffix());
            youthProfile.setGender(request.getGender());
            youthProfile.setBirthday(request.getBirthday());
            youthProfile.setContactNumber(request.getContactNumber());
            youthProfile.setCompleteAddress(request.getCompleteAddress());
            youthProfile.setCivilStatus(request.getCivilStatus());
            youthProfile.setUpdatedAt(LocalDateTime.now());
            
            if (request.getBirthday() != null) {
                youthProfile.setAge(Period.between(request.getBirthday(), LocalDateTime.now().toLocalDate()).getYears());
            }

            youthProfileRepo.save(youthProfile);

            // Update youth classification
            Optional<YouthClassification> classificationOpt = youthClassificationRepo.findById(existingUser.getYouthId());
            YouthClassification classification;
            
            if (classificationOpt.isPresent()) {
                classification = classificationOpt.get();
            } else {
                classification = new YouthClassification();
                classification.setYouthId(existingUser.getYouthId());
            }
            
            classification.setYouthClassification(request.getYouthClassification());
            classification.setEducationBackground(request.getEducationBackground());
            classification.setWorkStatus(request.getWorkStatus());
            classification.setSkVoter(request.isSkVoter());
            classification.setNationalVoter(request.isNationalVoter());
            classification.setPastVoter(request.isPastVoter());
            classification.setNumAttended(request.getNumAttended());
            classification.setNonAttendedReason(request.getNonAttendedReason());
            
            youthClassificationRepo.save(classification);

            // Update user - reset to pending status and update password
            existingUser.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            existingUser.setStatus(User.STATUS_PENDING);
            existingUser.setActive(false);
            existingUser.setRejectionReason(null);
            existingUser.setApprovedBy(null);
            existingUser.setApprovedAt(null);
            
            User savedUser = userRepo.save(existingUser);

            // Send registration confirmation email
            try {
                System.out.println("=== Attempting to send re-registration confirmation email ===");
                System.out.println("To: " + savedUser.getEmail());
                System.out.println("Name: " + youthProfile.getFirstName());
                
                emailService.sendRegistrationConfirmationEmail(
                    savedUser.getEmail(), 
                    youthProfile.getFirstName()
                );
                
                System.out.println("✅ Re-registration confirmation email sent successfully");
            } catch (Exception e) {
                System.err.println("❌ Failed to send re-registration confirmation email: " + e.getMessage());
                e.printStackTrace();
            }

            // Build response
            RegistrationResponse response = new RegistrationResponse(true, "Re-registration successful. Your application has been resubmitted for approval.");
            response.setUserId(savedUser.getUserId());
            response.setYouthId(savedUser.getYouthId());
            response.setEmail(savedUser.getEmail());

            return response;
        } catch (Exception e) {
            System.err.println("❌ Failed to update rejected user registration: " + e.getMessage());
            e.printStackTrace();
            return new RegistrationResponse(false, "Failed to update registration. Please try again.");
        }
    }
}

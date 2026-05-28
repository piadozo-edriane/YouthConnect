package com.youthconnect.youthconnect_id.services;

import java.util.List;

import com.youthconnect.youthconnect_id.dto.AdministratorResponse;
import com.youthconnect.youthconnect_id.dto.AdminSkOfficialRequest;
import com.youthconnect.youthconnect_id.dto.AdminUserUpdateRequest;
import com.youthconnect.youthconnect_id.dto.AdminYouthProfileUpdateRequest;
import com.youthconnect.youthconnect_id.models.SkOfficialsUser;
import com.youthconnect.youthconnect_id.models.User;
import com.youthconnect.youthconnect_id.models.YouthProfile;

public interface AdminManagementService {
    // Administrators
    long getAdministratorCount();
    List<AdministratorResponse> getAllAdministrators();
    AdministratorResponse createAdministrator(String username, String email, String password);
        AdministratorResponse updateAdministrator(int administratorId, String username, String email, boolean active,
            String password);
    void deleteAdministrator(int administratorId);
    AdministratorResponse setAdministratorActiveStatus(int administratorId, boolean active);

    // Users
    List<User> getAllUsers();
    User getUserById(int userId);
    User updateUser(int userId, AdminUserUpdateRequest request);
    void deleteUser(int userId);
    User approveUser(int userId);
    User rejectUser(int userId);
    User deactivateUser(int userId);
    User reactivateUser(int userId);

    // Youth Profile
    List<YouthProfile> getAllYouthProfiles();
    YouthProfile getYouthProfileById(int youthId);
    YouthProfile updateYouthProfile(int youthId, AdminYouthProfileUpdateRequest request);
    User deactivateYouthProfile(int youthId);
    void deleteYouthProfile(int youthId);

    // SK Officials
    List<SkOfficialsUser> getAllSkOfficials();
    SkOfficialsUser getSkOfficialById(int adminId);
    SkOfficialsUser createSkOfficial(AdminSkOfficialRequest request);
    SkOfficialsUser updateSkOfficial(int adminId, AdminSkOfficialRequest request);
    void deleteSkOfficial(int adminId);
    SkOfficialsUser deactivateSkOfficial(int adminId);
    SkOfficialsUser activateSkOfficial(int adminId);
}
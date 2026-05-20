package com.youthconnect.youthconnect_id.services;

import java.util.List;

import com.youthconnect.youthconnect_id.dto.AdminConcernUpdateRequest;
import com.youthconnect.youthconnect_id.dto.ConcernRequest;
import com.youthconnect.youthconnect_id.dto.ConcernResponse;
import com.youthconnect.youthconnect_id.dto.ConcernUpdateResponse;
import com.youthconnect.youthconnect_id.dto.ConcernUpdateRequest;
import com.youthconnect.youthconnect_id.dto.YouthConcernReplyRequest;
import com.youthconnect.youthconnect_id.enums.ConcernStatus;

public interface ConcernService {
    // Youth
    ConcernResponse submitConcern(ConcernRequest request);
    List<ConcernResponse> getOwnConcerns(int youthId);
    ConcernResponse getConcernById(int concernId);
    ConcernResponse editConcern(int concernId, ConcernUpdateRequest request);
    void cancelConcern(int concernId);
    void deleteConcern(int concernId);

    // Admin
    List<ConcernResponse> getAllConcerns();
    ConcernResponse updateConcernStatus(int concernId, ConcernStatus status);
    void addConcernUpdate(int concernId, AdminConcernUpdateRequest request);
    List<ConcernUpdateResponse> getConcernUpdates(int concernId);
    ConcernUpdateResponse addYouthReply(int concernId, YouthConcernReplyRequest request);
}
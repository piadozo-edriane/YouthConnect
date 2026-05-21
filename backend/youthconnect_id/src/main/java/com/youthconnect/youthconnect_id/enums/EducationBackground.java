package com.youthconnect.youthconnect_id.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EducationBackground {
    ELEMENTARY_LEVEL,
    ELEMENTARY_GRADUATE,
    HIGH_SCHOOL_GRADUATE,
    HIGH_SCHOOL_LEVEL,
    VOCATIONAL_GRAD,
    COLLEGE_LEVEL,
    COLLEGE_GRADUATE,
    MASTERS_LEVEL,
    MASTERS_GRADUATE,
    DOCTOR_LEVEL,
    DOCTOR_GRADUATE;

    @JsonValue
    public String getValue() {
        return this.name();
    }

    @JsonCreator
    public static EducationBackground fromValue(String value) {
        for (EducationBackground edu : EducationBackground.values()) {
            if (edu.name().equalsIgnoreCase(value)) {
                return edu;
            }
        }
        throw new IllegalArgumentException("Unknown education background: " + value);
    }
}
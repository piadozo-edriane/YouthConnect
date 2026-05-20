package com.youthconnect.youthconnect_id.dto;

public class YouthConcernReplyRequest {
    private int youthId;
    private String updateText;

    public int getYouthId() {
        return youthId;
    }

    public void setYouthId(int youthId) {
        this.youthId = youthId;
    }

    public String getUpdateText() {
        return updateText;
    }

    public void setUpdateText(String updateText) {
        this.updateText = updateText;
    }
}

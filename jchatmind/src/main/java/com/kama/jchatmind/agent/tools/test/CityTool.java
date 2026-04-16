package com.kama.jchatmind.agent.tools.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kama.jchatmind.agent.tools.Tool;
import com.kama.jchatmind.agent.tools.ToolType;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Component
public class CityTool implements Tool {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public String getName() {
        return "cityTool";
    }

    @Override
    public String getDescription() {
        return "根据 IP 地址获取当前用户所在城市";
    }

    @Override
    public ToolType getType() {
        return ToolType.FIXED;
    }

    @org.springframework.ai.tool.annotation.Tool(name = "getCity", description = "根据 IP 地址获取当前用户所在城市")
    public String getCity() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon"))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode node = objectMapper.readTree(response.body());

            if (!"success".equals(node.path("status").asText())) {
                return "无法获取位置信息";
            }

            String city = node.path("city").asText();
            String region = node.path("regionName").asText();
            String country = node.path("country").asText();
            return city + ", " + region + ", " + country;
        } catch (Exception e) {
            return "位置获取失败：" + e.getMessage();
        }
    }
}

package com.kama.jchatmind.agent.tools.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kama.jchatmind.agent.tools.Tool;
import com.kama.jchatmind.agent.tools.ToolType;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

@Component
public class WeatherTool implements Tool {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Override
    public String getName() {
        return "weatherTool";
    }

    @Override
    public String getDescription() {
        return "获取指定城市的实时天气";
    }

    @Override
    public ToolType getType() {
        return ToolType.FIXED;
    }

    @org.springframework.ai.tool.annotation.Tool(name = "weather", description = "获取指定城市的实时天气")
    public String getWeather(String city, String date) {
        try {
            // 第一步：地理编码，获取经纬度
            String encodedCity = URLEncoder.encode(city, StandardCharsets.UTF_8);
            HttpRequest geoRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://geocoding-api.open-meteo.com/v1/search?name=" + encodedCity + "&count=1&language=en&format=json"))
                    .GET()
                    .build();
            HttpResponse<String> geoResponse = httpClient.send(geoRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode geoNode = objectMapper.readTree(geoResponse.body());

            JsonNode results = geoNode.path("results");
            if (results.isMissingNode() || results.isEmpty()) {
                return "未找到城市 " + city + " 的位置信息";
            }

            double lat = results.get(0).path("latitude").asDouble();
            double lon = results.get(0).path("longitude").asDouble();

            // 第二步：查询实时天气
            String weatherUrl = String.format(
                    "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f" +
                    "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature" +
                    "&temperature_unit=celsius&wind_speed_unit=kmh",
                    lat, lon);

            HttpRequest weatherRequest = HttpRequest.newBuilder()
                    .uri(URI.create(weatherUrl))
                    .GET()
                    .build();
            HttpResponse<String> weatherResponse = httpClient.send(weatherRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode weatherNode = objectMapper.readTree(weatherResponse.body());

            JsonNode current = weatherNode.path("current");
            double temp = current.path("temperature_2m").asDouble();
            double feelsLike = current.path("apparent_temperature").asDouble();
            int humidity = current.path("relative_humidity_2m").asInt();
            double windSpeed = current.path("wind_speed_10m").asDouble();
            int weatherCode = current.path("weather_code").asInt();
            String condition = describeWeatherCode(weatherCode);

            return String.format("%s %s 实时天气：%s，温度 %.1f°C（体感 %.1f°C），湿度 %d%%，风速 %.1f km/h",
                    city, date, condition, temp, feelsLike, humidity, windSpeed);

        } catch (Exception e) {
            return city + " " + date + " 天气查询失败：" + e.getMessage();
        }
    }

    private String describeWeatherCode(int code) {
        if (code == 0) return "晴空";
        if (code <= 3) return "多云";
        if (code <= 48) return "雾";
        if (code <= 55) return "毛毛雨";
        if (code <= 65) return "下雨";
        if (code <= 75) return "下雪";
        if (code <= 82) return "阵雨";
        if (code <= 86) return "阵雪";
        if (code <= 99) return "雷暴";
        return "未知天气";
    }
}

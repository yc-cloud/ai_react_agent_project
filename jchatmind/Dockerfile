# ── 第一阶段：Maven 构建 ─────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 先只复制 pom.xml，利用层缓存加速依赖下载
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 再复制源码并打包
COPY src ./src
RUN mvn package -DskipTests -B

# ── 第二阶段：运行时镜像 ─────────────────────────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# 文档存储目录
RUN mkdir -p /app/data/documents

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

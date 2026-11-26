# BarPrice - Lector de Precios por Código de Barras

## Estructura del proyecto

```
barprice/
├── mobile/          # App React Native (Android APK)
│   ├── App.js
│   ├── package.json
│   └── android/
│       └── app/
│           ├── build.gradle
│           └── src/main/AndroidManifest.xml
└── api/             # REST API Spring Boot (Java 17)
    ├── pom.xml
    └── src/main/
        ├── java/com/barprice/
        │   ├── BarPriceApplication.java
        │   ├── Product.java
        │   ├── ProductRepository.java
        │   └── ProductController.java
        └── resources/
            ├── application.properties
            └── data.sql
```

---

## 1. Levantar el API

### Requisitos
- Java 17+
- Maven 3.8+

### Pasos

```bash
cd api
mvn spring-boot:run
```

El servidor arranca en `http://localhost:8080`

### Probar el endpoint

```bash
curl http://localhost:8080/api/products/7501055300057
```

Respuesta esperada:
```json
{
  "barcode": "7501055300057",
  "name": "Coca-Cola 600ml",
  "price": 18.50
}
```

### Consola H2 (base de datos en memoria)
Disponible en: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:barpricedb`
- User: `sa`
- Password: (vacío)

---

## 2. Compilar la App Android

### Requisitos
- Node.js 18+
- React Native CLI
- Android Studio + SDK 33
- JDK 17

### Pasos

```bash
cd mobile

# 1. Instalar dependencias
npm install

# 2. Configurar la IP del servidor en App.js
#    Cambiar: const API_URL = 'http://<your-server-ip>:8080/api/products'
#    Por:     const API_URL = 'http://192.168.x.x:8080/api/products'

# 3. Inicializar proyecto React Native (primera vez)
npx react-native init BarPriceApp --version 0.72.0
# Copiar App.js al proyecto generado

# 4. Generar APK de debug
cd android
./gradlew assembleDebug

# APK generado en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Generar APK de release

```bash
cd android
./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 3. Usar con base de datos real (MySQL/PostgreSQL)

Reemplaza en `application.properties`:

```properties
# MySQL
spring.datasource.url=jdbc:mysql://localhost:3306/barpricedb
spring.datasource.username=<usuario>
spring.datasource.password=<password>
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=update
```

Y agrega en `pom.xml`:
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
</dependency>
```

---

## Flujo de la aplicación

```
[Cámara] → detecta código de barras
         → GET /api/products/{barcode}
         → [Base de datos] retorna producto
         → Muestra nombre y precio en pantalla
```

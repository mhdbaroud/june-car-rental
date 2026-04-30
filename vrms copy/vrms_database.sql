mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.44, for macos15 (arm64)
--
-- Host: localhost    Database: vrms
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_settings`
--

DROP TABLE IF EXISTS `admin_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `description` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_settings`
--

LOCK TABLES `admin_settings` WRITE;
/*!40000 ALTER TABLE `admin_settings` DISABLE KEYS */;
INSERT INTO `admin_settings` VALUES (1,'min_rental_age','21','Minimum age required to rent a vehicle','2026-04-19 13:20:07'),(2,'max_booking_days','30','Maximum number of days for a single booking','2026-04-19 13:20:07'),(3,'cancellation_fee_percent','10','Cancellation fee as percentage of total price','2026-04-19 13:20:07'),(4,'currency','USD','System currency','2026-04-19 13:20:07'),(5,'support_email','support@vrms.com','Support contact email','2026-04-19 13:20:07'),(6,'working_hours','09:00-18:00','Call center working hours','2026-04-19 13:20:07');
/*!40000 ALTER TABLE `admin_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_cancellations`
--

DROP TABLE IF EXISTS `booking_cancellations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_cancellations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `cancelled_by` int NOT NULL,
  `reason` text,
  `cancelled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `cancelled_by` (`cancelled_by`),
  CONSTRAINT `booking_cancellations_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `booking_cancellations_ibfk_2` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_cancellations`
--

LOCK TABLES `booking_cancellations` WRITE;
/*!40000 ALTER TABLE `booking_cancellations` DISABLE KEYS */;
INSERT INTO `booking_cancellations` VALUES (1,3,1,'Cancelled by customer','2026-04-21 08:10:38'),(2,2,1,'Cancelled by customer','2026-04-21 08:10:42'),(3,1,1,'Cancelled by customer','2026-04-21 08:10:47'),(4,5,1,'Cancelled by customer','2026-04-21 08:27:25'),(5,4,1,'Cancelled by customer','2026-04-21 08:27:31'),(6,13,9,'bbb','2026-04-21 11:36:14'),(7,14,9,'no','2026-04-21 18:04:02'),(8,15,9,'jj','2026-04-22 13:42:48'),(9,21,9,'Travel dates changed','2026-04-22 14:32:11'),(10,27,9,'Vehicle not suitable','2026-04-22 15:19:36'),(11,26,9,'Travel dates changed','2026-04-22 15:21:07'),(12,28,9,'Found a better deal','2026-04-22 15:22:24');
/*!40000 ALTER TABLE `booking_cancellations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_extensions`
--

DROP TABLE IF EXISTS `booking_extensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_extensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `new_end_date` date NOT NULL,
  `extra_charge` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `booking_extensions_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_extensions`
--

LOCK TABLES `booking_extensions` WRITE;
/*!40000 ALTER TABLE `booking_extensions` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_extensions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_extras`
--

DROP TABLE IF EXISTS `booking_extras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_extras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `extra_id` int NOT NULL,
  `quantity` int DEFAULT '1',
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `booking_id` (`booking_id`),
  KEY `extra_id` (`extra_id`),
  CONSTRAINT `booking_extras_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_extras_ibfk_2` FOREIGN KEY (`extra_id`) REFERENCES `extras` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_extras`
--

LOCK TABLES `booking_extras` WRITE;
/*!40000 ALTER TABLE `booking_extras` DISABLE KEYS */;
INSERT INTO `booking_extras` VALUES (1,5,1,1,30.00),(2,5,4,1,90.00),(3,12,5,1,21.00),(4,12,3,1,30.00),(5,12,4,1,45.00),(6,12,2,1,24.00),(7,12,1,1,15.00),(8,18,4,1,135.00),(9,21,5,1,21.00),(10,21,4,1,45.00),(11,21,3,1,30.00),(12,21,2,1,24.00),(13,21,1,1,15.00);
/*!40000 ALTER TABLE `booking_extras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed','cancellation_requested','payment_pending','active') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `pickup_location_id` int DEFAULT NULL,
  `return_location_id` int DEFAULT NULL,
  `pickup_time` varchar(10) DEFAULT NULL,
  `return_time` varchar(10) DEFAULT NULL,
  `id_type` varchar(50) DEFAULT NULL,
  `id_number` varchar(100) DEFAULT NULL,
  `id_first_name` varchar(100) DEFAULT NULL,
  `id_last_name` varchar(100) DEFAULT NULL,
  `id_birth_date` date DEFAULT NULL,
  `id_nationality` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `pickup_location_id` (`pickup_location_id`),
  KEY `return_location_id` (`return_location_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`pickup_location_id`) REFERENCES `locations` (`id`),
  CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`return_location_id`) REFERENCES `locations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,1,1,'2026-05-01','2026-05-05',200.00,'cancelled','2026-04-19 13:57:48',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(2,1,1,'2026-04-23','2026-04-29',300.00,'cancelled','2026-04-19 14:31:06',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(3,1,2,'2026-04-21','2026-04-29',360.00,'cancelled','2026-04-19 14:58:59',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(4,1,3,'2026-04-23','2026-04-30',350.00,'cancelled','2026-04-19 15:42:15',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(5,1,13,'2026-04-23','2026-04-29',1200.00,'cancelled','2026-04-21 08:09:55',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,9,2,'2026-04-23','2026-04-30',315.00,'cancelled','2026-04-21 10:22:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(7,9,3,'2026-04-22','2026-04-30',400.00,'completed','2026-04-21 10:34:01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(8,9,3,'2026-05-01','2026-05-09',400.00,'completed','2026-04-21 10:40:05',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,9,5,'2026-04-23','2026-04-30',595.00,'completed','2026-04-21 10:53:45',4,5,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(10,9,6,'2026-04-23','2026-04-30',665.00,'completed','2026-04-21 11:02:33',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(11,9,2,'2026-04-23','2026-04-30',315.00,'cancelled','2026-04-21 11:08:41',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(12,9,2,'2026-04-22','2026-04-25',270.00,'cancelled','2026-04-21 11:11:18',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(13,9,3,'2026-06-13','2026-06-21',400.00,'cancelled','2026-04-21 11:16:48',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(14,9,99,'2026-04-22','2026-05-01',279.00,'cancelled','2026-04-21 18:01:59',4,5,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(15,9,80,'2026-04-24','2026-05-01',595.00,'cancelled','2026-04-22 09:06:04',4,5,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(16,9,99,'2026-04-23','2026-04-26',93.00,'completed','2026-04-22 13:44:48',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(17,9,82,'2026-04-23','2026-04-26',240.00,'completed','2026-04-22 13:47:20',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(18,9,82,'2026-04-30','2026-05-09',855.00,'completed','2026-04-22 14:01:29',5,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(19,9,82,'2026-04-30','2026-05-05',400.00,'completed','2026-04-22 14:07:07',2,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(20,9,98,'2026-04-23','2026-04-26',87.00,'completed','2026-04-22 14:20:48',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(21,9,71,'2026-04-23','2026-04-26',276.00,'cancelled','2026-04-22 14:31:40',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(22,9,77,'2026-04-23','2026-04-26',195.00,'cancelled','2026-04-22 14:55:58',4,9,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(23,9,75,'2026-04-23','2026-04-26',240.00,'cancelled','2026-04-22 14:56:29',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(24,9,70,'2026-04-23','2026-04-26',129.00,'cancelled','2026-04-22 14:58:46',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(25,9,86,'2026-04-23','2026-04-26',264.00,'cancelled','2026-04-22 15:01:49',4,5,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(26,9,78,'2026-04-23','2026-04-26',213.00,'cancelled','2026-04-22 15:10:27',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(27,9,72,'2026-04-23','2026-04-26',114.00,'cancelled','2026-04-22 15:14:04',4,5,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(28,9,88,'2026-04-23','2026-04-26',465.00,'cancelled','2026-04-22 15:16:55',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(29,9,69,'2026-04-23','2026-04-26',150.00,'cancelled','2026-04-22 15:18:45',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(30,9,2,'2026-04-23','2026-04-26',135.00,'cancelled','2026-04-22 15:43:34',4,4,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(31,9,94,'2026-04-23','2026-04-26',84.00,'cancelled','2026-04-22 16:09:41',4,9,'10:00','10:00',NULL,NULL,NULL,NULL,NULL,NULL),(32,9,91,'2026-04-23','2026-04-26',555.00,'cancelled','2026-04-22 16:32:00',4,5,'10:00','10:00','national_id','888888','jj','hh','2000-07-31','Afghan'),(37,1,1,'2026-06-01','2026-06-03',300.00,'payment_pending','2026-04-22 17:02:39',NULL,NULL,NULL,NULL,'passport','123','Test','User','1990-01-01','American'),(38,1,1,'2026-07-01','2026-07-03',300.00,'pending','2026-04-22 17:02:39',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Sedan','Standard 4-door passenger cars'),(2,'SUV','Sport utility vehicles'),(3,'Truck','Pickup trucks and cargo vehicles'),(4,'Van','Minivans and passenger vans'),(5,'Luxury','Premium and luxury vehicles'),(6,'Economy','Budget-friendly compact cars');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_licenses`
--

DROP TABLE IF EXISTS `driver_licenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_licenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `date_of_birth` date NOT NULL,
  `expiry_date` date NOT NULL,
  `country` varchar(100) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `verified_by` (`verified_by`),
  CONSTRAINT `driver_licenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `driver_licenses_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_licenses`
--

LOCK TABLES `driver_licenses` WRITE;
/*!40000 ALTER TABLE `driver_licenses` DISABLE KEYS */;
INSERT INTO `driver_licenses` VALUES (1,1,'DL123456','1995-01-01','2028-01-01','Turkey',NULL,'verified',2,NULL,'2026-04-19 13:57:13'),(3,3,'DL-JOHN-001','1990-05-15','2028-05-15','USA',NULL,'verified',2,NULL,'2026-04-19 14:41:01'),(4,4,'DL-SARAH-001','1992-08-22','2029-08-22','USA',NULL,'verified',2,NULL,'2026-04-19 14:41:01'),(5,9,'TEST123456','2001-03-03','2030-01-01',NULL,NULL,'verified',NULL,NULL,'2026-04-21 10:22:33');
/*!40000 ALTER TABLE `driver_licenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `extras`
--

DROP TABLE IF EXISTS `extras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `extras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price_per_day` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `extras`
--

LOCK TABLES `extras` WRITE;
/*!40000 ALTER TABLE `extras` DISABLE KEYS */;
INSERT INTO `extras` VALUES (1,'GPS Navigation','Portable GPS device',5.00,1),(2,'Child Seat','Safety seat for children',8.00,1),(3,'Extra Driver','Add an additional authorized driver',10.00,1),(4,'Full Insurance','Full coverage insurance',15.00,1),(5,'Wi-Fi Hotspot','Mobile Wi-Fi device',7.00,1);
/*!40000 ALTER TABLE `extras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `city` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` text NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `working_hours` varchar(50) DEFAULT '08:00-20:00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'Istanbul','Istanbul Ataturk Office','Ataturk Airport, Yesilkoy, Istanbul','+90 212 123 4567','06:00-24:00',1),(2,'Istanbul','Istanbul Sabiha Office','Sabiha Gokcen Airport, Pendik, Istanbul','+90 216 123 4567','06:00-24:00',1),(3,'Istanbul','Istanbul City Center','Taksim Square, Beyoglu, Istanbul','+90 212 234 5678','08:00-22:00',1),(4,'Ankara','Ankara Esenboga Office','Esenboga Airport, Ankara','+90 312 123 4567','06:00-24:00',1),(5,'Ankara','Ankara City Center','Kizilay Square, Cankaya, Ankara','+90 312 234 5678','08:00-20:00',1),(6,'Izmir','Izmir Adnan Menderes Office','Adnan Menderes Airport, Izmir','+90 232 123 4567','06:00-24:00',1),(7,'Izmir','Izmir City Center','Konak Square, Izmir','+90 232 234 5678','08:00-20:00',1),(8,'Bursa','Bursa City Center','Osmangazi Square, Bursa','+90 224 123 4567','08:00-20:00',1),(9,'Antalya','Antalya Airport Office','Antalya Airport, Antalya','+90 242 123 4567','06:00-24:00',1),(10,'Antalya','Antalya City Center','Kaleici, Antalya','+90 242 234 5678','08:00-20:00',1);
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_logs`
--

DROP TABLE IF EXISTS `maintenance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `admin_id` int NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `description` text,
  `status` enum('scheduled','in_progress','completed') DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `maintenance_logs_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `maintenance_logs_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_logs`
--

LOCK TABLES `maintenance_logs` WRITE;
/*!40000 ALTER TABLE `maintenance_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('booking','payment','return','system','support') DEFAULT 'system',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'Booking Confirmed','Your booking for vehicle #1 has been confirmed from 2026-05-01 to 2026-05-05','booking',0,'2026-04-19 13:57:48'),(2,1,'Booking Confirmed','Your booking for vehicle #1 has been confirmed from 2026-04-23 to 2026-04-29','booking',0,'2026-04-19 14:31:06'),(3,1,'Booking Confirmed','Your booking for vehicle #2 has been confirmed from 2026-04-21 to 2026-04-29','booking',0,'2026-04-19 14:58:59'),(4,1,'Payment Successful','Payment of $360 confirmed for booking #3','payment',0,'2026-04-19 15:00:17'),(5,1,'Booking Confirmed','Your booking for vehicle #3 has been confirmed from 2026-04-23 to 2026-04-30','booking',0,'2026-04-19 15:42:15'),(6,1,'Payment Successful','Payment of $350 confirmed for booking #4','payment',0,'2026-04-19 15:42:43'),(7,1,'Booking Confirmed','Your booking for vehicle #13 has been confirmed from 2026-04-23 to 2026-04-29','booking',0,'2026-04-21 08:09:55'),(8,1,'Payment Successful','Payment of $1200 confirmed for booking #5','payment',0,'2026-04-21 08:10:13'),(9,1,'Booking Cancelled','Your booking #3 has been cancelled','booking',0,'2026-04-21 08:10:38'),(10,1,'Booking Cancelled','Your booking #2 has been cancelled','booking',0,'2026-04-21 08:10:42'),(11,1,'Booking Cancelled','Your booking #1 has been cancelled','booking',0,'2026-04-21 08:10:47'),(12,1,'Cancellation Requested','Your cancellation request for booking #5 has been submitted and is awaiting admin approval.','booking',0,'2026-04-21 08:27:25'),(13,1,'Cancellation Requested','Your cancellation request for booking #4 has been submitted and is awaiting admin approval.','booking',0,'2026-04-21 08:27:31'),(14,1,'Cancellation Approved','Your cancellation request for booking #5 has been approved. Your booking is now cancelled.','booking',0,'2026-04-21 08:58:45'),(15,1,'Cancellation Approved','Your cancellation request for booking #4 has been approved. Your booking is now cancelled.','booking',0,'2026-04-21 08:58:48'),(16,9,'Booking Confirmed','Your booking for vehicle #2 has been confirmed from 2026-04-23 to 2026-04-30','booking',0,'2026-04-21 10:22:43'),(17,9,'Payment Successful','Payment of $315 confirmed for booking #6','payment',0,'2026-04-21 10:23:07'),(18,9,'Booking Confirmed','Your booking for vehicle #3 has been confirmed from 2026-04-22 to 2026-04-30','booking',0,'2026-04-21 10:34:01'),(19,9,'Payment Submitted','Your payment of $400 for booking #7 is awaiting admin confirmation.','payment',0,'2026-04-21 10:36:34'),(20,9,'Payment Confirmed','Your payment for booking #7 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 10:37:17'),(21,9,'Booking Confirmed','Your booking for vehicle #3 has been confirmed from 2026-05-01 to 2026-05-09','booking',0,'2026-04-21 10:40:05'),(22,9,'Payment Submitted','Your payment of $400 for booking #8 is awaiting admin confirmation.','payment',0,'2026-04-21 10:46:30'),(23,9,'Payment Confirmed','Your payment for booking #8 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 10:47:03'),(24,9,'Booking Received','Your booking #9 has been received. Please proceed to payment.','booking',0,'2026-04-21 10:53:45'),(25,9,'Payment Submitted','Your payment of $595 for booking #9 is awaiting admin confirmation.','payment',0,'2026-04-21 10:54:03'),(26,9,'Payment Confirmed','Your payment for booking #9 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 10:54:33'),(27,9,'Booking Received','Your booking #10 has been received. Please proceed to payment.','booking',0,'2026-04-21 11:02:33'),(28,9,'Payment Submitted','Your payment of $665 for booking #10 is awaiting admin confirmation.','payment',0,'2026-04-21 11:02:46'),(29,9,'Payment Confirmed','Your payment for booking #10 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 11:02:57'),(30,9,'Booking Received','Your booking #11 has been received. Please proceed to payment.','booking',0,'2026-04-21 11:08:41'),(31,9,'Payment Submitted','Your payment of $315 for booking #11 is awaiting admin confirmation.','payment',0,'2026-04-21 11:08:55'),(32,9,'Payment Confirmed','Your payment for booking #11 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 11:09:14'),(33,9,'Booking Received','Your booking #12 has been received. Please proceed to payment.','booking',0,'2026-04-21 11:11:18'),(34,9,'Payment Submitted','Your payment of $270 for booking #12 is awaiting admin confirmation.','payment',0,'2026-04-21 11:11:24'),(35,9,'Booking Received','Your booking #13 has been received. Please proceed to payment.','booking',0,'2026-04-21 11:16:48'),(36,9,'Payment Submitted','Your payment of $400 for booking #13 is awaiting admin confirmation.','payment',0,'2026-04-21 11:23:44'),(37,9,'Payment Confirmed','Your payment for booking #13 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 11:24:15'),(38,9,'Payment Confirmed','Your payment for booking #12 has been confirmed. Your booking is now active!','payment',0,'2026-04-21 11:30:47'),(39,9,'Cancellation Requested','Your cancellation request for booking #13 has been submitted.','booking',0,'2026-04-21 11:36:14'),(40,9,'Cancellation Approved','Your cancellation request for booking #13 has been approved.','booking',0,'2026-04-21 11:41:23'),(41,9,'Booking Received','Your booking #14 has been received. Please proceed to payment.','booking',0,'2026-04-21 18:01:59'),(42,9,'Cancellation Requested','Your cancellation request for booking #14 has been submitted.','booking',0,'2026-04-21 18:04:02'),(43,9,'Cancellation Approved','Your cancellation request for booking #14 has been approved.','booking',0,'2026-04-21 18:06:20'),(44,9,'Booking Received','Your booking #15 has been received. Please proceed to payment.','booking',0,'2026-04-22 09:06:04'),(45,9,'Payment Submitted','Your payment of $595 for booking #15 is awaiting admin confirmation.','payment',0,'2026-04-22 09:08:19'),(46,9,'Payment Confirmed','Your payment for booking #15 has been confirmed. Your booking is now active!','payment',0,'2026-04-22 09:10:22'),(47,9,'Cancellation Requested','Your cancellation request for booking #15 has been submitted.','booking',0,'2026-04-22 13:42:48'),(48,9,'Cancellation Approved','Your cancellation request for booking #15 has been approved.','booking',0,'2026-04-22 13:43:33'),(49,9,'Booking Received','Your booking #16 has been received. Please proceed to payment.','booking',0,'2026-04-22 13:44:48'),(50,9,'Payment Submitted','Your payment of $93 for booking #16 is awaiting admin confirmation.','payment',0,'2026-04-22 13:45:34'),(51,9,'Booking Received','Your booking #17 has been received. Please proceed to payment.','booking',0,'2026-04-22 13:47:20'),(52,9,'Payment Submitted','Your payment of $240 for booking #17 is awaiting admin confirmation.','payment',0,'2026-04-22 13:48:58'),(53,9,'Payment Confirmed','Your payment for booking #17 has been confirmed. Your booking is now active!','payment',0,'2026-04-22 13:58:21'),(54,9,'Booking Received','Your booking #18 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:01:29'),(55,9,'Payment Submitted','Your payment of $855 for booking #18 is awaiting admin confirmation.','payment',0,'2026-04-22 14:01:45'),(56,9,'Payment Confirmed','Your payment for booking #16 has been confirmed. Your booking is now active!','payment',0,'2026-04-22 14:05:08'),(57,9,'Booking Received','Your booking #19 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:07:07'),(58,9,'Payment Submitted','Your payment of $400 for booking #19 is awaiting admin confirmation.','payment',0,'2026-04-22 14:07:46'),(59,9,'Booking Received','Your booking #20 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:20:48'),(60,9,'Payment Submitted','Your payment of $87 for booking #20 is awaiting admin confirmation.','payment',0,'2026-04-22 14:21:09'),(61,9,'Payment Confirmed','Your payment for booking #20 has been confirmed. Your booking is now active!','payment',0,'2026-04-22 14:21:20'),(62,9,'Booking Received','Your booking #21 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:31:40'),(63,9,'Payment Submitted','Your payment of $276 for booking #21 is awaiting admin confirmation.','payment',0,'2026-04-22 14:31:56'),(64,9,'Cancellation Requested','Your cancellation request for booking #21 has been submitted.','booking',0,'2026-04-22 14:32:11'),(65,9,'Cancellation Approved','Your cancellation request for booking #21 has been approved.','booking',0,'2026-04-22 14:32:30'),(66,9,'Booking Received','Your booking #22 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:55:58'),(67,9,'Payment Submitted','Your payment of $195 for booking #22 is awaiting admin confirmation.','payment',0,'2026-04-22 14:56:18'),(68,9,'Booking Received','Your booking #23 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:56:29'),(69,9,'Booking Received','Your booking #24 has been received. Please proceed to payment.','booking',0,'2026-04-22 14:58:46'),(70,9,'Payment Submitted','Your payment of $129 for booking #24 is awaiting admin confirmation.','payment',0,'2026-04-22 14:58:59'),(71,9,'Booking Received','Your booking #25 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:01:49'),(72,9,'Payment Submitted','Your payment of $264 for booking #25 is awaiting admin confirmation.','payment',0,'2026-04-22 15:02:01'),(73,9,'Booking Received','Your booking #26 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:10:27'),(74,9,'Booking Received','Your booking #27 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:14:04'),(75,9,'Payment Submitted','Your payment of $114 for booking #27 is awaiting admin confirmation.','payment',0,'2026-04-22 15:14:11'),(76,9,'Booking Received','Your booking #28 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:16:55'),(77,9,'Booking Received','Your booking #29 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:18:45'),(78,9,'Cancellation Requested','Your cancellation request for booking #27 has been submitted.','booking',0,'2026-04-22 15:19:36'),(79,9,'Cancellation Requested','Your cancellation request for booking #26 has been submitted.','booking',0,'2026-04-22 15:21:07'),(80,9,'Cancellation Requested','Your cancellation request for booking #28 has been submitted.','booking',0,'2026-04-22 15:22:24'),(81,9,'Cancellation Approved','Your cancellation request for booking #28 has been approved.','booking',0,'2026-04-22 15:26:01'),(82,9,'Cancellation Approved','Your cancellation request for booking #27 has been approved.','booking',0,'2026-04-22 15:26:05'),(83,9,'Cancellation Approved','Your cancellation request for booking #26 has been approved.','booking',0,'2026-04-22 15:26:07'),(84,9,'Booking Received','Your booking #30 has been received. Please proceed to payment.','booking',0,'2026-04-22 15:43:34'),(85,9,'Payment Submitted','Your payment of $135 for booking #30 is awaiting admin confirmation.','payment',0,'2026-04-22 15:50:57'),(86,9,'Payment Rejected','Your payment for booking #30 was rejected. Please resubmit with correct information.','payment',0,'2026-04-22 16:08:13'),(87,9,'Booking Received','Your booking #31 has been received. Please proceed to payment.','booking',0,'2026-04-22 16:09:41'),(88,9,'Payment Submitted','Your payment of $84 for booking #31 is awaiting admin confirmation.','payment',0,'2026-04-22 16:10:15'),(89,9,'Booking Received','Your booking #32 has been received. Please proceed to payment.','booking',0,'2026-04-22 16:32:00'),(90,9,'Payment Submitted','Your payment of $555 for booking #32 is awaiting admin confirmation.','payment',0,'2026-04-22 16:32:26'),(91,9,'Payment Confirmed','Your payment for booking #32 has been confirmed. Your booking is now active!','payment',0,'2026-04-22 16:32:40'),(92,1,'Payment Submitted','Your payment of $300 for booking #37 is awaiting admin confirmation.','payment',0,'2026-04-22 17:02:39');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_history`
--

DROP TABLE IF EXISTS `password_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_history`
--

LOCK TABLES `password_history` WRITE;
/*!40000 ALTER TABLE `password_history` DISABLE KEYS */;
INSERT INTO `password_history` VALUES (1,9,'$2b$10$JozfdHnBukvhFjKOd9hvc.oHXkas2stToobixU04tHPEv0et.I0em','2026-04-21 13:16:37');
/*!40000 ALTER TABLE `password_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,9,'450679','2026-04-21 13:26:07',1,'2026-04-21 13:11:07'),(2,9,'404059','2026-04-21 13:30:37',1,'2026-04-21 13:15:36'),(3,9,'380993','2026-04-21 13:31:12',1,'2026-04-21 13:16:12');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` enum('credit_card','debit_card','cash','online') DEFAULT 'online',
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,3,360.00,'credit_card','completed','2026-04-19 15:00:17'),(2,4,350.00,'credit_card','completed','2026-04-19 15:42:43'),(3,5,1200.00,'credit_card','completed','2026-04-21 08:10:13'),(4,6,315.00,'credit_card','completed','2026-04-21 10:23:07'),(5,7,400.00,'credit_card','completed','2026-04-21 10:36:34'),(6,8,400.00,'credit_card','completed','2026-04-21 10:46:30'),(7,9,595.00,'credit_card','completed','2026-04-21 10:54:03'),(8,10,665.00,'credit_card','completed','2026-04-21 11:02:46'),(9,11,315.00,'credit_card','completed','2026-04-21 11:08:55'),(10,12,270.00,'cash','completed','2026-04-21 11:11:24'),(11,13,400.00,'cash','completed','2026-04-21 11:23:44'),(12,15,595.00,'credit_card','completed','2026-04-22 09:08:19'),(13,16,93.00,'credit_card','completed','2026-04-22 13:45:34'),(14,17,240.00,'credit_card','completed','2026-04-22 13:48:58'),(15,18,855.00,'credit_card','pending','2026-04-22 14:01:45'),(16,19,400.00,'cash','pending','2026-04-22 14:07:46'),(17,20,87.00,'credit_card','completed','2026-04-22 14:21:09'),(18,21,276.00,'credit_card','pending','2026-04-22 14:31:56'),(19,22,195.00,'credit_card','pending','2026-04-22 14:56:18'),(20,24,129.00,'credit_card','pending','2026-04-22 14:58:59'),(21,25,264.00,'credit_card','pending','2026-04-22 15:02:01'),(22,27,114.00,'credit_card','pending','2026-04-22 15:14:11'),(23,30,135.00,'credit_card','failed','2026-04-22 15:50:57'),(24,31,84.00,'credit_card','pending','2026-04-22 16:10:15'),(25,32,555.00,'credit_card','completed','2026-04-22 16:32:26'),(26,37,300.00,'cash','pending','2026-04-22 17:02:39');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text,
  `status` enum('pending','completed','rejected') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_responses`
--

DROP TABLE IF EXISTS `review_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `admin_id` int NOT NULL,
  `response` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_id` (`review_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `review_responses_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`),
  CONSTRAINT `review_responses_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_responses`
--

LOCK TABLES `review_responses` WRITE;
/*!40000 ALTER TABLE `review_responses` DISABLE KEYS */;
/*!40000 ALTER TABLE `review_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `booking_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `user_id` (`user_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,1,1,1,5,'Excellent car! Very clean and comfortable. Will definitely rent again.','2026-04-19 14:41:01'),(2,1,1,2,4,'Great vehicle, smooth ride. Pickup process was quick and easy.','2026-04-19 14:41:01');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_cards`
--

DROP TABLE IF EXISTS `saved_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `card_name` varchar(100) NOT NULL,
  `last_four` varchar(4) NOT NULL,
  `expiry` varchar(5) NOT NULL,
  `card_type` varchar(20) NOT NULL DEFAULT 'Card',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `card_number` varchar(19) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_cards`
--

LOCK TABLES `saved_cards` WRITE;
/*!40000 ALTER TABLE `saved_cards` DISABLE KEYS */;
INSERT INTO `saved_cards` VALUES (2,9,'hh','5676','11/29','Card','2026-04-22 15:13:50','1234 5654 3234 5676'),(3,1,'Good Card','9999','12/28','Visa','2026-04-22 17:02:40','');
/*!40000 ALTER TABLE `saved_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_vehicles`
--

DROP TABLE IF EXISTS `saved_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `vehicle_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_saved` (`user_id`,`vehicle_id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `saved_vehicles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saved_vehicles_ibfk_2` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_vehicles`
--

LOCK TABLES `saved_vehicles` WRITE;
/*!40000 ALTER TABLE `saved_vehicles` DISABLE KEYS */;
/*!40000 ALTER TABLE `saved_vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_progress','resolved','closed') DEFAULT 'open',
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `support_tickets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (1,1,'Question about booking extension','Hi, I would like to know how I can extend my current booking by 2 more days.','open','medium','2026-04-19 14:41:01'),(2,3,'Vehicle condition on return','I noticed a small scratch on the car when I picked it up. Please note this before my return.','in_progress','high','2026-04-19 14:41:01');
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket_responses`
--

DROP TABLE IF EXISTS `ticket_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `user_id` int NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `ticket_responses_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_responses_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket_responses`
--

LOCK TABLES `ticket_responses` WRITE;
/*!40000 ALTER TABLE `ticket_responses` DISABLE KEYS */;
INSERT INTO `ticket_responses` VALUES (1,2,2,'Thank you for letting us know. We have noted the pre-existing scratch in our system. You will not be charged for it upon return.','2026-04-19 14:41:01');
/*!40000 ALTER TABLE `ticket_responses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `role` enum('customer','admin','callcenter') DEFAULT 'customer',
  `status` enum('active','suspended') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `city` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test User','test@test.com','$2b$10$/0zvLkupf65MX0n7WMYGQ.5i4wzU4gMmKbCp.B4CMKsou5oFzeRfy','1234567890',NULL,'customer','active','2026-04-19 13:46:24',NULL),(2,'Admin','m7md.barood@gmail.com','$2b$10$wzCngq.bEovqLqWqurLFYOuPsAL/FwXLgdBc4FunbXnp3qJ5Ty6F2','0000000000',NULL,'admin','active','2026-04-19 13:50:14','Istanbul '),(3,'John Smith','john@test.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','+1234567891','1990-05-15','customer','active','2026-04-19 14:41:01',NULL),(4,'Sarah Johnson','sarah@test.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','+1234567892','1992-08-22','customer','active','2026-04-19 14:41:01',NULL),(5,'Call Center Agent','agent@vrms.com','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','+1234567893','1988-03-10','callcenter','active','2026-04-19 14:41:01',NULL),(6,'mhd','mhd@vrms.com','$2b$10$iPZjpOX1M/6h9y3BPkzfn.q6xITng/Oi/b3ETNhn4bOVG451VgGw6','5550000002','2004-04-23','customer','active','2026-04-21 09:20:34',NULL),(7,'jj june','jj@vrms.com','$2b$10$tshs/EWMPEmpc4dq9CZBd.m0jvxEs00.Oo5rPXr5xkWHm8kqJxLDG','5511234567','2000-08-22','customer','active','2026-04-21 09:25:01',NULL),(8,'hh hh','hh@vrms.com','$2b$10$Sx.QtCbVPAjxxyaA/9kQgOJ/xxFxx1YbhBgr6TYinxpf0I.eK4z6a','123456','2000-04-21','customer','active','2026-04-21 09:27:09',NULL),(9,'jj','mounir.barood@gmail.com','$2b$10$6IWV4gnxvbPS.pNaftgsiepiN6yEOjI/16tA.OWmG.ZBbBGtkmso2','05550000000','2001-03-03','customer','active','2026-04-21 09:44:36','istanbul');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_availability`
--

DROP TABLE IF EXISTS `vehicle_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `blocked_date` date NOT NULL,
  `reason` enum('maintenance','booked','other') DEFAULT 'other',
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `vehicle_availability_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_availability`
--

LOCK TABLES `vehicle_availability` WRITE;
/*!40000 ALTER TABLE `vehicle_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_documents`
--

DROP TABLE IF EXISTS `vehicle_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `doc_type` enum('registration','insurance','inspection','other') NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `vehicle_documents_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_documents`
--

LOCK TABLES `vehicle_documents` WRITE;
/*!40000 ALTER TABLE `vehicle_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_images`
--

DROP TABLE IF EXISTS `vehicle_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_id` int NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vehicle_id` (`vehicle_id`),
  CONSTRAINT `vehicle_images_ibfk_1` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_images`
--

LOCK TABLES `vehicle_images` WRITE;
/*!40000 ALTER TABLE `vehicle_images` DISABLE KEYS */;
INSERT INTO `vehicle_images` VALUES (202,1,'https://cdn.imagin.studio/getimage?customer=img&make=toyota&modelFamily=camry&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(203,2,'https://cdn.imagin.studio/getimage?customer=img&make=toyota&modelFamily=corolla&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(204,3,'https://cdn.imagin.studio/getimage?customer=img&make=honda&modelFamily=civic&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(205,4,'https://cdn.imagin.studio/getimage?customer=img&make=hyundai&modelFamily=elantra&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(206,5,'https://cdn.imagin.studio/getimage?customer=img&make=toyota&modelFamily=rav4&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(207,6,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=explorer&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(208,7,'https://cdn.imagin.studio/getimage?customer=img&make=hyundai&modelFamily=tucson&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(209,8,'https://cdn.imagin.studio/getimage?customer=img&make=kia&modelFamily=sportage&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(210,9,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=f-150&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(211,10,'https://cdn.imagin.studio/getimage?customer=img&make=toyota&modelFamily=hilux&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(212,11,'https://cdn.imagin.studio/getimage?customer=img&make=mercedes-benz&modelFamily=sprinter&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(213,12,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=transit&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(214,13,'https://cdn.imagin.studio/getimage?customer=img&make=bmw&modelFamily=5-series&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(215,14,'https://cdn.imagin.studio/getimage?customer=img&make=mercedes-benz&modelFamily=e-class&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(216,15,'https://cdn.imagin.studio/getimage?customer=img&make=audi&modelFamily=a6&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(217,16,'https://cdn.imagin.studio/getimage?customer=img&make=kia&modelFamily=picanto&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(218,17,'https://cdn.imagin.studio/getimage?customer=img&make=hyundai&modelFamily=i10&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(219,68,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=focus&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(220,69,'https://cdn.imagin.studio/getimage?customer=img&make=volkswagen&modelFamily=jetta&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(221,70,'https://cdn.imagin.studio/getimage?customer=img&make=nissan&modelFamily=sentra&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(222,71,'https://cdn.imagin.studio/getimage?customer=img&make=mazda&modelFamily=mazda3&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(223,72,'https://cdn.imagin.studio/getimage?customer=img&make=renault&modelFamily=megane&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(224,73,'https://cdn.imagin.studio/getimage?customer=img&make=peugeot&modelFamily=301&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(225,74,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=escape&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(226,75,'https://cdn.imagin.studio/getimage?customer=img&make=volkswagen&modelFamily=tiguan&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(227,76,'https://cdn.imagin.studio/getimage?customer=img&make=mazda&modelFamily=cx-5&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(228,77,'https://cdn.imagin.studio/getimage?customer=img&make=renault&modelFamily=kadjar&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(229,78,'https://cdn.imagin.studio/getimage?customer=img&make=jeep&modelFamily=renegade&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(230,79,'https://cdn.imagin.studio/getimage?customer=img&make=nissan&modelFamily=x-trail&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(231,80,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=ranger&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(232,81,'https://cdn.imagin.studio/getimage?customer=img&make=nissan&modelFamily=navara&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(233,82,'https://cdn.imagin.studio/getimage?customer=img&make=mitsubishi&modelFamily=l200&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(234,83,'https://cdn.imagin.studio/getimage?customer=img&make=isuzu&modelFamily=d-max&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(235,84,'https://cdn.imagin.studio/getimage?customer=img&make=ford&modelFamily=transit&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(236,85,'https://cdn.imagin.studio/getimage?customer=img&make=volkswagen&modelFamily=transporter&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(237,86,'https://cdn.imagin.studio/getimage?customer=img&make=renault&modelFamily=trafic&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(238,87,'https://cdn.imagin.studio/getimage?customer=img&make=fiat&modelFamily=ducato&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(239,88,'https://cdn.imagin.studio/getimage?customer=img&make=audi&modelFamily=a4&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(240,89,'https://cdn.imagin.studio/getimage?customer=img&make=mercedes-benz&modelFamily=e-class&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(241,90,'https://cdn.imagin.studio/getimage?customer=img&make=bmw&modelFamily=5-series&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(242,91,'https://cdn.imagin.studio/getimage?customer=img&make=audi&modelFamily=a6&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(243,92,'https://cdn.imagin.studio/getimage?customer=img&make=volvo&modelFamily=s90&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(244,93,'https://cdn.imagin.studio/getimage?customer=img&make=renault&modelFamily=clio&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(245,94,'https://cdn.imagin.studio/getimage?customer=img&make=fiat&modelFamily=punto&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(246,95,'https://cdn.imagin.studio/getimage?customer=img&make=volkswagen&modelFamily=polo&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(247,96,'https://cdn.imagin.studio/getimage?customer=img&make=toyota&modelFamily=yaris&modelYear=2023&angle=23',1,'2026-04-21 12:43:34'),(248,97,'https://cdn.imagin.studio/getimage?customer=img&make=kia&modelFamily=picanto&modelYear=2022&angle=23',1,'2026-04-21 12:43:34'),(249,98,'https://cdn.imagin.studio/getimage?customer=img&make=nissan&modelFamily=micra&modelYear=2021&angle=23',1,'2026-04-21 12:43:34'),(250,99,'https://cdn.imagin.studio/getimage?customer=img&make=peugeot&modelFamily=208&modelYear=2022&angle=23',1,'2026-04-21 12:43:34');
/*!40000 ALTER TABLE `vehicle_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_returns`
--

DROP TABLE IF EXISTS `vehicle_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `return_date` date NOT NULL,
  `condition` enum('good','minor_damage','major_damage') DEFAULT 'good',
  `extra_charge` decimal(10,2) DEFAULT '0.00',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  CONSTRAINT `vehicle_returns_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_returns`
--

LOCK TABLES `vehicle_returns` WRITE;
/*!40000 ALTER TABLE `vehicle_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `brand` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  `year` int DEFAULT NULL,
  `plate_number` varchar(20) DEFAULT NULL,
  `price_per_day` decimal(10,2) NOT NULL,
  `status` enum('available','rented','maintenance') DEFAULT 'available',
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate_number` (`plate_number`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,1,'Toyota','Camry',2023,'ABC123',50.00,'available','Comfortable sedan','2026-04-19 13:53:13'),(2,1,'Toyota','Corolla',2022,'TYC-2022',45.00,'rented','Reliable and fuel-efficient sedan, perfect for city driving.','2026-04-19 14:41:01'),(3,1,'Honda','Civic',2023,'HNC-2023',50.00,'available','Sporty and comfortable sedan with modern features.','2026-04-19 14:41:01'),(4,1,'Hyundai','Elantra',2022,'HYE-2022',40.00,'available','Elegant sedan with excellent fuel economy.','2026-04-19 14:41:01'),(5,2,'Toyota','RAV4',2023,'TYR-2023',85.00,'available','Spacious SUV with advanced safety features, great for families.','2026-04-19 14:41:01'),(6,2,'Ford','Explorer',2022,'FDE-2022',95.00,'available','Powerful SUV with 7-seat capacity and premium interior.','2026-04-19 14:41:01'),(7,2,'Hyundai','Tucson',2023,'HYT-2023',75.00,'available','Modern SUV with panoramic sunroof and smart features.','2026-04-19 14:41:01'),(8,2,'Kia','Sportage',2022,'KIS-2022',70.00,'available','Stylish compact SUV with excellent handling.','2026-04-19 14:41:01'),(9,3,'Ford','F-150',2022,'FDF-2022',110.00,'available','America\'s best-selling truck, powerful and versatile.','2026-04-19 14:41:01'),(10,3,'Toyota','Hilux',2023,'TYH-2023',80.00,'available','Legendary pickup truck known for reliability and durability.','2026-04-19 14:41:01'),(11,4,'Mercedes','Sprinter',2022,'MBS-2022',120.00,'available','Premium cargo van with large capacity, ideal for group travel.','2026-04-19 14:41:01'),(12,4,'Ford','Transit',2023,'FDT-2023',105.00,'available','Versatile passenger van with comfortable seating for 12.','2026-04-19 14:41:01'),(13,5,'BMW','5 Series',2023,'BMW-2023',180.00,'available','Luxury executive sedan with cutting-edge technology and comfort.','2026-04-19 14:41:01'),(14,5,'Mercedes','E-Class',2023,'MBE-2023',190.00,'available','Iconic luxury sedan with premium leather interior and advanced driver assistance.','2026-04-19 14:41:01'),(15,5,'Audi','A6',2022,'AUA-2022',170.00,'available','Sophisticated luxury sedan with quattro all-wheel drive.','2026-04-19 14:41:01'),(16,6,'Kia','Picanto',2022,'KIP-2022',30.00,'available','Compact economy car, perfect for budget-conscious travelers.','2026-04-19 14:41:01'),(17,6,'Hyundai','i10',2023,'HYI-2023',28.00,'available','Small and efficient city car with low running costs.','2026-04-19 14:41:01'),(68,1,'Ford','Focus',2021,'FRF-001',40.00,'available','Compact sedan ideal for city driving','2026-04-21 11:57:08'),(69,1,'Volkswagen','Jetta',2023,'VWJ-001',50.00,'rented','German engineering at its finest','2026-04-21 11:57:08'),(70,1,'Nissan','Sentra',2022,'NSS-001',43.00,'rented','Comfortable and spacious sedan','2026-04-21 11:57:08'),(71,1,'Mazda','3',2022,'MZT-001',47.00,'available','Fun to drive compact sedan','2026-04-21 11:57:08'),(72,1,'Renault','Megane',2021,'RNM-001',38.00,'available','French elegance and practicality','2026-04-21 11:57:08'),(73,1,'Peugeot','301',2022,'PGT-001',39.00,'available','Comfortable family sedan','2026-04-21 11:57:08'),(74,2,'Ford','Escape',2022,'FRE-001',69.00,'available','Agile and efficient SUV','2026-04-21 11:57:08'),(75,2,'Volkswagen','Tiguan',2023,'VWG-001',80.00,'rented','Premium German SUV','2026-04-21 11:57:08'),(76,2,'Mazda','CX-5',2022,'MZC-001',76.00,'available','Award-winning SUV design','2026-04-21 11:57:08'),(77,2,'Renault','Kadjar',2021,'RNK-001',65.00,'rented','Comfortable crossover SUV','2026-04-21 11:57:08'),(78,2,'Jeep','Renegade',2022,'JPR-001',71.00,'available','Rugged and capable SUV','2026-04-21 11:57:08'),(79,2,'Nissan','X-Trail',2023,'NSX-001',73.00,'available','Versatile family SUV','2026-04-21 11:57:08'),(80,3,'Ford','Ranger',2022,'FRR-001',85.00,'available','Powerful pickup truck','2026-04-21 11:57:08'),(81,3,'Nissan','Navara',2022,'NSN-001',82.00,'available','Tough and capable truck','2026-04-21 11:57:08'),(82,3,'Mitsubishi','L200',2021,'MTL-001',80.00,'available','Durable work truck','2026-04-21 11:57:08'),(83,3,'Isuzu','D-Max',2022,'ISD-001',83.00,'available','Heavy duty pickup truck','2026-04-21 11:57:08'),(84,4,'Ford','Transit',2022,'FRT-001',95.00,'available','Large cargo and passenger van','2026-04-21 11:57:08'),(85,4,'Volkswagen','Transporter',2022,'VWT-001',100.00,'available','Versatile commercial van','2026-04-21 11:57:08'),(86,4,'Renault','Trafic',2021,'RNT-001',88.00,'rented','Practical medium van','2026-04-21 11:57:08'),(87,4,'Fiat','Ducato',2022,'FTD-001',92.00,'available','Spacious cargo van','2026-04-21 11:57:08'),(88,5,'Audi','A4',2023,'ADI-001',155.00,'available','Sophisticated German luxury','2026-04-21 11:57:08'),(89,5,'Mercedes','E-Class',2022,'MBE-001',180.00,'available','Executive luxury sedan','2026-04-21 11:57:08'),(90,5,'BMW','5 Series',2023,'BM5-001',190.00,'available','Business class luxury','2026-04-21 11:57:08'),(91,5,'Audi','A6',2022,'ADA-001',185.00,'available','Refined luxury performance','2026-04-21 11:57:08'),(92,5,'Volvo','S90',2022,'VLS-001',165.00,'available','Scandinavian luxury and safety','2026-04-21 11:57:08'),(93,6,'Renault','Clio',2022,'RNC-001',30.00,'available','Budget friendly city car','2026-04-21 11:57:08'),(94,6,'Fiat','Punto',2021,'FTP-001',28.00,'rented','Compact and economical','2026-04-21 11:57:08'),(95,6,'Volkswagen','Polo',2022,'VWP-001',35.00,'available','Economy with German quality','2026-04-21 11:57:08'),(96,6,'Toyota','Yaris',2023,'TYY-001',33.00,'available','Fuel efficient city runabout','2026-04-21 11:57:08'),(97,6,'Kia','Picanto',2022,'KAP-001',27.00,'available','Tiny but mighty city car','2026-04-21 11:57:08'),(98,6,'Nissan','Micra',2021,'NSM-001',29.00,'available','Easy to park city car','2026-04-21 11:57:08'),(99,6,'Peugeot','208',2022,'PG2-001',31.00,'available','Stylish French economy car','2026-04-21 11:57:08');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verification_codes`
--

DROP TABLE IF EXISTS `verification_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `code` varchar(6) NOT NULL,
  `user_id` int NOT NULL,
  `expires_at` bigint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_codes`
--

LOCK TABLES `verification_codes` WRITE;
/*!40000 ALTER TABLE `verification_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_codes` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-22 21:08:38

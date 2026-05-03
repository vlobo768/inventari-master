-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 30, 2026 at 12:46 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `oswa_inv`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_value`)),
  `new_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_value`)),
  `date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `business_config`
--

CREATE TABLE `business_config` (
  `config_key` varchar(50) NOT NULL,
  `config_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `business_config`
--

INSERT INTO `business_config` (`config_key`, `config_value`, `updated_at`) VALUES
('address', 'tesoritolandia', '2026-04-27 21:40:28'),
('currency', 'Bolivares', '2026-04-27 21:50:24'),
('store_name', 'Tesorito tienda', '2026-04-27 21:40:13'),
('tax_rate', '15%', '2026-04-26 22:04:24');

-- --------------------------------------------------------

--
-- Table structure for table `cash_sessions`
--

CREATE TABLE `cash_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `start_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_date` timestamp NULL DEFAULT NULL,
  `start_balance` decimal(12,2) DEFAULT 0.00,
  `end_balance` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `parent_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `parent_id`) VALUES
(1, 'Electrónica', NULL),
(2, 'Alimentos', NULL),
(3, 'Limpieza', NULL),
(4, 'Oficina', NULL),
(5, 'Farmacia', NULL),
(6, 'Varios', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `credit_limit` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `address`, `credit_limit`, `created_at`) VALUES
(1, 'tesorito', 'tesorito@gmail.com', '+58', 'tesoritolandia', 49998046.90, '2026-04-28 00:12:09'),
(2, 'gabriel', 'gabriel@gmail.com', '+58', 'gabrielandia', 0.40, '2026-04-28 00:19:50'),
(3, 'primo', NULL, '+58', NULL, 5.00, '2026-04-28 00:20:51');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_movements`
--

CREATE TABLE `inventory_movements` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` enum('IN','OUT','ADJUSTMENT') NOT NULL,
  `qty` decimal(10,3) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_movements`
--

INSERT INTO `inventory_movements` (`id`, `product_id`, `user_id`, `type`, `qty`, `reference`, `date`) VALUES
(1, 13, 3, 'OUT', 1.000, 'Venta #1', '2026-04-27 20:00:56'),
(2, 14, 3, 'OUT', 1.000, 'Venta #1', '2026-04-27 20:00:56'),
(3, 15, 3, 'OUT', 1.000, 'Venta #1', '2026-04-27 20:00:56'),
(4, 16, 3, 'OUT', 1.000, 'Venta #1', '2026-04-27 20:00:56'),
(5, 13, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #1', '2026-04-27 21:13:53'),
(6, 14, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #1', '2026-04-27 21:13:53'),
(7, 15, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #1', '2026-04-27 21:13:53'),
(8, 16, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #1', '2026-04-27 21:13:53'),
(9, 16, 3, 'IN', 1.000, 'Compra #1', '2026-04-27 21:22:41'),
(10, 15, 3, 'OUT', 4.000, 'Venta #2', '2026-04-27 22:29:52'),
(11, 7, 3, 'OUT', 1.000, 'Venta #3', '2026-04-27 22:30:50'),
(12, 10, 3, 'OUT', 1.000, 'Venta #3', '2026-04-27 22:30:50'),
(13, 12, 3, 'OUT', 1.000, 'Venta #3', '2026-04-27 22:30:50'),
(14, 5, 3, 'OUT', 1.000, 'Venta #3', '2026-04-27 22:30:50'),
(15, 9, 3, 'OUT', 1.000, 'Venta #4', '2026-04-27 22:31:40'),
(16, 13, 3, 'OUT', 1.000, 'Venta #4', '2026-04-27 22:31:40'),
(17, 15, 3, 'OUT', 1.000, 'Venta #4', '2026-04-27 22:31:41'),
(18, 13, 3, 'OUT', 1.000, 'Venta #5', '2026-04-27 22:32:07'),
(19, 9, 3, 'OUT', 1.000, 'Venta #5', '2026-04-27 22:32:07'),
(20, 14, 3, 'OUT', 1.000, 'Venta #5', '2026-04-27 22:32:07'),
(21, 10, 3, 'OUT', 1.000, 'Venta #5', '2026-04-27 22:32:07'),
(22, 13, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #5', '2026-04-27 22:32:44'),
(23, 9, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #5', '2026-04-27 22:32:44'),
(24, 14, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #5', '2026-04-27 22:32:44'),
(25, 10, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #5', '2026-04-27 22:32:44'),
(26, 9, 3, 'OUT', 1.000, 'Venta #6', '2026-04-28 00:08:21'),
(27, 13, 3, 'OUT', 1.000, 'Venta #6', '2026-04-28 00:08:21'),
(28, 14, 3, 'OUT', 1.000, 'Venta #6', '2026-04-28 00:08:21'),
(29, 10, 3, 'OUT', 1.000, 'Venta #6', '2026-04-28 00:08:21'),
(30, 9, 3, 'OUT', 1.000, 'Venta #7', '2026-04-28 00:22:03'),
(31, 9, 3, 'OUT', 1.000, 'Venta #8', '2026-04-28 00:24:36'),
(32, 9, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #8', '2026-04-28 00:27:00'),
(33, 9, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #7', '2026-04-28 00:27:06'),
(34, 9, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #6', '2026-04-28 00:52:14'),
(35, 13, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #6', '2026-04-28 00:52:14'),
(36, 14, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #6', '2026-04-28 00:52:14'),
(37, 10, NULL, 'ADJUSTMENT', 1.000, 'Anulación Venta #6', '2026-04-28 00:52:14'),
(41, 5, 3, 'OUT', 1.000, 'Venta #10', '2026-04-28 21:43:01'),
(42, 6, 3, 'OUT', 1.000, 'Venta #10', '2026-04-28 21:43:01'),
(45, 13, 3, 'OUT', 1.000, 'Venta #12', '2026-04-28 21:47:06'),
(46, 5, 3, 'OUT', 1.000, 'Venta #13', '2026-04-28 21:51:53'),
(47, 5, 3, 'OUT', 1.000, 'Venta #14', '2026-04-28 21:56:34'),
(48, 6, 3, 'OUT', 1.000, 'Venta #14', '2026-04-28 21:56:34'),
(49, 5, 3, 'OUT', 1.000, 'Venta #15', '2026-04-28 22:03:56'),
(50, 6, 3, 'OUT', 1.000, 'Venta #15', '2026-04-28 22:03:56'),
(51, 8, 3, 'OUT', 3.000, 'Venta #15', '2026-04-28 22:03:56'),
(52, 12, 3, 'OUT', 1.000, 'Venta #16', '2026-04-28 22:05:59'),
(53, 7, 3, 'OUT', 1.000, 'Venta #16', '2026-04-28 22:05:59'),
(54, 5, 3, 'OUT', 1.000, 'Venta #16', '2026-04-28 22:05:59'),
(55, 5, 3, 'OUT', 24.000, 'Venta #18', '2026-04-28 22:11:03'),
(56, 13, 3, 'OUT', 1.000, 'Venta #19', '2026-04-28 22:25:57'),
(57, 14, 3, 'OUT', 1.000, 'Venta #19', '2026-04-28 22:25:57'),
(58, 15, 3, 'OUT', 47.000, 'Venta #19', '2026-04-28 22:25:57'),
(59, 13, 3, 'OUT', 1.000, 'Venta #20', '2026-04-28 22:26:29'),
(60, 9, 3, 'OUT', 1.000, 'Venta #20', '2026-04-28 22:26:29'),
(61, 4, 3, 'OUT', 15.000, 'Venta #20', '2026-04-28 22:26:29'),
(62, 13, 3, 'OUT', 1.000, 'Venta #21', '2026-04-28 23:06:36'),
(63, 14, 3, 'OUT', 1.000, 'Venta #21', '2026-04-28 23:06:36'),
(64, 15, 3, 'OUT', 1.000, 'Venta #21', '2026-04-28 23:06:36');

-- --------------------------------------------------------

--
-- Table structure for table `media`
--

CREATE TABLE `media` (
  `id` int(11) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `sku` varchar(50) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `categorie_id` int(11) DEFAULT NULL,
  `media_id` int(11) DEFAULT NULL,
  `buy_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `quantity` decimal(10,3) DEFAULT 0.000,
  `min_stock` decimal(10,3) DEFAULT 0.000,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_weighable` tinyint(4) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `sku`, `barcode`, `categorie_id`, `media_id`, `buy_price`, `sale_price`, `quantity`, `min_stock`, `date`, `is_weighable`) VALUES
(4, 'Monitor Samsung 24\"', 'ELE-MON-001', '770200000001', 1, NULL, 90.00, 130.00, 0.000, 5.000, '2026-04-27 01:57:55', 0),
(5, 'Disco SSD 480GB Kingston', 'ELE-SSD-002', '770200000002', 1, NULL, 35.00, 55.00, 10.000, 10.000, '2026-04-27 01:57:55', 0),
(6, 'Memoria RAM 8GB DDR4', 'ELE-RAM-003', '770200000003', 1, NULL, 20.00, 35.00, 57.000, 15.000, '2026-04-27 01:57:55', 0),
(7, 'Pasta 500g', 'ALI-PAS-004', '770200000004', 2, NULL, 0.60, 1.10, 118.000, 30.000, '2026-04-27 01:57:55', 0),
(8, 'Café Molido 250g', 'ALI-CAF-005', '770200000005', 2, NULL, 1.80, 3.20, 77.000, 20.000, '2026-04-27 01:57:55', 0),
(9, 'Leche Entera 1L', 'ALI-LEC-006', '770200000006', 2, NULL, 0.90, 1.50, 98.000, 25.000, '2026-04-27 01:57:55', 0),
(10, 'Jabón Líquido Manos 500ml', 'LIM-JAB-007', '770200000007', 3, NULL, 0.70, 1.30, 49.000, 10.000, '2026-04-27 01:57:55', 0),
(11, 'Desinfectante Multiuso 1L', 'LIM-DES-008', '770200000008', 3, NULL, 1.10, 2.00, 45.000, 10.000, '2026-04-27 01:57:55', 0),
(12, 'Resma Papel Carta', 'OFI-PAP-009', '770200000009', 4, NULL, 2.50, 4.00, 68.000, 15.000, '2026-04-27 01:57:55', 0),
(13, 'Carpeta Archivadora', 'OFI-CAR-010', '770200000010', 4, NULL, 0.80, 1.60, 85.000, 20.000, '2026-04-27 01:57:55', 0),
(14, 'Ibuprofeno 400mg', 'FAR-IBU-011', '770200000011', 5, NULL, 0.25, 0.60, 198.000, 40.000, '2026-04-27 01:57:55', 0),
(15, 'Alcohol 96% 1L', 'FAR-ALC-012', '770200000012', 5, NULL, 1.20, 2.10, 7.000, 15.000, '2026-04-27 01:57:55', 0),
(16, 'Botella Agua 500ml', 'VAR-AGU-013', '770200000013', 6, NULL, 0.30, 0.70, 301.000, 50.000, '2026-04-27 01:57:55', 0);

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `total` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchases`
--

INSERT INTO `purchases` (`id`, `supplier_id`, `user_id`, `date`, `total`, `status`) VALUES
(1, 1, 3, '2026-04-27 21:22:41', 3.00, 'completed');

-- --------------------------------------------------------

--
-- Table structure for table `purchases_header`
--

CREATE TABLE `purchases_header` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) DEFAULT 'completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchases_items`
--

CREATE TABLE `purchases_items` (
  `id` int(11) NOT NULL,
  `purchase_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_items`
--

CREATE TABLE `purchase_items` (
  `id` int(11) NOT NULL,
  `purchase_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `qty` decimal(10,3) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_items`
--

INSERT INTO `purchase_items` (`id`, `purchase_id`, `product_id`, `qty`, `unit_price`, `total`) VALUES
(1, 1, 16, 1.000, 3.00, 3.00);

-- --------------------------------------------------------

--
-- Table structure for table `sales_header`
--

CREATE TABLE `sales_header` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(50) DEFAULT 'Efectivo',
  `status` varchar(20) DEFAULT 'completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_header`
--

INSERT INTO `sales_header` (`id`, `customer_id`, `user_id`, `date`, `total`, `payment_method`, `status`) VALUES
(12, 2, 3, '2026-04-28 21:47:06', 1.60, 'Crédito', 'completed'),
(13, 2, 3, '2026-04-28 21:51:53', 55.00, 'Efectivo', 'completed'),
(14, 2, 3, '2026-04-28 21:56:34', 90.00, 'Efectivo', 'completed'),
(15, 2, 3, '2026-04-28 22:03:56', 99.60, 'Crédito', 'completed'),
(16, 1, 3, '2026-04-28 22:05:59', 60.10, 'Efectivo', 'completed'),
(18, NULL, 3, '2026-04-28 22:11:03', 1320.00, 'Efectivo', 'completed'),
(19, 1, 3, '2026-04-28 22:25:57', 100.90, 'Efectivo', 'completed'),
(20, 1, 3, '2026-04-28 22:26:29', 1953.10, 'Crédito', 'completed'),
(21, NULL, 3, '2026-04-28 23:06:36', 4.30, 'Efectivo', 'completed');

-- --------------------------------------------------------

--
-- Table structure for table `sales_items`
--

CREATE TABLE `sales_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` decimal(10,3) DEFAULT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `total` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_items`
--

INSERT INTO `sales_items` (`id`, `sale_id`, `product_id`, `qty`, `unit_price`, `total`) VALUES
(30, 12, 13, 1.000, 1.60, 1.60),
(31, 13, 5, 1.000, 55.00, 55.00),
(32, 14, 5, 1.000, 55.00, 55.00),
(33, 14, 6, 1.000, 35.00, 35.00),
(34, 15, 5, 1.000, 55.00, 55.00),
(35, 15, 6, 1.000, 35.00, 35.00),
(36, 15, 8, 3.000, 3.20, 9.60),
(37, 16, 12, 1.000, 4.00, 4.00),
(38, 16, 7, 1.000, 1.10, 1.10),
(39, 16, 5, 1.000, 55.00, 55.00),
(41, 18, 5, 24.000, 55.00, 1320.00),
(42, 19, 13, 1.000, 1.60, 1.60),
(43, 19, 14, 1.000, 0.60, 0.60),
(44, 19, 15, 47.000, 2.10, 98.70),
(45, 20, 13, 1.000, 1.60, 1.60),
(46, 20, 9, 1.000, 1.50, 1.50),
(47, 20, 4, 15.000, 130.00, 1950.00),
(48, 21, 13, 1.000, 1.60, 1.60),
(49, 21, 14, 1.000, 0.60, 0.60),
(50, 21, 15, 1.000, 2.10, 2.10);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `setting_key`, `setting_value`, `description`) VALUES
(1, 'bcv_rate', '485.23', 'Tasa de cambio del BCV a USD'),
(2, 'cleanup_mode', 'kardex_only', 'Modo de auto-limpieza: kardex_only o full_delete'),
(3, 'cleanup_days', '10', 'Días de retención de historial de ventas/kardex');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_name`, `email`, `phone`, `address`, `created_at`) VALUES
(1, 'tesorito', 'tesorito', 'tesorito@gmail.com', '+58', 'tesoritolandia', '2026-04-27 21:21:43');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `user_level` int(11) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `user_level`, `status`, `email`, `phone`, `last_login`, `created_at`) VALUES
(2, 'Soporte Técnico', 'mantenimiento', '0d1db72075dd1e20b06e68b7b9399f383a91f6bf', 1, 1, 'soporte@tienda.com', NULL, '2026-04-26 21:21:14', '2026-04-26 22:18:39'),
(3, 'Administrador Maestro', 'admin', 'f865b53623b121fd34ee5426c792e5c33af8c227', 1, 1, 'admin@tienda.com', NULL, '2026-04-28 18:59:43', '2026-04-27 01:14:20'),
(4, 'Empleado Ventas', 'usuario', '95c946bf622ef93b0a211cd0fd028dfdfcf7e39e', 3, 1, 'empleado@tienda.com', NULL, '2026-04-27 17:52:33', '2026-04-27 01:14:20'),
(5, 'tesorito', 'tesorito', '9bf20dde3a7456886be436dc11dd9bb09d62574a', 1, 1, 'tesorito@gmail.com', '+58', '2026-04-27 19:38:43', '2026-04-27 20:56:14');

-- --------------------------------------------------------

--
-- Table structure for table `user_groups`
--

CREATE TABLE `user_groups` (
  `group_level` int(11) NOT NULL,
  `group_name` varchar(50) NOT NULL,
  `group_status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_groups`
--

INSERT INTO `user_groups` (`group_level`, `group_name`, `group_status`) VALUES
(1, 'ADMIN', 1),
(2, 'SPECIAL', 1),
(3, 'USER', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_audit_user` (`user_id`);

--
-- Indexes for table `business_config`
--
ALTER TABLE `business_config`
  ADD PRIMARY KEY (`config_key`);

--
-- Indexes for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cash_user` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `parent_id` (`parent_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mov_prod` (`product_id`),
  ADD KEY `fk_mov_user` (`user_id`);

--
-- Indexes for table `media`
--
ALTER TABLE `media`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD UNIQUE KEY `barcode` (`barcode`),
  ADD KEY `fk_prod_cat` (`categorie_id`),
  ADD KEY `fk_prod_media` (`media_id`),
  ADD KEY `idx_prod_sku` (`sku`),
  ADD KEY `idx_prod_barcode` (`barcode`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `purchases_header`
--
ALTER TABLE `purchases_header`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_purch_supp` (`supplier_id`),
  ADD KEY `fk_purch_user` (`user_id`);

--
-- Indexes for table `purchases_items`
--
ALTER TABLE `purchases_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pitem_purch` (`purchase_id`),
  ADD KEY `fk_pitem_prod` (`product_id`);

--
-- Indexes for table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_id` (`purchase_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `sales_header`
--
ALTER TABLE `sales_header`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sale_cust` (`customer_id`),
  ADD KEY `fk_sale_user` (`user_id`),
  ADD KEY `idx_sale_date` (`date`);

--
-- Indexes for table `sales_items`
--
ALTER TABLE `sales_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_item_sale` (`sale_id`),
  ADD KEY `fk_item_prod` (`product_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `fk_user_group` (`user_level`),
  ADD KEY `idx_user_username` (`username`);

--
-- Indexes for table `user_groups`
--
ALTER TABLE `user_groups`
  ADD PRIMARY KEY (`group_level`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `media`
--
ALTER TABLE `media`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `purchases_header`
--
ALTER TABLE `purchases_header`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchases_items`
--
ALTER TABLE `purchases_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_items`
--
ALTER TABLE `purchase_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sales_header`
--
ALTER TABLE `sales_header`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `sales_items`
--
ALTER TABLE `sales_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  ADD CONSTRAINT `fk_cash_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_10` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_11` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_12` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_13` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_14` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_15` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_16` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_17` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_4` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_5` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_6` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_7` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_8` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `categories_ibfk_9` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `inventory_movements`
--
ALTER TABLE `inventory_movements`
  ADD CONSTRAINT `fk_mov_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_mov_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_prod_cat` FOREIGN KEY (`categorie_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_prod_media` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `purchases_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchases_header`
--
ALTER TABLE `purchases_header`
  ADD CONSTRAINT `fk_purch_supp` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `fk_purch_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchases_items`
--
ALTER TABLE `purchases_items`
  ADD CONSTRAINT `fk_pitem_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_pitem_purch` FOREIGN KEY (`purchase_id`) REFERENCES `purchases_header` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`),
  ADD CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `sales_header`
--
ALTER TABLE `sales_header`
  ADD CONSTRAINT `fk_sale_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `fk_sale_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `sales_items`
--
ALTER TABLE `sales_items`
  ADD CONSTRAINT `fk_item_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_item_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales_header` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_group` FOREIGN KEY (`user_level`) REFERENCES `user_groups` (`group_level`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

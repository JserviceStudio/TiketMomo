-- 🛡️ SCHEMA BASÉ SUR L'ARCHITECTURE MULTI-TENANT & NVMe

-- Table des Managers (Gérants isolés)
CREATE TABLE IF NOT EXISTS managers (
    id VARCHAR(128) PRIMARY KEY, -- Firebase UID
    email VARCHAR(255) NOT NULL UNIQUE,
    api_key VARCHAR(128) UNIQUE DEFAULT NULL, 
    license_key VARCHAR(255) DEFAULT NULL, 
    license_type ENUM('WIFI', 'GAMES', 'FULL') DEFAULT 'WIFI', -- 🎮 Support Multi-App
    fedapay_public_key VARCHAR(255) DEFAULT NULL, 
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 📊 NEW : Table des Rapports de Ventes (Transmission Manager -> Admin)
-- Utilisable pour Wi-Fi, Salle de Jeux, etc.
CREATE TABLE IF NOT EXISTS sales_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manager_id VARCHAR(128) NOT NULL,
    app_id ENUM('WIFI_SAAS', 'GAMES_SAAS') NOT NULL, -- Distingue l'origine du rapport
    report_date DATE NOT NULL,
    total_sales DECIMAL(15, 2) DEFAULT 0.00,
    total_transactions INT DEFAULT 0,
    raw_data JSON, -- Stocke le détail (ex: liste des jeux, durée, etc.)
    status ENUM('SUBMITTED', 'REVIEWED', 'ARCHIVED') DEFAULT 'SUBMITTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
    INDEX idx_manager_app_date (manager_id, app_id, report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Sites/Routeurs MikroTik
CREATE TABLE IF NOT EXISTS sites (
    id VARCHAR(128) PRIMARY KEY, -- UUID v4 généré par Node.js
    manager_id VARCHAR(128) NOT NULL, -- 🛡️ ISOLATION STRICTE
    name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100) NOT NULL, -- Ex: 10.8.0.2 (VPN)
    api_port INT DEFAULT 8728,
    api_user VARCHAR(100) NOT NULL,
    api_password VARCHAR(255) NOT NULL, -- Chiffré côté Node.js idéalement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
    INDEX idx_manager_id (manager_id) -- 🚀 NVMe Opti
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(128) PRIMARY KEY, -- UUID v4
    manager_id VARCHAR(128) NOT NULL, -- 🛡️ ISOLATION STRICTE
    site_id VARCHAR(128) NOT NULL,
    profile VARCHAR(100) NOT NULL, -- 🌟 FIX : Type de ticket (ex: 100F-6H)
    code VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    transaction_id VARCHAR(255) DEFAULT NULL, -- Pour idempotence webhook
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    INDEX idx_manager_profile_used (manager_id, profile, used), -- 🚀 NVMe Ultra Opti: Recherche multi-critères < 5ms
    INDEX idx_transaction (transaction_id),    -- Idempotence Payment API
    UNIQUE KEY unique_code_per_site (site_id, code) -- Évite doublons sur un routeur
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des Transactions (Logs de paiement)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(128) PRIMARY KEY, -- UUID v4
    manager_id VARCHAR(128) NOT NULL, -- 🛡️ ISOLATION STRICTE
    voucher_id VARCHAR(128) DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
    mikrotik_status ENUM('PENDING', 'QUEUE', 'ACTIVATED', 'FAILED') DEFAULT 'PENDING', -- ⚡ RÉSILIENCE QoS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL,
    INDEX idx_manager_status (manager_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 🛡️ IMMUTABLE SYSTEM : Journal d'Audit Pro (Stripe/Google Style)
-- Enregistre chaque action critique qui impacte les données financières ou la sécurité.
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    manager_id VARCHAR(128), -- NULL si action système/admin
    action_type VARCHAR(100) NOT NULL, -- ex: 'VOUCHER_PURCHASE', 'LICENSE_ACTIVATION', 'CONFIG_CHANGE'
    resource_id VARCHAR(128), -- ID de l'objet impacté (Transaction, Voucher, etc.)
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    details JSON, -- Payload complet de l'action pour preuve
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_manager_action (manager_id, action_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


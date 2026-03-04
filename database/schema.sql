-- 🛡️ SCHEMA BASÉ SUR L'ARCHITECTURE MULTI-TENANT & NVMe

-- Table des Managers (Gérants isolés)
CREATE TABLE IF NOT EXISTS managers (
    id VARCHAR(128) PRIMARY KEY, -- Firebase UID
    email VARCHAR(255) NOT NULL UNIQUE,
    api_key VARCHAR(128) UNIQUE DEFAULT NULL, -- 🔑 Pour l'app mobile (Auth SaaS)
    license_key VARCHAR(255) DEFAULT NULL, -- 📜 Licence SaaS
    fedapay_public_key VARCHAR(255) DEFAULT NULL, -- 💳 Clé Publique FedaPay (Apprentissage auto)
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    code VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    transaction_id VARCHAR(255) DEFAULT NULL, -- Pour idempotence webhook
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES managers(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    INDEX idx_manager_site_used (manager_id, site_id, used), -- 🚀 NVMe Ultra Opti: Recherche multi-critères < 5ms
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

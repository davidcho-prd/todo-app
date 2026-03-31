CREATE DATABASE IF NOT EXISTS todo_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE todo_app;

CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED,
  title        VARCHAR(255) NOT NULL,
  type         ENUM('single', 'daily') NOT NULL DEFAULT 'single',
  category     ENUM('업무', '개인', '의약', '취미', '스터디', '기타') NOT NULL DEFAULT '기타',
  content      TEXT,
  completed    TINYINT(1)   NOT NULL DEFAULT 0,
  due_date     DATE,
  period_start DATE,
  period_end   DATE,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS daily_checks (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  todo_id    INT UNSIGNED NOT NULL,
  check_date DATE         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_todo_date (todo_id, check_date),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

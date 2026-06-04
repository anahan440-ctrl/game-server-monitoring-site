
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  game VARCHAR(20) NOT NULL CHECK (game IN ('dayz','arma','conan')),
  title VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'НОВОСТЬ',
  is_hot BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servers (
  id SERIAL PRIMARY KEY,
  game VARCHAR(20) NOT NULL CHECK (game IN ('dayz','arma','conan')),
  name VARCHAR(255) NOT NULL,
  map VARCHAR(100) NOT NULL,
  ip VARCHAR(100),
  max_players INT NOT NULL DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS updates (
  id SERIAL PRIMARY KEY,
  game VARCHAR(20) NOT NULL CHECK (game IN ('dayz','arma','conan')),
  version VARCHAR(50) NOT NULL,
  items TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO admins (username, password_hash) VALUES ('admin', 'admin123');

INSERT INTO news (game, title, text, category, is_hot) VALUES
('dayz', 'Патч 1.25: Новая карта Sakhal и исправления', 'Bohemia Interactive выпустила масштабное обновление с новой зимней картой Sakhal, переработанной системой погоды и более 200 исправлениями.', 'ОБНОВЛЕНИЕ', TRUE),
('arma', 'Arma Reforger: Экспериментальная ветка открыта', 'Новые транспортные средства, улучшенная физика движения и система повреждений — всё это доступно на экспериментальных серверах уже сейчас.', 'НОВОСТЬ', TRUE),
('conan', 'Age of War: Глава 4 — детали обновления', 'Funcom раскрыла подробности о следующей главе Age of War с новыми боссами, механиками кланов и переработкой системы крафта.', 'АНОНС', FALSE),
('dayz', 'Новый ивент: Зомби-нашествие на Черная Гора', 'Временный ивент с повышенным спавном заражённых и уникальными наградами для выживших. Активен до 10 июня.', 'ИВЕНТ', FALSE),
('arma', 'Workshop: +500 новых модификаций за месяц', 'Сообщество продолжает активно создавать контент. Популярные категории: новые карты, оружие и миссии.', 'СООБЩЕСТВО', FALSE),
('conan', 'Серверный патч 3.9.4 — оптимизация производительности', 'Значительное улучшение производительности серверов, особенно на картах с большим количеством построек и игроков.', 'ПАТЧ', FALSE);

INSERT INTO servers (game, name, map, ip, max_players) VALUES
('dayz', 'RU | VANILLA | PVP', 'Chernarus', '0.0.0.0:2302', 60),
('dayz', 'RU | MODDED | TRADER', 'Livonia', '0.0.0.0:2303', 60),
('dayz', 'RU | RP | HARDCORE', 'Chernarus', '0.0.0.0:2304', 50),
('arma', 'RU | REFORGER | PVP', 'Everon', '0.0.0.0:2401', 64),
('arma', 'RU | CONQUEST | 64', 'Everon', '0.0.0.0:2402', 64),
('conan', 'RU | PVP | X5', 'Exiled Lands', '0.0.0.0:7777', 50),
('conan', 'RU | SIPTAH | RP', 'Isle of Siptah', '0.0.0.0:7778', 50);

INSERT INTO updates (game, version, items) VALUES
('dayz', '1.25.0', ARRAY['Новая карта Sakhal', 'Переработка системы погоды', 'Новое оружие: VSD, B95', 'Оптимизация серверов +30%', '200+ исправлений багов']),
('arma', '1.2.1', ARRAY['Экспериментальная ветка', '4 новых транспорта', 'Улучшена физика ИИ', 'Система VAC расширена', 'Патч балансировки оружия']),
('conan', '3.9.4', ARRAY['Age of War Глава 4 тизер', 'Оптимизация серверов', 'Новые боссы: 3 шт', 'Фикс крафта и инвентаря', 'Переработка PvP рейтинга']);

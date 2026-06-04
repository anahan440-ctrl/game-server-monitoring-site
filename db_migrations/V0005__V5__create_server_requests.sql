CREATE TABLE t_p88133969_game_server_monitori.server_requests (
  id SERIAL PRIMARY KEY,
  server_name varchar(255) NOT NULL,
  ip varchar(100) NOT NULL,
  contact varchar(255) NOT NULL,
  game varchar(50) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'new',
  created_at timestamp DEFAULT now()
);
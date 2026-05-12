-- ============================================================
--  FANTASILIGA · Base de datos Supabase
--  Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================

-- Tabla de jugadores disponibles
CREATE TABLE jugadores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  club       TEXT NOT NULL,
  posicion   TEXT NOT NULL CHECK (posicion IN ('POR','DEF','MED','DEL')),
  puntos     INTEGER DEFAULT 0,
  activo     SMALLINT DEFAULT 1 CHECK (activo IN (0,1)),  -- 1=disponible 0=lesionado/sancionado
  jornada    INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jugadores_posicion ON jugadores(posicion);
CREATE INDEX idx_jugadores_jornada  ON jugadores(jornada);
CREATE INDEX idx_jugadores_activo   ON jugadores(activo);

-- Alineaciones guardadas por cada usuario
CREATE TABLE mi_equipo (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id)  ON DELETE CASCADE,
  jornada    INTEGER NOT NULL,
  formacion  TEXT NOT NULL CHECK (formacion IN ('4-3-3','3-4-3','3-5-2','5-3-2','4-4-2')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, jugador_id, jornada)
);

CREATE INDEX idx_mi_equipo_user_jornada ON mi_equipo(user_id, jornada);

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mi_equipo_updated_at
  BEFORE UPDATE ON mi_equipo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Clasificación (se carga desde CSV cada jornada)
CREATE TABLE clasificacion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre        TEXT NOT NULL,
  nombre_equipo TEXT NOT NULL,
  puntos        INTEGER DEFAULT 0,
  jornada       INTEGER NOT NULL,
  posicion      INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clasificacion_jornada  ON clasificacion(jornada);
CREATE INDEX idx_clasificacion_posicion ON clasificacion(posicion);

-- Vista: detalle de mi equipo con datos del jugador
CREATE VIEW mi_equipo_detalle AS
SELECT
  me.user_id, me.jornada, me.formacion,
  j.id AS jugador_id, j.nombre, j.club, j.posicion, j.puntos
FROM mi_equipo me
JOIN jugadores j ON j.id = me.jugador_id;

-- Seguridad por filas
ALTER TABLE jugadores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mi_equipo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clasificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jugadores_select"      ON jugadores     FOR SELECT USING (true);
CREATE POLICY "clasificacion_select"  ON clasificacion FOR SELECT USING (true);
CREATE POLICY "mi_equipo_select"      ON mi_equipo     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mi_equipo_insert"      ON mi_equipo     FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mi_equipo_update"      ON mi_equipo     FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mi_equipo_delete"      ON mi_equipo     FOR DELETE USING (auth.uid() = user_id);

-- Datos de ejemplo: jugadores jornada 28
INSERT INTO jugadores (nombre, club, posicion, puntos, activo, jornada) VALUES
  ('Oblak','ATL','POR',9,1,28),('Ter Stegen','BAR','POR',7,1,28),('Lunin','RMA','POR',8,1,28),
  ('Carvajal','RMA','DEF',7,1,28),('Laporte','MAD','DEF',6,1,28),('Jordi Alba','BAR','DEF',8,1,28),
  ('Rudiger','RMA','DEF',6,1,28),('Kounde','BAR','DEF',7,1,28),('Marcos Alonso','ATL','DEF',5,0,28),
  ('Bellingham','RMA','MED',12,1,28),('Pedri','BAR','MED',10,1,28),('Merino','ATH','MED',7,1,28),
  ('Kroos','RMA','MED',9,1,28),('Gavi','BAR','MED',6,0,28),('De Paul','ATL','MED',8,1,28),
  ('Vinicius','RMA','DEL',14,1,28),('Lewandowski','BAR','DEL',11,1,28),('Williams','ATH','DEL',8,1,28),
  ('Morata','ATL','DEL',7,1,28),('Torres','BAR','DEL',6,1,28);

-- Datos de ejemplo: clasificación jornada 27
INSERT INTO clasificacion (nombre, nombre_equipo, puntos, jornada, posicion) VALUES
  ('Carlos R.','Los Galacticos',312,27,1),('Marta S.','Fenomenos FC',298,27,2),
  ('Javi G.','Los Cracks',287,27,3),('Ana P.','Comando',271,27,4),
  ('Tomas V.','Once Ideal',264,27,5),('Lucia M.','Los Fichajes',251,27,6),
  ('Pedro A.','Tiburones',239,27,7),('Elena B.','Lideres',228,27,8);

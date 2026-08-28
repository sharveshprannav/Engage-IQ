"""
Database migration script to clean up SQLite ml_inference_logs schema.
"""
import sqlite3
import os

db_paths = [
    os.path.abspath("engageai.db"),
    os.path.abspath("../engageai.db")
]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Migrating {db_path}...")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        schema = cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='ml_inference_logs'").fetchone()
        if schema:
            print(f"Old schema: {schema[0]}")
            cur.execute("DROP TABLE IF EXISTS ml_inference_logs_old")
            cur.execute("ALTER TABLE ml_inference_logs RENAME TO ml_inference_logs_old")
            cur.execute("""
                CREATE TABLE ml_inference_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
                    request_id VARCHAR(64) NOT NULL,
                    input_type VARCHAR(32) NOT NULL,
                    input_hash VARCHAR(64),
                    model_used VARCHAR(255) NOT NULL,
                    latency_total_ms FLOAT NOT NULL,
                    latency_validation_ms FLOAT DEFAULT 0.0,
                    latency_preprocessing_ms FLOAT DEFAULT 0.0,
                    latency_model_ms FLOAT DEFAULT 0.0,
                    latency_postprocessing_ms FLOAT DEFAULT 0.0,
                    overall_confidence FLOAT,
                    status VARCHAR(32) NOT NULL DEFAULT 'success',
                    ambiguity_detected BOOLEAN DEFAULT 0,
                    category_name VARCHAR(128),
                    primary_label VARCHAR(255),
                    input_summary TEXT,
                    output_summary TEXT,
                    details_json TEXT,
                    user_corrected BOOLEAN DEFAULT 0,
                    corrected_label VARCHAR(255),
                    correction_note TEXT,
                    created_at DATETIME NOT NULL
                )
            """)
            try:
                cur.execute("""
                    INSERT INTO ml_inference_logs (
                        id, user_id, request_id, input_type, input_hash, model_used,
                        latency_total_ms, latency_validation_ms, latency_preprocessing_ms,
                        latency_model_ms, latency_postprocessing_ms, overall_confidence,
                        status, ambiguity_detected, category_name, primary_label,
                        input_summary, output_summary, details_json, user_corrected,
                        corrected_label, correction_note, created_at
                    )
                    SELECT 
                        id, user_id, request_id, LOWER(input_type), input_hash, model_used,
                        latency_total_ms, latency_validation_ms, latency_preprocessing_ms,
                        latency_model_ms, latency_postprocessing_ms, overall_confidence,
                        LOWER(status), ambiguity_detected, category_name, primary_label,
                        input_summary, output_summary, details_json, user_corrected,
                        corrected_label, correction_note, created_at
                    FROM ml_inference_logs_old
                """)
            except Exception as e:
                print(f"Data migration notice: {e}")
            cur.execute("DROP TABLE ml_inference_logs_old")
            cur.execute("CREATE INDEX IF NOT EXISTS ix_ml_inference_logs_user_id ON ml_inference_logs(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS ix_ml_inference_logs_request_id ON ml_inference_logs(request_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS ix_ml_inference_logs_created_at ON ml_inference_logs(created_at)")
            conn.commit()
            print(f"Successfully migrated {db_path}")
        conn.close()

print("All migrations complete.")

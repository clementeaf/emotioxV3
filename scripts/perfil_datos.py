"""
Perfil de datos — EmotioX V3

Conecta a MySQL (emotvehe_emotiox) y genera un perfil rápido de las tablas
principales: conteos, distribución de tipos, módulos más usados, etc.

Requiere: pip install mysql-connector-python tabulate
Configurar variables de conexión abajo o via env vars.
"""

import os
import sys

try:
    import mysql.connector
    from tabulate import tabulate
except ImportError:
    print("Instalar dependencias: pip install mysql-connector-python tabulate")
    sys.exit(1)


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "emotvehe_emotiox"),
}

QUERIES = {
    "Resumen de tablas": """
        SELECT table_name AS 'Tabla',
               table_rows AS 'Filas (aprox)',
               ROUND(data_length / 1024, 1) AS 'Data KB',
               ROUND(index_length / 1024, 1) AS 'Index KB'
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        ORDER BY table_rows DESC
    """,
    "Investigaciones por estado": """
        SELECT status AS 'Estado', COUNT(*) AS 'Total'
        FROM research
        GROUP BY status
        ORDER BY Total DESC
    """,
    "Módulos más usados (por template)": """
        SELECT mt.name AS 'Template', COUNT(m.id) AS 'Instancias'
        FROM modules m
        JOIN module_templates mt ON m.module_template_id = mt.id
        GROUP BY mt.name
        ORDER BY Instancias DESC
        LIMIT 10
    """,
    "Responses por mes": """
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS 'Mes', COUNT(*) AS 'Responses'
        FROM responses
        GROUP BY Mes
        ORDER BY Mes DESC
        LIMIT 6
    """,
    "Usuarios registrados": """
        SELECT COUNT(*) AS 'Total usuarios' FROM users
    """,
}


def main():
    if not DB_CONFIG["user"]:
        print("Configurar DB_USER y DB_PASSWORD (env vars o editar este script)")
        print("  export DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=emotvehe_emotiox")
        sys.exit(1)

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    for title, query in QUERIES.items():
        print(f"\n{'=' * 60}")
        print(f"  {title}")
        print(f"{'=' * 60}")
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            headers = [desc[0] for desc in cursor.description]
            print(tabulate(rows, headers=headers, tablefmt="simple"))
        except Exception as e:
            print(f"  Error: {e}")

    cursor.close()
    conn.close()
    print(f"\n{'=' * 60}")
    print("  Perfil completado")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()

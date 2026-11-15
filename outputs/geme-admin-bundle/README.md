# Cherylish Admin bundle

`cherylish:latest` is one application image/container containing:

- GEME Admin web UI (Next.js, port 3001)
- GEME API (NestJS, port 4000)

AEGIS, PostgreSQL, SQL Server, Redis and Mailpit stay as separate support containers. AI Studio and its agents are not part of this bundle. Database volumes are named explicitly in Compose.

Local bootstrap administrator: username `admin`, password `admin`. Change these private `.env.docker` values before exposing this project beyond localhost.

Start the full local stack with `outputs/Start-Cherylish.cmd`; stop it with `outputs/Stop-Cherylish.cmd`. Admin opens at http://127.0.0.1:3001.

The bundle runs Prisma migrations before launching the API and supervises the Admin UI and API. Docker health checks the Admin login route and API database readiness.

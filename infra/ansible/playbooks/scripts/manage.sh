#!/bin/bash
# Management scripts for FeatureSignals isolated VPS
# These scripts are deployed to each customer VPS by Ansible

set -e

APP_DIR="/opt/featuresignals"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

cd "$APP_DIR"

case "$1" in
  start)
    echo "Starting all services..."
    docker compose up -d
    ;;

  stop)
    echo "Stopping all services..."
    docker compose down
    ;;

  restart)
    echo "Restarting all services..."
    docker compose restart
    ;;

  status)
    echo "Service status:"
    docker compose ps
    ;;

  logs)
    SERVICE="${2:-}"
    if [ -n "$SERVICE" ]; then
      docker compose logs -f "$SERVICE"
    else
      docker compose logs -f
    fi
    ;;

  backup)
    BACKUP_DIR="$APP_DIR/backups"
    DATE=$(date +%Y%m%d_%H%M%S)

    echo "Creating database backup..."
    docker exec fs-postgres pg_dump -U fs featuresignals | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
    echo "Backup saved to: $BACKUP_DIR/db_$DATE.sql.gz"

    # Clean old backups (>7 days)
    find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
    echo "Cleaned old backups"
    ;;

  migrate)
    echo "Running database migrations..."
    docker compose run --rm server /app/server migrate up
    ;;

  health)
    echo "Checking service health..."
    docker compose ps --format json | jq -r '.[] | "\(.Name): \(.Status)"'
    ;;

  update)
    echo "Pulling latest images..."
    docker compose pull
    echo "Restarting services..."
    docker compose up -d
    echo "Update complete"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs|backup|migrate|health|update}"
    echo ""
    echo "Commands:"
    echo "  start      - Start all services"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  status     - Show service status"
    echo "  logs [svc] - Show logs (optionally for specific service)"
    echo "  backup     - Create database backup"
    echo "  migrate    - Run database migrations"
    echo "  health     - Check service health"
    echo "  update     - Pull latest images and restart"
    exit 1
    ;;
esac

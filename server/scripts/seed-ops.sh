#!/bin/bash
# Seed ops user for local development
psql "${DATABASE_URL:-postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable}" -f "$(dirname "$0")/seed-ops.sql"
echo "Ops user seeded: admin@featuresignals.com / admin123"

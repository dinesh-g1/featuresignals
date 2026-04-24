# =============================================================================
# FeatureSignals — Preview Proxy Dockerfile
# =============================================================================
#
# Multi-stage build producing a minimal (~5 MB) scratch-based image.
# The proxy dynamically routes *.preview.featuresignals.com traffic to the
# correct preview namespace's service.
#
# Build:
#   docker build -t ghcr.io/featuresignals/preview-proxy:latest .
#
# Run (dev):
#   docker run --rm -p 8080:8080 ghcr.io/featuresignals/preview-proxy:latest
# =============================================================================

# ---- Stage 1: Build ---------------------------------------------------------
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Cache dependencies first (layer caching optimization)
COPY go.mod go.sum ./
RUN go mod download

# Build the binary
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /preview-proxy .

# ---- Stage 2: Runtime -------------------------------------------------------
FROM scratch

# Copy CA certificates for HTTPS calls to the Kubernetes API server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the statically-linked binary
COPY --from=builder /preview-proxy /preview-proxy

# Listen on port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/preview-proxy", "-health"]

# Use numeric user (nobody) for security
USER 65534:65534

ENTRYPOINT ["/preview-proxy"]

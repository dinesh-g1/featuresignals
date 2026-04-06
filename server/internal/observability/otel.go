package observability

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	otellog "go.opentelemetry.io/otel/log/global"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"google.golang.org/grpc/credentials"
)

// Config holds OpenTelemetry configuration. Fields mirror config.Config OTEL* fields.
type Config struct {
	Endpoint       string
	IngestionKey   string
	ServiceName    string
	ServiceRegion  string
	TracesEnabled  bool
	MetricsEnabled bool
	LogsEnabled    bool
	SampleRate     float64
}

// Init sets up the global OTEL TracerProvider and MeterProvider with async
// batch processors. All exports are non-blocking: spans and metrics are queued
// in memory and flushed by background goroutines.
//
// Returns a shutdown function that drains pending telemetry on graceful stop.
func Init(ctx context.Context, cfg Config) (shutdown func(context.Context) error, err error) {
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.DeploymentEnvironment(cfg.ServiceRegion),
		),
		resource.WithHost(),
		resource.WithProcessRuntimeName(),
	)
	if err != nil {
		return nil, err
	}

	headers := map[string]string{}
	if cfg.IngestionKey != "" {
		headers["signoz-ingestion-key"] = cfg.IngestionKey
	}

	var shutdownFuncs []func(context.Context) error

	if cfg.TracesEnabled {
		traceExporter, tErr := otlptracegrpc.New(ctx,
			otlptracegrpc.WithEndpoint(cfg.Endpoint),
			otlptracegrpc.WithHeaders(headers),
			otlptracegrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, "")),
		)
		if tErr != nil {
			return nil, tErr
		}

		sampler := trace.ParentBased(trace.TraceIDRatioBased(cfg.SampleRate))

		tp := trace.NewTracerProvider(
			trace.WithResource(res),
			trace.WithSampler(sampler),
			trace.WithBatcher(traceExporter,
				trace.WithMaxQueueSize(2048),
				trace.WithBatchTimeout(5*time.Second),
				trace.WithMaxExportBatchSize(512),
			),
		)
		otel.SetTracerProvider(tp)
		shutdownFuncs = append(shutdownFuncs, tp.Shutdown)
	}

	if cfg.MetricsEnabled {
		metricExporter, mErr := otlpmetricgrpc.New(ctx,
			otlpmetricgrpc.WithEndpoint(cfg.Endpoint),
			otlpmetricgrpc.WithHeaders(headers),
			otlpmetricgrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, "")),
		)
		if mErr != nil {
			return nil, mErr
		}

		mp := metric.NewMeterProvider(
			metric.WithResource(res),
			metric.WithReader(metric.NewPeriodicReader(metricExporter,
				metric.WithInterval(60*time.Second),
			)),
		)
		otel.SetMeterProvider(mp)
		shutdownFuncs = append(shutdownFuncs, mp.Shutdown)
	}

	if cfg.LogsEnabled {
		logExporter, lErr := otlploggrpc.New(ctx,
			otlploggrpc.WithEndpoint(cfg.Endpoint),
			otlploggrpc.WithHeaders(headers),
			otlploggrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, "")),
		)
		if lErr != nil {
			return nil, lErr
		}

		lp := sdklog.NewLoggerProvider(
			sdklog.WithResource(res),
			sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter,
				sdklog.WithMaxQueueSize(2048),
				sdklog.WithExportTimeout(30*time.Second),
			)),
		)
		otellog.SetLoggerProvider(lp)
		shutdownFuncs = append(shutdownFuncs, lp.Shutdown)
	}

	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return func(ctx context.Context) error {
		var firstErr error
		for _, fn := range shutdownFuncs {
			if err := fn(ctx); err != nil && firstErr == nil {
				firstErr = err
			}
		}
		return firstErr
	}, nil
}

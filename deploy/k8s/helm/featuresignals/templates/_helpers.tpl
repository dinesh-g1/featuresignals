
{{/*
Expand the name of the chart.
*/}}
{{- define "featuresignals.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "featuresignals.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "featuresignals.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "featuresignals.labels" -}}
helm.sh/chart: {{ include "featuresignals.chart" . }}
{{ include "featuresignals.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "featuresignals.selectorLabels" -}}
app.kubernetes.io/name: {{ include "featuresignals.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Server pod labels
*/}}
{{- define "featuresignals.serverLabels" -}}
{{ include "featuresignals.labels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Dashboard pod labels
*/}}
{{- define "featuresignals.dashboardLabels" -}}
{{ include "featuresignals.labels" . }}
app.kubernetes.io/component: dashboard
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "featuresignals.serverSelectorLabels" -}}
{{ include "featuresignals.selectorLabels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Dashboard selector labels
*/}}
{{- define "featuresignals.dashboardSelectorLabels" -}}
{{ include "featuresignals.selectorLabels" . }}
app.kubernetes.io/component: dashboard
{{- end }}

{{/*
Image reference
*/}}
{{- define "featuresignals.image" -}}
{{- $registry := .registry | default "ghcr.io/featuresignals" -}}
{{- $repository := .repository -}}
{{- $tag := .tag | default "latest" -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- end }}

{{/*
Database URL helper
*/}}
{{- define "featuresignals.databaseUrl" -}}
{{- $host := .Values.postgresql.host -}}
{{- $port := .Values.postgresql.port | toString -}}
{{- $database := .Values.postgresql.database -}}
{{- $user := .Values.postgresql.user -}}
{{- printf "postgres://$(DB_USER):$(DB_PASSWORD)@%s:%s/%s?sslmode=require" $host $port $database -}}
{{- end }}

{{/*
Server environment variables derived from values
*/}}
{{- define "featuresignals.server.env" -}}
{{- range $key, $value := .Values.server.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
Dashboard environment variables derived from values
*/}}
{{- define "featuresignals.dashboard.env" -}}
{{- range $key, $value := .Values.dashboard.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

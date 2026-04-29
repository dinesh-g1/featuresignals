package httputil

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// TemplateRenderer manages HTML template parsing and rendering.
type TemplateRenderer struct {
	funcMap template.FuncMap
	mu      sync.RWMutex
	cache   map[string]*template.Template
	reload  bool
	fsys    fs.FS // stored for re-parsing in reload mode
}

var (
	defaultRenderer *TemplateRenderer
	rendererOnce    sync.Once
)

// InitTemplates initializes the global template renderer from the embedded FS.
// In development mode, templates are re-parsed on every request.
// The fsys should contain layout.html and all page templates.
func InitTemplates(fsys fs.FS, development bool) {
	rendererOnce.Do(func() {
		r := &TemplateRenderer{
			cache:  make(map[string]*template.Template),
			reload: development,
			fsys:   fsys,
			funcMap: template.FuncMap{
				"json": func(v interface{}) string {
					b, _ := json.Marshal(v)
					return string(b)
				},
				"hasRole": func(userRole, requiredRole string) bool {
					weights := map[string]int{
						"viewer":   0,
						"engineer": 1,
						"admin":    2,
					}
					userW, ok := weights[userRole]
					if !ok {
						return false
					}
					reqW, ok := weights[requiredRole]
					if !ok {
						return false
					}
					return userW >= reqW
				},
				"statusClass": func(status string) string {
					switch status {
					case "online":
						return "status-ok"
					case "degraded":
						return "status-warn"
					case "offline", "error":
						return "status-err"
					default:
						return "status-unknown"
					}
				},
				"statusLabel": func(status string) string {
					switch status {
					case "online":
						return "Online"
					case "degraded":
						return "Degraded"
					case "offline":
						return "Offline"
					case "in_progress":
						return "In Progress"
					case "success":
						return "Success"
					case "failed":
						return "Failed"
					case "rolled_back":
						return "Rolled Back"
					default:
						return "Unknown"
					}
				},
				"timeAgo": func(t time.Time) string {
					d := time.Since(t)
					switch {
					case d < time.Minute:
						return "just now"
					case d < time.Hour:
						m := int(d.Minutes())
						if m == 1 {
							return "1 minute ago"
						}
						return fmt.Sprintf("%d minutes ago", m)
					case d < 24*time.Hour:
						h := int(d.Hours())
						if h == 1 {
							return "1 hour ago"
						}
						return fmt.Sprintf("%d hours ago", h)
					default:
						days := int(d.Hours() / 24)
						if days == 1 {
							return "1 day ago"
						}
						return fmt.Sprintf("%d days ago", days)
					}
				},
				"formatTime": func(t time.Time) string {
					return t.Format("2006-01-02 15:04:05 UTC")
				},
				"join": func(sep string, items []string) string {
					return strings.Join(items, sep)
				},
			},
		}

		// Always pre-parse templates at startup
		if err := r.parseAll(); err != nil {
			slog.Error("failed to pre-parse templates", "error", err)
		}

		defaultRenderer = r
	})
}

// RenderTemplate renders a named template with the given data.
func RenderTemplate(w http.ResponseWriter, name string, data interface{}) {
	if defaultRenderer == nil {
		slog.Error("templates not initialized, call InitTemplates first")
		http.Error(w, "templates not initialized", http.StatusInternalServerError)
		return
	}

	if err := defaultRenderer.render(w, name, data); err != nil {
		slog.Error("template render failed", "name", name, "error", err)
		http.Error(w, "template error: "+err.Error(), http.StatusInternalServerError)
	}
}

// ResetTemplatesForTest resets the singleton for testing.
func ResetTemplatesForTest() {
	rendererOnce = sync.Once{}
	defaultRenderer = nil
}

// parseAll reads all HTML templates from the stored filesystem and caches them.
func (r *TemplateRenderer) parseAll() error {
	entries, err := fs.ReadDir(r.fsys, ".")
	if err != nil {
		return fmt.Errorf("read templates dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".html" {
			continue
		}
		if entry.Name() == "layout.html" {
			continue // layout is the base, included with each page template
		}

		tmpl := template.New("layout.html").Funcs(r.funcMap)
		tmpl, err := tmpl.ParseFS(r.fsys, "layout.html", entry.Name())
		if err != nil {
			return fmt.Errorf("parse template %s: %w", entry.Name(), err)
		}
		r.cache[entry.Name()] = tmpl
	}
	return nil
}

// render executes the named template. In reload mode, templates are re-parsed
// from the stored filesystem on every request.
func (r *TemplateRenderer) render(w io.Writer, name string, data interface{}) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	templateName := name + ".html"

	if r.reload {
		// In development, re-parse from the stored FS on every request
		tmpl := template.New("layout.html").Funcs(r.funcMap)
		tmpl, err := tmpl.ParseFS(r.fsys, "layout.html", templateName)
		if err != nil {
			return fmt.Errorf("re-parse template %s: %w", templateName, err)
		}
		return tmpl.ExecuteTemplate(w, "layout.html", data)
	}

	tmpl, ok := r.cache[templateName]
	if !ok {
		return fmt.Errorf("template not found: %s", templateName)
	}
	return tmpl.ExecuteTemplate(w, "layout.html", data)
}
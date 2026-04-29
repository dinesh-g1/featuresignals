package web

import "embed"

//go:embed templates/*.html
//go:embed static/css/app.css
//go:embed static/js/app.js
var FS embed.FS
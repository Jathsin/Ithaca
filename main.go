package main

import (
	"context"
	"html/template"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
)

var log *slog.Logger

type App struct {
	T Templates
}

// Templates utils
type Templates struct {
	templates *template.Template
}

func (t *Templates) Render(w io.Writer, name string, data interface{}) error {
	return t.templates.ExecuteTemplate(w, name, data)
}

func newTemplate() *Templates {
	tmpl := template.New("layout").Funcs(template.FuncMap{
		"add": func(a, b int) int {
			return a + b
		},
		"mult": func(a float64, b float64) float64 {
			return a * b
		},
	})
	return &Templates{
		templates: template.Must(tmpl.ParseGlob("templates/*.html")),
	}
}

func main() {

	// Init log
	log = slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Build app template
	app := App{*newTemplate()}

	mux := http.NewServeMux()

	// Hypermedia API

	mux.HandleFunc("GET /", app.landing_handler)

	server := http.Server{
		Addr:         ":8080",
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Handler:      logging(mux),
	}
	err := server.ListenAndServe()
	if err != nil {
		log.Error("Error in server.ListenAndServe()", "error", err)
	}

}

// Hypermedia API

func (app *App) landing_handler(w http.ResponseWriter, r *http.Request) {
	err := app.T.Render(w, "landing", nil)

	if err != nil {
		http.Error(w, "Error rendering page", http.StatusInternalServerError)
		log.Error("landing_handler: error in app.T.Render()", "error", err)
		return
	}
}

// UTILS -----------------------------------------------------------------------

// Passed to mux
func logging(f http.Handler) http.HandlerFunc {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := uuid.New().String()

		log = log.With("request_id", id)
		log.Info("method", r.Method,
			"time", time.Now, "url",
			r.URL.Path, "address",
			r.RemoteAddr)

		ctx := context.WithValue(r.Context(), "logs", log)
		r = r.WithContext(ctx)

		f.ServeHTTP(w, r)
	})
}

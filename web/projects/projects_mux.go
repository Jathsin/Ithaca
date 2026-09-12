package projects

import (
	"fmt"
	"jathsin/posts"
	"jathsin/types"
	"jathsin/utils"
	ui "jathsin/web/shared"
	"log/slog"

	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/a-h/templ"
)

func Get_mux() (*http.ServeMux, error) {

	mux := http.NewServeMux()

	mux.HandleFunc("GET /", projects_handler)

	mux.HandleFunc("GET /{slug}", show_project_handler)

	mux.HandleFunc("GET /{slug}/static/{file...}", func(w http.ResponseWriter, r *http.Request) {
		slug := r.PathValue("slug")
		file := r.PathValue("file")
		serve_project_file(w, r, filepath.Join(slug, "static", file))
	})

	mux.HandleFunc("GET /{name}/{file...}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		file := r.PathValue("file")

		serve_project_file(w, r, filepath.Join(name, file))
	})
	return mux, nil
}

type Project struct {
	Slug  string
	Title string
	Date  string
}

var seo_projects = types.SEO{
	Title:                     "Projects",
	Meta_description:          "Computer graphics projects by Juan Miguel Reyes: shaders, procedural systems, interactive experiments, and technical visual work.",
	Meta_property_title:       "Projects — Grafiquer",
	Meta_property_description: "Explore computer graphics projects connecting shaders, procedural systems, and visual computing.",
	Meta_Og_URL:               "https://grafiquer.com/projects",
}

// "GET /"
func projects_handler(w http.ResponseWriter, r *http.Request) {
	log := r.Context().Value(types.Ctx_key_logger{}).(*slog.Logger)

	// Get project list
	entries, err := os.ReadDir("posts/projects")
	if err != nil {
		log.Error("projects_handler: failed to read projects directory", "err", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	var projects_list []Project

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".md" {
			continue
		}

		filename := filepath.Join("posts", "projects", entry.Name())
		info, err := os.Stat(filename)
		if err != nil {
			log.Error("projects_handler: failed to inspect project", "file", filename, "err", err)
			continue
		}

		content, err := os.ReadFile(filename)
		if err != nil {
			log.Error("projects_handler: failed to read project", "file", filename, "err", err)
			continue
		}

		title, slug, err := parse_project_front_matter(content)
		if err != nil {
			log.Error("projects_handler: invalid project front matter", "file", filename, "err", err)
			continue
		}

		projects_list = append(projects_list, Project{
			Slug:  slug,
			Title: title,
			Date:  info.ModTime().Format("02 Jan 2006"),
		})
	}

	// Render
	if utils.IsHTMX(r) {
		templ.Handler(projects(projects_list)).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), projects(projects_list), seo_projects)).ServeHTTP(w, r)
}

// "GET /{slug}"
func show_project_handler(w http.ResponseWriter, r *http.Request) {
	log := r.Context().Value(types.Ctx_key_logger{}).(*slog.Logger)

	slug := r.PathValue("slug")
	seo, content, err := posts.Get_md_from_slug(slug, "projects")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		log.Error("show_project_handler: error in posts.Get_md_from_slug(slug, \"projects\")", "err", err)
		return
	}

	if utils.IsHTMX(r) {
		templ.Handler(project(content)).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), project(content), seo.SEO)).ServeHTTP(w, r)
}

func serve_project_file(w http.ResponseWriter, r *http.Request, relative_path string) {
	log := r.Context().Value(types.Ctx_key_logger{}).(*slog.Logger)
	if !filepath.IsLocal(relative_path) {
		log.Warn("serve_project_file: rejected invalid path", "path", relative_path)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	project_path := filepath.Join("projects", relative_path)
	file_info, err := os.Stat(project_path)
	if err != nil {
		if os.IsNotExist(err) {
			http.NotFound(w, r)
			return
		}
		log.Error("serve_project_file: failed to inspect file", "path", project_path, "err", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	if file_info.IsDir() {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, project_path)
}

func parse_project_front_matter(content []byte) (string, string, error) {
	text := string(content)
	parts := strings.SplitN(text, "---", 3)
	if len(parts) < 3 || strings.TrimSpace(parts[0]) != "" {
		return "", "", fmt.Errorf("missing or invalid front matter")
	}

	var title string
	var slug string

	for line := range strings.SplitSeq(strings.TrimSpace(parts[1]), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		key, value, found := strings.Cut(line, ":")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		value = strings.Trim(strings.TrimSpace(value), `"`)

		switch key {
		case "title":
			title = value
		case "slug":
			slug = value
		}
	}

	if slug == "" {
		return "", "", fmt.Errorf("missing slug")
	}

	if title == "" {
		title = slug
	}

	return title, slug, nil
}

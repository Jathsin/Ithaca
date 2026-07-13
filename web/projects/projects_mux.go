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

		http.ServeFile(w, r, filepath.Join("projects", slug, "static", file))
	})

	mux.HandleFunc("GET /{name}/{file...}", func(w http.ResponseWriter, r *http.Request) {
		name := r.PathValue("name")
		file := r.PathValue("file")

		// validate name like you already do
		// then:
		http.ServeFile(w, r, filepath.Join("projects", name, file))
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
	Meta_description:          "Visual projects by Juan Miguel Reyes: computer graphics, shaders, procedural systems, video editing, motion graphics, and storytelling.",
	Meta_property_title:       "Projects — Grafiquer",
	Meta_property_description: "Explore graphics and video projects connecting visual computing, editing, motion, and storytelling.",
	Meta_Og_URL:               "https://grafiquer.com/projects",
}

// "GET /"
func projects_handler(w http.ResponseWriter, r *http.Request) {

	// Get project list
	entries, _ := os.ReadDir("posts/projects")
	var projects_list []Project

	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".md" {
			continue
		}

		filename := filepath.Join("posts", "projects", e.Name())
		info, err := os.Stat(filename)
		if err != nil {
			continue
		}

		content, err := os.ReadFile(filename)
		if err != nil {
			continue
		}

		title, slug, err := parse_project_front_matter(content)
		if err != nil {
			continue
		}

		projects_list = append(projects_list, Project{
			Slug:  slug,
			Title: title,
			Date:  info.ModTime().Format("02-Jan-2006"),
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
	}

	if utils.IsHTMX(r) {
		templ.Handler(project(content)).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), project(content), seo.SEO)).ServeHTTP(w, r)
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

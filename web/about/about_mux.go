package about

import (
	"jathsin/types"
	"jathsin/utils"
	ui "jathsin/web/shared"
	"net/http"

	"github.com/a-h/templ"
)

func Get_mux() (*http.ServeMux, error) {

	mux := http.NewServeMux()

	mux.HandleFunc("GET /", about_handler)

	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	return mux, nil
}

var seo = types.SEO{
	Title:                     "About",
	Meta_description:          "About Grafiquer and its creator Juan Miguel Reyes — a computer science student exploring computer graphics, procedural systems, and visual experiments.",
	Meta_property_title:       "About Grafiquer",
	Meta_property_description: "Learn about Grafiquer, a personal space for exploring computer graphics, generative systems, and visual experiments.",
	Meta_Og_URL:               "https://grafiquer.com/about",
}

func about_handler(w http.ResponseWriter, r *http.Request) {
	if utils.IsHTMX(r) {
		templ.Handler(about()).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), about(), seo)).ServeHTTP(w, r)
}

package articles

import (
	"jathsin/types"
	"jathsin/utils"
	ui "jathsin/web/shared"
	"net/http"

	"github.com/a-h/templ"
)

func Get_mux() (*http.ServeMux, error) {

	mux := http.NewServeMux()

	mux.HandleFunc("GET /", still_working)

	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	return mux, nil
}

var seo = types.SEO{
	Title:                     "Projects",
	Meta_description:          "Interactive graphics experiments built with WebGL, shaders, and procedural systems. Explore visual simulations, noise generators, and generative graphics.",
	Meta_property_title:       "Graphics Projects — Grafiquer",
	Meta_property_description: "Explore interactive graphics experiments including procedural noise, shader filters, generative systems, and visual simulations.",
	Meta_Og_URL:               "https://grafiquer.com/projects",
}

func still_working(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")

	if utils.IsHTMX(r) {
		templ.Handler(ui.Not_found()).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), ui.Not_found(), seo)).ServeHTTP(w, r)
}

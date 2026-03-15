package landing

import (
	"jathsin/types"
	"jathsin/utils"
	ui "jathsin/web/shared"

	"net/http"

	"github.com/a-h/templ"
)

func Get_mux() (*http.ServeMux, error) {

	mux := http.NewServeMux()

	// Redirect to landing by default
	mux.HandleFunc("GET /", landing_handler)

	return mux, nil
}

var metadata = types.SEO{
	Title:                     "",
	Meta_description:          "Grafiquer is a collection of interactive computer graphics experiments, shader filters, and procedural animations exploring the intersection of math, art, and code.",
	Meta_property_title:       "Grafiquer — Interactive Graphics Experiments",
	Meta_property_description: "A collection of procedural graphics experiments, shader filters, and visual systems exploring computer graphics and generative art.",
	Meta_Og_URL:               "https://grafiquer.com/",
}

func landing_handler(w http.ResponseWriter, r *http.Request) {
	if utils.IsHTMX(r) {
		templ.Handler(perlin()).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(perlin(), ui.Nav_bar(), nil, metadata)).ServeHTTP(w, r)
}

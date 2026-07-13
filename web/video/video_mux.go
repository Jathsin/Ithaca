package video

import (
	"jathsin/types"
	"jathsin/utils"
	ui "jathsin/web/shared"
	"net/http"

	"github.com/a-h/templ"
)

func Get_mux() (*http.ServeMux, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", video_handler)
	return mux, nil
}

var seo = types.SEO{
	Title:                     "Video",
	Meta_description:          "Video editing, documentary work, motion graphics, and visual storytelling by Juan Miguel Reyes.",
	Meta_property_title:       "Video and Storytelling - Grafiquer",
	Meta_property_description: "Selected video editing and storytelling work, connecting film, motion, and visual computing.",
	Meta_Og_URL:               "https://grafiquer.com/video",
}

func video_handler(w http.ResponseWriter, r *http.Request) {
	content := templ.Raw(`
<section class="project-content mx-auto w-[min(90vw,760px)] pt-20 pb-30 font-['Libre_Baskerville'] text-[13px]">
	<h1>Video & Storytelling</h1>
	<p>
		I edit videos, shape stories, and build visual pieces where rhythm, image, and structure matter.
	</p>
	<p>
		This section will collect previous editing work: documentaries, visual essays, motion graphics, and client-oriented pieces.
	</p>
	<h2>What I can help with</h2>
	<ul>
		<li><strong>Editing</strong> - narrative structure, pacing, continuity, and final delivery.</li>
		<li><strong>Visual storytelling</strong> - turning technical, artistic, or personal ideas into clear visual sequences.</li>
		<li><strong>Motion and graphics</strong> - connecting video work with my background in computer graphics and procedural visuals.</li>
	</ul>
	<h2>For collaborators and clients</h2>
	<p>
		If you are looking for someone who can think both technically and visually, this is the part of Grafiquer where my film and editing work will live.
	</p>
</section>`)

	if utils.IsHTMX(r) {
		templ.Handler(content).ServeHTTP(w, r)
		return
	}
	templ.Handler(ui.Layout(nil, ui.Nav_bar(), content, seo)).ServeHTTP(w, r)
}

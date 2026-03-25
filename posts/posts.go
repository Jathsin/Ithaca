package posts

import (
	"bytes"
	"embed"
	"fmt"
	std_html "html"
	"io/fs"
	"jathsin/types"
	"strconv"
	"strings"

	et "braces.dev/errtrace"
	"github.com/a-h/templ"
	"github.com/yuin/goldmark"
	highlighting "github.com/yuin/goldmark-highlighting/v2"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/util"
)

//go:embed articles/*.md
var articles embed.FS

//go:embed projects/*.md
var projects embed.FS

// TODO: longterm build index / fix inefficiencies
// This code will receive a md and parse it using Goldmark.
func Get_md_from_slug(slug string, kind string) (types.Post_metadata, templ.Component, error) {

	var markdowns embed.FS
	switch kind {
	case "articles":
		markdowns = articles
	case "projects":
		markdowns = projects
	default:
		return types.Post_metadata{}, nil, fmt.Errorf("wrong markdown type")
	}

	matches, err := fs.Glob(markdowns, kind+"/*.md")
	if err != nil {
		return types.Post_metadata{}, nil, et.Wrap(err)
	}

	// get markdown whose metadata matches slug
	for _, filename := range matches {

		content, err := markdowns.ReadFile(filename)
		if err != nil {
			return types.Post_metadata{}, nil, et.Wrap(err)
		}

		metadata, err := parse_front_matter(content)
		if err != nil {
			return types.Post_metadata{}, nil, et.Wrap(err)
		}

		if metadata.Slug == slug {

			content_html, err := parse_content(content)
			if err != nil {
				return types.Post_metadata{}, nil, et.Wrap(err)
			}
			return metadata, content_html, nil
		}

	}

	return types.Post_metadata{}, nil, fmt.Errorf("No matching markdown found for slug %s", slug)
}

func parse_front_matter(content []byte) (types.Post_metadata, error) {
	var metadata types.Post_metadata

	text := string(content)
	parts := strings.SplitN(text, "---", 3)
	if len(parts) < 3 || strings.TrimSpace(parts[0]) != "" {
		return metadata, fmt.Errorf("missing or invalid front matter")
	}

	front_matter := strings.TrimSpace(parts[1])

	// SplitSeq lets you iterate over split substrings without allocating a slice,
	// that is, returns a lazy iterator that produces each substring on demand.
	for line := range strings.SplitSeq(front_matter, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		key, value, found := strings.Cut(line, ":")
		if !found {
			continue
		}

		key = strings.TrimSpace(key) // just in case
		value = strings.Trim(strings.TrimSpace(value), `"`)

		switch key {
		case "title":
			metadata.Title = value
		case "slug":
			metadata.Slug = value
		case "parent":
			metadata.Parent = value
		case "description":
			metadata.Description = value
		case "order":
			order, err := strconv.Atoi(value)
			if err != nil {
				return metadata, et.Wrap(err)
			}
			metadata.Order = order
		case "headers":
			if value == "" {
				metadata.Headers = nil
				continue
			}
			headers := strings.Split(value, ",")
			metadata.Headers = make([]string, 0, len(headers))
			for _, header := range headers {
				header = strings.TrimSpace(strings.Trim(header, `"`))
				if header != "" {
					metadata.Headers = append(metadata.Headers, header)
				}
			}
		case "seo_title":
			metadata.SEO.Title = value
		case "seo_meta_description":
			metadata.SEO.Meta_description = value
		case "seo_meta_property_title":
			metadata.SEO.Meta_property_title = value
		case "seo_meta_property_description":
			metadata.SEO.Meta_property_description = value
		case "seo_meta_og_url":
			metadata.SEO.Meta_Og_URL = value
		}
	}

	if metadata.Slug == "" {
		return metadata, fmt.Errorf("front matter does not contain a slug")
	}

	return metadata, nil
}

// Given the content returned by get_md_from_slug, we want to obtain the HTML
// structure defined in the markdown following the CommonMark spec.
// For that we use Goldmark.

var gm = goldmark.New(
	goldmark.WithExtensions(
		extension.GFM,
		highlighting.NewHighlighting(
			highlighting.WithStyle("nord"),
			highlighting.WithWrapperRenderer(renderCodeBlockWrapper),
		),
		extension.Footnote,
		extension.Typographer,
	),
	goldmark.WithParserOptions(
		parser.WithAutoHeadingID(),
		parser.WithAttribute(),
	),
	goldmark.WithRendererOptions(
		html.WithUnsafe(),
	),
)

func parse_content(content []byte) (templ.Component, error) {
	var buf bytes.Buffer

	text := string(content)
	parts := strings.SplitN(text, "---", 3)
	md_body := text
	if len(parts) >= 3 && strings.TrimSpace(parts[0]) == "" {
		md_body = parts[2]
	}

	err := gm.Convert([]byte(md_body), &buf)
	if err != nil {
		return nil, et.Wrap(err)
	}

	return templ.Raw(buf.String()), nil
}

func renderCodeBlockWrapper(w util.BufWriter, context highlighting.CodeBlockContext, entering bool) {
	if entering {
		language_label := get_language_label(context)

		must_write_string(w, `<div class="code-block bg-[var(--code-block)] rounded-[0.7rem]">`)
		must_write_string(w, `<div class="-mt-px w-full flex items-center justify-between rounded-t-[0.7rem]">`)
		if language_label != "" {
			must_write_string(w, `<span class="px-4 py-2 font-mono text-[0.95rem] lowercase tracking-normal text-[var(--secondary)] opacity-85">`)
			must_write_string(w, std_html.EscapeString(language_label))
			must_write_string(w, `</span>`)
		} else {
			must_write_string(w, `<span></span>`)
		}
		must_write_string(w, `<button class="copy-btn p-2 cursor-pointer opacity-85 hover:opacity-100 transition-opacity duration-200 ease-in-out">`)
		must_write_string(w, `<svg class="size-4.5" xmlns="http://www.w3.org/2000/svg" fill="var(--secondary)" viewBox="0 0 48 48" id="Copy--Streamline-Ionic-Filled">`)
		must_write_string(w, `<desc>Copy Streamline Icon: https://streamlinehq.com</desc>`)
		must_write_string(w, `<path d="M39.959 47.52H16.4397c-2.005 0 -3.9278 -0.7965 -5.3456 -2.2142 -1.4177 -1.4178 -2.2142 -3.3406 -2.2142 -5.3457V16.4407c0 -2.005 0.7965 -3.9277 2.2142 -5.3455 1.4178 -1.4177 3.3406 -2.2142 5.3456 -2.2142H39.959c2.0051 0 3.9279 0.7965 5.3457 2.2142 1.4177 1.4178 2.2142 3.3405 2.2142 5.3455v23.5194c0 2.0051 -0.7965 3.9279 -2.2142 5.3457 -1.4178 1.4177 -3.3406 2.2142 -5.3457 2.2142Z" stroke-width="1"></path>`)
		must_write_string(w, `<path d="M13.9207 5.5199h24.7668c-0.5227 -1.4729 -1.4884 -2.748 -2.7644 -3.6503C34.647 0.9673 33.1232 0.4819 31.5602 0.48H8.0409c-2.005 0 -3.9279 0.7965 -5.3456 2.2142S0.4811 6.0348 0.4811 8.0398v23.5194C0.483 33.122 0.9684 34.646 1.8707 35.922c0.9023 1.276 2.1774 2.2418 3.6502 2.7643V13.9197c0 -2.2278 0.885 -4.3644 2.4602 -5.9396 1.5753 -1.5753 3.7119 -2.4602 5.9396 -2.4602Z" stroke-width="1"></path>`)
		must_write_string(w, `</svg></button></div>`)
		return
	}

	must_write_string(w, `</div>`)
}

func get_language_label(context highlighting.CodeBlockContext) string {
	language, ok := context.Language()
	if !ok {
		return ""
	}

	switch strings.ToLower(string(language)) {
	case "javascript", "js":
		return "js"
	default:
		return strings.ToLower(string(language))
	}
}

func must_write_string(w util.BufWriter, text string) {
	if _, err := w.WriteString(text); err != nil {
		panic(err)
	}
}

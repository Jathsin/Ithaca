package posts

import (
	"bytes"
	"embed"
	"fmt"
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

// custom renderer for code blocks

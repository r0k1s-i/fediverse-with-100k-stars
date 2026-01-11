package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type Software struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	URL     string `json:"url"`
	Version string `json:"version,omitempty"`
	Slug    string `json:"slug"`
}

type Instance struct {
	ID               int             `json:"id"`
	Domain           string          `json:"domain"`
	Name             string          `json:"name,omitempty"`
	OpenRegistration bool            `json:"open_registration"`
	Description      *string         `json:"description"`
	BannerURL        *string         `json:"banner_url"`
	Location         json.RawMessage `json:"location"`
	Software         Software        `json:"software"`
	Stats            json.RawMessage `json:"stats"`
	FirstSeenAt      string          `json:"first_seen_at"`
	LastSeenAt       string          `json:"last_seen_at"`
	CreationTime     json.RawMessage `json:"creation_time"`
}

var softwareTemplates = map[string]Software{
	"mastodon": {
		ID:   2,
		Name: "Mastodon",
		URL:  "https://fedidb.org/software/mastodon",
		Slug: "mastodon",
	},
	"pleroma": {
		ID:   4,
		Name: "Pleroma",
		URL:  "https://fedidb.org/software/pleroma",
		Slug: "pleroma",
	},
	"misskey": {
		ID:   12,
		Name: "Misskey",
		URL:  "https://fedidb.org/software/misskey",
		Slug: "misskey",
	},
	"lemmy": {
		ID:   59,
		Name: "Lemmy",
		URL:  "https://fedidb.org/software/lemmy",
		Slug: "lemmy",
	},
	"akkoma": {
		ID:   89,
		Name: "Akkoma",
		URL:  "https://fedidb.org/software/akkoma",
		Slug: "akkoma",
	},
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "Usage: fix-unknown-software <input.json>")
		os.Exit(1)
	}

	inputFile := os.Args[1]

	data, err := os.ReadFile(inputFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading file: %v\n", err)
		os.Exit(1)
	}

	var instances []Instance
	if err := json.Unmarshal(data, &instances); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing JSON: %v\n", err)
		os.Exit(1)
	}

	fixedCount := 0
	for i := range instances {
		if instances[i].Software.Name != "Unknown" {
			continue
		}

		domain := strings.ToLower(instances[i].Domain)

		for keyword, software := range softwareTemplates {
			if strings.Contains(domain, keyword) {
				instances[i].Software = software
				fixedCount++
				fmt.Fprintf(os.Stderr, "Fixed: %s -> %s\n", instances[i].Domain, software.Name)
				break
			}
		}
	}

	output, err := json.MarshalIndent(instances, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error encoding JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
	fmt.Fprintf(os.Stderr, "\nTotal fixed: %d instances\n", fixedCount)
}

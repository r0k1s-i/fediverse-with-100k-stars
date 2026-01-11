package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
)

type Stats struct {
	UserCount int `json:"user_count"`
}

type Node struct {
	Stats        Stats  `json:"stats"`
	PositionType string `json:"positionType"`
}

type Result struct {
	TotalItems       int            `json:"total_items"`
	UsersGt1000      int            `json:"users_gt_1000"`
	SpecialPositions map[string]int `json:"special_positions"`
}

func main() {
	filePath := flag.String("file", "", "Path to the JSON file")
	flag.Parse()

	var decoder *json.Decoder
	if *filePath != "" {
		file, err := os.Open(*filePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error opening file: %v\n", err)
			os.Exit(1)
		}
		defer file.Close()
		decoder = json.NewDecoder(file)
	} else {
		decoder = json.NewDecoder(os.Stdin)
	}

	if _, err := decoder.Token(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading opening token: %v\n", err)
		os.Exit(1)
	}

	result := Result{
		SpecialPositions: make(map[string]int),
	}

	for decoder.More() {
		var node Node
		if err := decoder.Decode(&node); err != nil {
			fmt.Fprintf(os.Stderr, "Error decoding node: %v\n", err)
			continue
		}

		result.TotalItems++

		if node.Stats.UserCount > 1000 {
			result.UsersGt1000++
		}

		if node.PositionType == "three_star_center" || node.PositionType == "galaxy_center" {
			result.SpecialPositions[node.PositionType]++
		}
	}

	if _, err := decoder.Token(); err != nil {
		_ = err
	}

	output, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshalling result: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

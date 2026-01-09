package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// CLIOptions holds parsed command-line arguments
type CLIOptions struct {
	InputFile      string
	OutputFile     string
	ColorOnly      bool
	PositionsOnly  bool
	Verbose        bool
	JSONOutput     bool
	ConfigFile     string
	Help           bool
}

// ParseCLI parses command-line arguments
func ParseCLI() CLIOptions {
	opts := CLIOptions{}

	flag.StringVar(&opts.InputFile, "input", "", 
		"Input JSON file (default: data/fediverse_raw.json, use '-' for stdin)")
	flag.StringVar(&opts.OutputFile, "output", "", 
		"Output JSON file (default: data/fediverse_final.json, use '-' for stdout)")
	flag.BoolVar(&opts.ColorOnly, "colors-only", false, 
		"Only calculate colors, skip position processing")
	flag.BoolVar(&opts.PositionsOnly, "positions-only", false, 
		"Only calculate positions (input must have color data)")
	flag.BoolVar(&opts.Verbose, "verbose", false, 
		"Print detailed processing information")
	flag.BoolVar(&opts.JSONOutput, "json", false, 
		"Output statistics as JSON instead of human-readable text")
	flag.StringVar(&opts.ConfigFile, "config", "", 
		"Configuration file (YAML/JSON format)")
	flag.BoolVar(&opts.Help, "help", false, 
		"Print help message")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, `🌌 Fediverse Data Processor
=====================================

USAGE:
  fediverse-processor [options]

OPTIONS:
`)
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, `
EXAMPLES:
  # Process complete pipeline
  fediverse-processor -input data/raw.json -output data/final.json

  # Read from stdin, write to stdout
  cat data/raw.json | fediverse-processor -input=- -output=-

  # Colors only
  fediverse-processor -colors-only < data/raw.json > data/colors.json

  # With verbose output
  fediverse-processor -verbose -input data/raw.json -output data/final.json

  # Custom configuration
  fediverse-processor -config config.yaml -input data/raw.json

For more information, visit: https://github.com/Jude-Clarke/100k-Star-Challenge
`)
	}

	flag.Parse()

	// Set defaults if not provided
	if opts.InputFile == "" {
		opts.InputFile = filepath.Join("..", "..", "data", "fediverse_raw.json")
	}
	if opts.OutputFile == "" {
		opts.OutputFile = filepath.Join("..", "..", "data", "fediverse_final.json")
	}

	return opts
}

// ReadInstances reads instances from input source (file or stdin)
func ReadInstances(inputFile string) ([]Instance, error) {
	var reader io.Reader
	var err error

	if inputFile == "-" {
		// Read from stdin
		reader = os.Stdin
		if os.Getenv("VERBOSE") == "1" {
			fmt.Fprintf(os.Stderr, "📖 Reading from stdin...\n")
		}
	} else {
		// Read from file
		file, err := os.Open(inputFile)
		if err != nil {
			return nil, fmt.Errorf("cannot open input file %q: %w", inputFile, err)
		}
		defer file.Close()
		reader = file

		if os.Getenv("VERBOSE") == "1" {
			fmt.Fprintf(os.Stderr, "📂 Reading from file: %s\n", inputFile)
		}
	}

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("cannot read input: %w", err)
	}

	var instances []Instance
	if err := json.Unmarshal(data, &instances); err != nil {
		return nil, fmt.Errorf("cannot parse JSON: %w", err)
	}

	return instances, nil
}

// WriteInstances writes instances to output destination (file or stdout)
func WriteInstances(outputFile string, instances []Instance) error {
	data, err := json.MarshalIndent(instances, "", "  ")
	if err != nil {
		return fmt.Errorf("cannot marshal JSON: %w", err)
	}

	var writer io.Writer

	if outputFile == "-" {
		// Write to stdout
		writer = os.Stdout
		if os.Getenv("VERBOSE") == "1" {
			fmt.Fprintf(os.Stderr, "📤 Writing to stdout...\n")
		}
	} else {
		// Write to file
		dir := filepath.Dir(outputFile)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("cannot create directory %q: %w", dir, err)
		}

		file, err := os.Create(outputFile)
		if err != nil {
			return fmt.Errorf("cannot create output file %q: %w", outputFile, err)
		}
		defer file.Close()
		writer = file

		if os.Getenv("VERBOSE") == "1" {
			fmt.Fprintf(os.Stderr, "💾 Writing to file: %s\n", outputFile)
		}
	}

	if _, err := writer.Write(data); err != nil {
		return fmt.Errorf("cannot write output: %w", err)
	}

	return nil
}

// ProcessInstances applies the specified processing phases
func ProcessInstances(instances []Instance, cfg Config, opts CLIOptions) []Instance {
	// Default: process both colors and positions
	doColors := !opts.PositionsOnly
	doPositions := !opts.ColorOnly

	if doColors {
		if opts.Verbose {
			fmt.Fprintf(os.Stderr, "🎨 Phase 2: Calculating colors...\n")
		}
		instances = ProcessColors(instances, cfg)
		if opts.Verbose {
			fmt.Fprintf(os.Stderr, "✅ Colors calculated\n\n")
		}
	}

	if doPositions {
		if opts.Verbose {
			fmt.Fprintf(os.Stderr, "📍 Phase 3: Calculating positions...\n")
		}
		instances = ProcessPositions(instances, cfg)
		if opts.Verbose {
			fmt.Fprintf(os.Stderr, "✅ Positions calculated\n\n")
		}
	}

	return instances
}

// PrintStatisticsJSON outputs statistics as JSON
func PrintStatisticsJSON(instances []Instance) {
	stats := map[string]interface{}{
		"total_instances": len(instances),
		"software_distribution": buildSoftwareStats(instances),
		"position_distribution": buildPositionStats(instances),
		"color_statistics": buildColorStats(instances),
	}

	data, _ := json.MarshalIndent(stats, "", "  ")
	fmt.Println(string(data))
}

func buildSoftwareStats(instances []Instance) map[string]int {
	stats := make(map[string]int)
	for _, inst := range instances {
		sw := getSoftwareName(&inst)
		stats[sw]++
	}
	return stats
}

func buildPositionStats(instances []Instance) map[string]int {
	stats := make(map[string]int)
	for _, inst := range instances {
		stats[inst.PositionType]++
	}
	return stats
}

func buildColorStats(instances []Instance) map[string]interface{} {
	if len(instances) == 0 || instances[0].Color == nil {
		return map[string]interface{}{}
	}

	var minHue, maxHue, sumHue float64
	minHue = 360
	count := 0

	for _, inst := range instances {
		if inst.Color == nil {
			continue
		}
		count++
		h := inst.Color.HSL.H
		if h < minHue {
			minHue = h
		}
		if h > maxHue {
			maxHue = h
		}
		sumHue += h
	}

	avgHue := 0.0
	if count > 0 {
		avgHue = sumHue / float64(count)
	}

	return map[string]interface{}{
		"hue_min": minHue,
		"hue_max": maxHue,
		"hue_avg": avgHue,
	}
}

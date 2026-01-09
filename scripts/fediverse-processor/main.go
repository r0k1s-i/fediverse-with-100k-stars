package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

func main() {
	// Parse command-line arguments
	opts := ParseCLI()

	if opts.Help {
		flag.Usage()
		os.Exit(0)
	}

	// Set verbose mode if requested
	if opts.Verbose {
		os.Setenv("VERBOSE", "1")
	}

	// Configuration
	cfg := DefaultConfig

	// Load configuration from file if specified
	if opts.ConfigFile != "" {
		if opts.Verbose {
			fmt.Fprintf(os.Stderr, "📋 Loading configuration from: %s\n", opts.ConfigFile)
		}
		// TODO: Load config from file (YAML/JSON)
		// newCfg, err := LoadConfig(opts.ConfigFile)
		// if err != nil { ... }
		// cfg = newCfg
	}

	// Header
	if !opts.JSONOutput && opts.OutputFile != "-" {
		fmt.Println("🌌 Fediverse Data Processor (Golang)")
		fmt.Println("=====================================")
	}

	// Step 1: Load input data
	if opts.Verbose {
		fmt.Fprintf(os.Stderr, "📂 Loading instances from: %s\n", opts.InputFile)
	}
	instances, err := ReadInstances(opts.InputFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to load input: %v\n", err)
		os.Exit(1)
	}
	if opts.Verbose {
		fmt.Fprintf(os.Stderr, "✅ Loaded %d instances\n\n", len(instances))
	}

	// Step 2-3: Process instances (colors and/or positions)
	startTime := time.Now()
	instances = ProcessInstances(instances, cfg, opts)
	totalDuration := time.Since(startTime)

	// Step 4: Save output
	if opts.Verbose {
		fmt.Fprintf(os.Stderr, "💾 Saving output to: %s\n", opts.OutputFile)
	}
	if err := WriteInstances(opts.OutputFile, instances); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to save output: %v\n", err)
		os.Exit(1)
	}
	if opts.Verbose {
		fmt.Fprintf(os.Stderr, "✅ Saved successfully\n\n")
	}

	// Step 5: Print statistics
	if opts.JSONOutput {
		PrintStatisticsJSON(instances)
	} else if opts.OutputFile != "-" {
		printStatistics(instances)
		fmt.Println("\n📊 Processing Summary:")
		fmt.Println("─────────────────────────────────────")
		fmt.Printf("Total instances: %d\n", len(instances))
		fmt.Printf("Processing time: %v\n", totalDuration)
		fmt.Println("─────────────────────────────────────")
		fmt.Println("\n✨ All done! Ready for Phase 5 (WebGL integration)")
	}
}

// loadInstances reads instances from JSON file
func loadInstances(path string) ([]Instance, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read file: %w", err)
	}

	var instances []Instance
	if err := json.Unmarshal(data, &instances); err != nil {
		return nil, fmt.Errorf("unmarshal JSON: %w", err)
	}

	return instances, nil
}

// saveInstances writes instances to JSON file
func saveInstances(path string, instances []Instance) error {
	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}

	// Marshal with indentation for readability
	data, err := json.MarshalIndent(instances, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal JSON: %w", err)
	}

	// Write to file
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	return nil
}

// printStatistics shows analysis of processed data
func printStatistics(instances []Instance) {
	fmt.Println("📈 Statistics:")
	fmt.Println("─────────────────────────────────────")

	// Software distribution
	bySoftware := make(map[string]int)
	for _, inst := range instances {
		sw := getSoftwareName(&inst)
		bySoftware[sw]++
	}
	fmt.Printf("Software types: %d\n", len(bySoftware))
	fmt.Println("\nTop 5 software by instance count:")
	type swCount struct {
		name  string
		count int
	}
	var counts []swCount
	for sw, count := range bySoftware {
		counts = append(counts, swCount{sw, count})
	}
	// Simple sort (top 5)
	for i := 0; i < len(counts) && i < 5; i++ {
		maxIdx := i
		for j := i + 1; j < len(counts); j++ {
			if counts[j].count > counts[maxIdx].count {
				maxIdx = j
			}
		}
		counts[i], counts[maxIdx] = counts[maxIdx], counts[i]
		fmt.Printf("  %d. %-20s %5d instances\n", i+1, counts[i].name, counts[i].count)
	}

	// Position type distribution
	byPosType := make(map[string]int)
	for _, inst := range instances {
		byPosType[inst.PositionType]++
	}
	fmt.Println("\nPosition types:")
	for posType, count := range byPosType {
		fmt.Printf("  %-25s %5d instances\n", posType, count)
	}

	// Color statistics
	if len(instances) > 0 && instances[0].Color != nil {
		var minHue, maxHue, sumHue float64
		minHue = 360
		for _, inst := range instances {
			if inst.Color == nil {
				continue
			}
			h := inst.Color.HSL.H
			if h < minHue {
				minHue = h
			}
			if h > maxHue {
				maxHue = h
			}
			sumHue += h
		}
		avgHue := sumHue / float64(len(instances))
		fmt.Println("\nColor statistics:")
		fmt.Printf("  Hue range: %.1f° - %.1f°\n", minHue, maxHue)
		fmt.Printf("  Hue average: %.1f°\n", avgHue)
	}

	// Sample instances
	fmt.Println("\n📋 Sample Results (first 5):")
	fmt.Println("─────────────────────────────────────")
	for i := 0; i < len(instances) && i < 5; i++ {
		inst := instances[i]
		sw := "Unknown"
		if inst.Software != nil {
			sw = inst.Software.Name
		}
		hue := 0.0
		if inst.Color != nil {
			hue = inst.Color.HSL.H
		}
		posType := inst.PositionType
		fmt.Printf("%-30s %-12s Hue:%6.1f° Type:%-20s\n", inst.Domain, sw, hue, posType)
	}
}

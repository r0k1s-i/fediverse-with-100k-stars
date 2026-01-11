package main

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"math"
	"strconv"
	"time"
)

func domainHash(domain string) float64 {
	hash := md5.Sum([]byte(domain))
	hexStr := hex.EncodeToString(hash[:4])
	num, _ := strconv.ParseUint(hexStr, 16, 32)
	return float64(num) / float64(0xFFFFFFFF)
}

func parseTime(s string) time.Time {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Now()
}

func getAgeDays(createdAt string) float64 {
	created := parseTime(createdAt)
	return time.Since(created).Hours() / 24
}

func getMaxAgeDays(cfg Config) float64 {
	genesis := parseTime(cfg.GenesisDate)
	return time.Since(genesis).Hours() / 24
}

func logNormalize(value, max float64) float64 {
	if value <= 0 {
		return 0
	}
	if max <= 0 {
		return 1
	}
	return math.Log(value+1) / math.Log(max+1)
}

func getEraOffset(createdAt string, cfg Config) float64 {
	created := parseTime(createdAt)
	eraPre2019 := parseTime(cfg.EraPre2019)
	eraPost2024 := parseTime(cfg.EraPost2024)

	if created.Before(eraPre2019) {
		return cfg.EraPre2019Offset
	} else if !created.Before(eraPost2024) {
		return cfg.EraPost2024Offset
	}
	return 0
}

func hslToRGB(h, s, l float64) RGB {
	h = h / 360
	s = s / 100
	l = l / 100

	var r, g, b float64

	if s == 0 {
		r, g, b = l, l, l
	} else {
		hue2rgb := func(p, q, t float64) float64 {
			if t < 0 {
				t += 1
			}
			if t > 1 {
				t -= 1
			}
			if t < 1.0/6 {
				return p + (q-p)*6*t
			}
			if t < 1.0/2 {
				return q
			}
			if t < 2.0/3 {
				return p + (q-p)*(2.0/3-t)*6
			}
			return p
		}

		var q float64
		if l < 0.5 {
			q = l * (1 + s)
		} else {
			q = l + s - l*s
		}
		p := 2*l - q

		r = hue2rgb(p, q, h+1.0/3)
		g = hue2rgb(p, q, h)
		b = hue2rgb(p, q, h-1.0/3)
	}

	return RGB{
		R: int(math.Round(r * 255)),
		G: int(math.Round(g * 255)),
		B: int(math.Round(b * 255)),
	}
}

func rgbToHex(rgb RGB) string {
	return fmt.Sprintf("#%02x%02x%02x", rgb.R, rgb.G, rgb.B)
}

func CalculateColor(instance *Instance, cfg Config) *Color {
	createdAt := instance.FirstSeenAt
	if instance.CreationTime != nil && instance.CreationTime.CreatedAt != "" {
		createdAt = instance.CreationTime.CreatedAt
	}

	ageDays := getAgeDays(createdAt)
	maxAgeDays := getMaxAgeDays(cfg)
	// Use linear normalization for age (not logarithmic)
	// This ensures young instances are truly young on the spectrum
	ageNormRaw := math.Min(ageDays/maxAgeDays, 1.0)
	// Invert: old instances (high ageNormRaw) become low, young instances (low ageNormRaw) become high
	ageNorm := 1.0 - ageNormRaw

	// Map age to hue: young (ageNorm=1) → HueYoung (240°), old (ageNorm=0) → HueOld (0°)
	hue := cfg.HueOld + (ageNorm * (cfg.HueYoung - cfg.HueOld))

	// Apply era offset and domain hash perturbation
	// For very low hues (red, near 0°), we need to constrain adjustments to avoid wrapping to 330°+
	eraOffset := getEraOffset(createdAt, cfg)
	hashValue := domainHash(instance.Domain)
	perturbation := (hashValue - 0.5) * 2 * cfg.DomainHashRange

	// For red hues (low values < 60°), we need to constrain the total adjustment
	// to keep the result in the [0, 60°) range and avoid wrapping to 300°+
	if hue < 60.0 {
		// Red zone - clamp total adjustment to keep in [0, 60°)
		maxPositiveAdjustment := 60.0 - hue
		maxNegativeAdjustment := hue - 0.0
		totalAdjustment := eraOffset + perturbation

		if totalAdjustment > maxPositiveAdjustment {
			totalAdjustment = maxPositiveAdjustment
		}
		if totalAdjustment < -maxNegativeAdjustment {
			totalAdjustment = -maxNegativeAdjustment
		}

		hue += totalAdjustment
	} else {
		// Not in red zone, apply normally
		hue += eraOffset
		hue += perturbation

		// Normalize to [0, 360) range
		hue = math.Mod(hue, 360.0)
		if hue < 0 {
			hue += 360.0
		}
	}

	// Calculate saturation based on user count (logarithmic scaling with diminishing returns)
	userCount := 0
	if instance.Stats != nil {
		userCount = instance.Stats.UserCount
	}
	// Use (userCount-1) to ensure that 1 user gives saturation = SaturationMin
	userNorm := logNormalize(float64(userCount-1), float64(cfg.MaxUserCount))
	// Apply square root to userNorm for diminishing returns
	// This ensures that the increase from 100->1000 users is larger than 1000->10000
	userNormDiminishing := math.Sqrt(userNorm)
	saturation := cfg.SaturationMin + (userNormDiminishing * (cfg.SaturationMax - cfg.SaturationMin))
	// Clamp saturation to configured range
	if saturation > cfg.SaturationMax {
		saturation = cfg.SaturationMax
	}
	if saturation < cfg.SaturationMin {
		saturation = cfg.SaturationMin
	}

	// Calculate lightness based on activity ratio
	mau := 0
	totalUsers := 1
	if instance.Stats != nil {
		mau = instance.Stats.MonthlyActiveUsers
		if instance.Stats.UserCount > 0 {
			totalUsers = instance.Stats.UserCount
		}
	}
	activityRatio := math.Min(float64(mau)/float64(totalUsers), 1)
	lightness := cfg.LightnessMin + (activityRatio * (cfg.LightnessMax - cfg.LightnessMin))
	// Clamp lightness to [0, 100]
	if lightness > 100 {
		lightness = 100
	}
	if lightness < 0 {
		lightness = 0
	}

	rgb := hslToRGB(hue, saturation, lightness)
	hexColor := rgbToHex(rgb)

	// Calculate temperature based on hue (0-360° → 3,840K to 42,000K)
	// Temperature gradient: red(3840K) -> orange -> yellow(7300K) -> white -> blue(42000K)
	temperature := calculateTemperature(hue)

	// Calculate star type based on hue (color) and user count (size)
	starType := calculateStarType(hue, userCount)

	return &Color{
		HSL: HSL{
			H: math.Round(hue*10) / 10,
			S: math.Round(saturation*10) / 10,
			L: math.Round(lightness*10) / 10,
		},
		RGB:         rgb,
		Hex:         hexColor,
		Temperature: temperature,
		StarType:    starType,
		Debug: Debug{
			AgeDays:          int(ageDays),
			AgeNorm:          math.Round(ageNorm*1000) / 1000,
			HashPerturbation: math.Round(perturbation*10) / 10,
			EraOffset:        eraOffset,
			UserNorm:         math.Round(userNorm*1000) / 1000,
			ActivityRatio:    math.Round(activityRatio*1000) / 1000,
		},
	}
}

// calculateTemperature maps hue (0-360°) to stellar temperature in Kelvin
// Based on B-V stellar color index: red stars are cooler, blue stars are hotter
// Temperature range: 3,840K (red/cool) to 42,000K (blue/hot)
func calculateTemperature(hue float64) int {
	const (
		minTemp = 3840  // Coolest (red)
		midTemp = 7300  // Medium (yellow)
		maxTemp = 42000 // Hottest (blue)
	)

	// Normalize hue to spectralIndex (0-1)
	spectralIndex := hue / 360.0

	var temp float64
	if spectralIndex < 0.5 {
		// 0 to 0.5: from min temp to mid temp
		temp = float64(minTemp) + (float64(midTemp-minTemp) * (spectralIndex * 2))
	} else {
		// 0.5 to 1: from mid temp to max temp
		temp = float64(midTemp) + (float64(maxTemp-midTemp) * ((spectralIndex - 0.5) * 2))
	}

	return int(math.Round(temp))
}

// calculateStarType determines stellar classification based on color (hue) and size (user count)
// Color types: Red, Orange, Yellow, Green, Cyan, Blue, Violet
// Size classes: Dwarf, Sub-giant, Main Sequence, Giant, Supergiant
func calculateStarType(hue float64, userCount int) string {
	// Determine size class based on user count
	var sizeClass string
	if userCount >= 500000 {
		sizeClass = "Supergiant"
	} else if userCount >= 100000 {
		sizeClass = "Giant"
	} else if userCount >= 10000 {
		sizeClass = "Main Sequence"
	} else if userCount >= 1000 {
		sizeClass = "Sub-giant"
	} else {
		sizeClass = "Dwarf"
	}

	// Determine color type based on hue
	var colorType string
	if hue < 30 || hue >= 330 {
		colorType = "Red"
	} else if hue < 60 {
		colorType = "Orange"
	} else if hue < 90 {
		colorType = "Yellow"
	} else if hue < 150 {
		colorType = "Green"
	} else if hue < 210 {
		colorType = "Cyan"
	} else if hue < 270 {
		colorType = "Blue"
	} else {
		colorType = "Violet"
	}

	return colorType + " " + sizeClass
}

func ProcessColors(instances []Instance, cfg Config) []Instance {
	result := make([]Instance, len(instances))
	for i := range instances {
		result[i] = instances[i]
		result[i].Color = CalculateColor(&instances[i], cfg)
	}
	return result
}

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
	ageNorm := logNormalize(ageDays, maxAgeDays)

	hue := cfg.HueYoung - (ageNorm * (cfg.HueYoung - cfg.HueOld))

	hashValue := domainHash(instance.Domain)
	perturbation := (hashValue - 0.5) * 2 * cfg.DomainHashRange
	hue += perturbation

	eraOffset := getEraOffset(createdAt, cfg)
	hue += eraOffset

	hue = math.Mod(math.Mod(hue, 360)+360, 360)

	userCount := 0
	if instance.Stats != nil {
		userCount = instance.Stats.UserCount
	}
	userNorm := logNormalize(float64(userCount), float64(cfg.MaxUserCount))
	saturation := cfg.SaturationMin + (userNorm * (cfg.SaturationMax - cfg.SaturationMin))

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

	rgb := hslToRGB(hue, saturation, lightness)
	hexColor := rgbToHex(rgb)

	return &Color{
		HSL: HSL{
			H: math.Round(hue*10) / 10,
			S: math.Round(saturation*10) / 10,
			L: math.Round(lightness*10) / 10,
		},
		RGB: rgb,
		Hex: hexColor,
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

func ProcessColors(instances []Instance, cfg Config) []Instance {
	result := make([]Instance, len(instances))
	for i := range instances {
		result[i] = instances[i]
		result[i].Color = CalculateColor(&instances[i], cfg)
	}
	return result
}

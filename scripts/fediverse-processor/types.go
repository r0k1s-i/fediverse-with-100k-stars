package main

type Instance struct {
	Domain       string        `json:"domain"`
	Software     *Software     `json:"software,omitempty"`
	Stats        *Stats        `json:"stats,omitempty"`
	FirstSeenAt  string        `json:"first_seen_at,omitempty"`
	CreationTime *CreationTime `json:"creation_time,omitempty"`
	Color        *Color        `json:"color,omitempty"`
	Position     *Position     `json:"position,omitempty"`
	PositionType string        `json:"positionType,omitempty"`
}

type Software struct {
	Name string `json:"name"`
}

type Stats struct {
	UserCount          int `json:"user_count"`
	MonthlyActiveUsers int `json:"monthly_active_users"`
}

type CreationTime struct {
	CreatedAt string `json:"created_at"`
	Source    string `json:"source"`
	Reliable  bool   `json:"reliable"`
}

type Color struct {
	HSL   HSL    `json:"hsl"`
	RGB   RGB    `json:"rgb"`
	Hex   string `json:"hex"`
	Debug Debug  `json:"debug"`
}

type HSL struct {
	H float64 `json:"h"`
	S float64 `json:"s"`
	L float64 `json:"l"`
}

type RGB struct {
	R int `json:"r"`
	G int `json:"g"`
	B int `json:"b"`
}

type Debug struct {
	AgeDays          int     `json:"ageDays"`
	AgeNorm          float64 `json:"ageNorm"`
	HashPerturbation float64 `json:"hashPerturbation"`
	EraOffset        float64 `json:"eraOffset"`
	UserNorm         float64 `json:"userNorm"`
	ActivityRatio    float64 `json:"activityRatio"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

type Config struct {
	GenesisDate string
	EraPre2019  string
	EraPost2024 string

	HueYoung          float64
	HueOld            float64
	DomainHashRange   float64
	EraPre2019Offset  float64
	EraPost2024Offset float64
	SaturationMin     float64
	SaturationMax     float64
	LightnessMin      float64
	LightnessMax      float64

	MaxUserCount int

	// Galactic Core Configuration
	SupergiantDomains []string
	SupergiantRadius  float64
	SupergiantZHeight float64

	// Planetary System Tiers
	TierAInstanceCount int
	TierBInstanceCount int

	// System Center Radii (distance from galactic core)
	TierASystemRadius    float64
	TierASystemRadiusVar float64
	TierBSystemRadius    float64
	TierBSystemRadiusVar float64
	TierCSystemRadius    float64
	TierCSystemRadiusVar float64

	// Within-System Radii
	TierASystemMaxRadius    float64
	TierBSystemMaxRadius    float64
	TierCSystemMaxRadius    float64
	SystemRadiusScaleFactor float64

	// Z-Axis Variation
	ZAxisVariationFactor float64

	// Instance Size Thresholds
	PlanetUserThreshold    int
	AsteroidUserThreshold  int
	SatelliteUserThreshold int

	// Staggering and Distribution
	RadialVariationFactor float64
}

var DefaultConfig = Config{
	GenesisDate: "2016-11-23T00:00:00Z",
	EraPre2019:  "2019-01-01T00:00:00Z",
	EraPost2024: "2024-01-01T00:00:00Z",

	HueYoung:          240,
	HueOld:            0,
	DomainHashRange:   30,
	EraPre2019Offset:  -20,
	EraPost2024Offset: 20,
	SaturationMin:     40,
	SaturationMax:     90,
	LightnessMin:      30,
	LightnessMax:      75,

	MaxUserCount: 3000000,

	// Galactic Core Configuration
	SupergiantDomains: []string{"mastodon.social", "misskey.io", "pixelfed.social"},
	SupergiantRadius:  3000,
	SupergiantZHeight: 1500,

	// Planetary System Tiers
	TierAInstanceCount: 100,
	TierBInstanceCount: 20,

	// System Center Radii (distance from galactic core)
	TierASystemRadius:    15000,
	TierASystemRadiusVar: 5000,
	TierBSystemRadius:    8000,
	TierBSystemRadiusVar: 4000,
	TierCSystemRadius:    11000,
	TierCSystemRadiusVar: 6000,

	// Within-System Radii
	TierASystemMaxRadius:    4000,
	TierBSystemMaxRadius:    2000,
	TierCSystemMaxRadius:    1000,
	SystemRadiusScaleFactor: 0.5,

	// Z-Axis Variation
	ZAxisVariationFactor: 0.8,

	// Instance Size Thresholds
	PlanetUserThreshold:    1000,
	AsteroidUserThreshold:  100,
	SatelliteUserThreshold: 10,

	// Staggering and Distribution
	RadialVariationFactor: 0.15,
}

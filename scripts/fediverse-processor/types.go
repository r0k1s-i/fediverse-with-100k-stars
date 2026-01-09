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

	ThreeStarEdge      float64
	TopMastodonDomains []string

	GalaxyRingRadius      float64
	GalaxyRingCount       int
	GalaxyMaxRadius       float64
	DistanceBase          float64
	DistanceLogMultiplier float64
	MaxUserCount          int
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

	ThreeStarEdge:      8000,
	TopMastodonDomains: []string{"mastodon.social", "pawoo.net", "mastodon.cloud"},

	GalaxyRingRadius:      25000,
	GalaxyRingCount:       4,
	GalaxyMaxRadius:       5000,
	DistanceBase:          500,
	DistanceLogMultiplier: 300,
	MaxUserCount:          3000000,
}

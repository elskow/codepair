package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Address         string        `yaml:"address"`
		StunServerURL   string        `yaml:"stun_server_url"`
		CleanupInterval time.Duration `yaml:"cleanup_interval"`
	} `yaml:"server"`
	Core struct {
		BaseURL string `yaml:"base_url"`
	} `yaml:"core"`
}

func LoadConfig(configFile string) (Config, error) {
	viper.SetConfigFile(configFile)
	if err := viper.ReadInConfig(); err != nil {
		return Config{}, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return Config{}, err
	}

	return config, nil
}

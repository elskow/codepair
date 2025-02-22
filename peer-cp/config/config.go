package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Address          string        `mapstructure:"address"`
		StunServerURL    string        `mapstructure:"stun_server_url"`
		CleanupInterval  time.Duration `mapstructure:"cleanup_interval"`
		ValidateInterval time.Duration `mapstructure:"validate_interval"`
	} `mapstructure:"server"`
	Core struct {
		BaseURL string `mapstructure:"base_url"`
	} `mapstructure:"core"`
}

func LoadConfig(configFile string) (Config, error) {
	viper.SetConfigFile(configFile)

	viper.SetDefault("server.cleanup_interval", "1m")
	viper.SetDefault("server.validate_interval", "5m")

	if err := viper.ReadInConfig(); err != nil {
		return Config{}, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return Config{}, err
	}

	if config.Server.CleanupInterval <= 0 {
		config.Server.CleanupInterval = time.Minute // Default to 1 minute
	}
	if config.Server.ValidateInterval <= 0 {
		config.Server.ValidateInterval = 5 * time.Minute // Default to 5 minutes
	}

	return config, nil
}

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
		ShutdownTimeout  time.Duration `mapstructure:"shutdown_timeout"`
	} `mapstructure:"server"`
	Core struct {
		BaseURL string `mapstructure:"base_url"`
	} `mapstructure:"core"`
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

	if config.Server.CleanupInterval <= 0 {
		config.Server.CleanupInterval = time.Minute // Default to 1 minute
	}
	if config.Server.ValidateInterval <= 0 {
		config.Server.ValidateInterval = 5 * time.Minute // Default to 5 minutes
	}

	if config.Server.ShutdownTimeout <= 0 {
		config.Server.ShutdownTimeout = 30 * time.Second // Default to 30 seconds
	}

	return config, nil
}

package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Host            string
	Port            string
	ShutdownTimeout time.Duration
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type JWTConfig struct {
	Secret             string
	TokenExpiry        time.Duration
	RefreshTokenExpiry time.Duration
	RefreshSecret      string
}

func LoadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	// Set defaults if not specified
	if config.Server.ShutdownTimeout == 0 {
		config.Server.ShutdownTimeout = 30 * time.Second
	}

	if config.JWT.TokenExpiry == 0 {
		config.JWT.TokenExpiry = 24 * time.Hour
	}

	return &config, nil
}

func (c *DatabaseConfig) GetDSN() string {
	return "host=" + c.Host + " user=" + c.User + " password=" + c.Password +
		" dbname=" + c.DBName + " port=" + c.Port + " sslmode=" + c.SSLMode
}

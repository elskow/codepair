package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
    Server struct {
        Address         string        `mapstructure:"address"`
        ShutdownTimeout time.Duration `mapstructure:"shutdownTimeout"`
    } `mapstructure:"server"`
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

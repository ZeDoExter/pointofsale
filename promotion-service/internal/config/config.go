package config
























}	return defaultValue	}		return value	if value := os.Getenv(key); value != "" {func getEnv(key string, defaultValue string) string {}	}		Environment:    getEnv("ENVIRONMENT", "development"),		DatabaseURL:    getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/pointofsale"),		Port:           getEnv("PORT", "8084"),	return &Config{func LoadConfig() *Config {}	Environment    string	DatabaseURL    string	Port           stringtype Config struct {import "os"package config
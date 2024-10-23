package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHashPassword(t *testing.T) {
	password := "test_password"
	hashedPassword, err := HashPassword(password)

	assert.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)
	assert.NotEqual(t, password, hashedPassword)
}

func TestCheckPassword(t *testing.T) {
	password := "test_password"
	hashedPassword, _ := HashPassword(password)

	assert.True(t, CheckPassword(password, hashedPassword))
	assert.False(t, CheckPassword("wrong_password", hashedPassword))
}
